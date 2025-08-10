import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of, throwError, forkJoin } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { AuthUser } from '../../models/auth.interface';
import { User } from '../../models/user.interface';
import { Channel } from '../../models/channel.interface';
import { Message } from '../../models/message.interface';
import { ThreadMessage } from '../../models/message.interface';
import { UserService } from '../user-service/user.service';
import { ChannelService } from '../channel.service';
import { MessageService } from '../message.service';
import { UserChannelActivityService } from '../userReadActivity.service';
import { ConversationService } from './../conversation-service/conversation.service';
import { ThreadMessageService } from './../thread-message-service/thread-message.service';
import { Timestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

export interface GuestUser extends AuthUser {
  role: 'guest';
  isTemporary: true;
  deviceId: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  sessionId: string;
}

@Injectable({ providedIn: 'root' })
export class GuestLoginService {
  private readonly GUEST_STORAGE_KEY = 'guestDeviceId';
  private readonly GUEST_EXPIRY_DAYS = 30;
  private readonly GUEST_DISPLAY_NAME = 'Gast';
  private currentGuestSubject = new BehaviorSubject<GuestUser | null>(null);
  public currentGuest$ = this.currentGuestSubject.asObservable();

  constructor(
    private userService: UserService,
    private channelService: ChannelService,
    private messageService: MessageService,
    private UserChannelActivityService: UserChannelActivityService,
    private conversationService: ConversationService,
    private threadMessageService: ThreadMessageService
  ) {
    this.restoreGuestFromLocalStorage();
  }

  signInAsGuest(): Observable<GuestUser> {
    const currentGuest = this.currentGuestSubject.value;
    if (currentGuest && !this.isGuestExpired(currentGuest)) return of(currentGuest);

    const deviceId = this.getOrCreateDeviceId();
    return this.findExistingGuest(deviceId).pipe(
      switchMap(guest => guest && !this.isGuestExpired(guest)
        ? this.reactivateGuest(guest)
        : this.createNewGuest(deviceId)),
      switchMap(guest => this.addGuestToChannel(guest)),
      tap(guest => this.currentGuestSubject.next(guest)),
      catchError(error => {
        this.currentGuestSubject.next(null);
        return throwError(() => error);
      })
    );
  }

  signOutGuest(): Observable<void> {
    const guest = this.currentGuestSubject.value;
    this.currentGuestSubject.next(null);
    if (!guest) return of(void 0);

    return this.performCompleteGuestCleanup(guest).pipe(
      switchMap(() => this.userService.deleteUser(guest.uid)),
      tap(() => localStorage.removeItem(this.GUEST_STORAGE_KEY)),
      map(() => void 0),
      catchError(error => {
        return of(void 0);
      })
    );
  }

  extendGuestSession(): Observable<GuestUser> {
    const currentGuest = this.currentGuestSubject.value;
    if (!currentGuest) return throwError(() => new Error('No guest user to extend'));
    const updatedGuest = {
      ...currentGuest,
      expiresAt: Timestamp.fromDate(this.calculateExpiryDate())
    };
    return this.saveGuest(updatedGuest).pipe(
      tap(g => this.currentGuestSubject.next(g))
    );
  }

  cleanupExpiredGuests(): Observable<void> {
    return this.userService.getAllUsers().pipe(
      switchMap(users => {
        const toDelete = users.filter(u => this.isExpiredUser(u));
        return from(Promise.all(toDelete.map(g => this.userService.deleteUser(g.id))));
      }),
      map(() => void 0),
      catchError(() => of(void 0))
    );
  }

  prepareGuestForConversion(): Observable<GuestUser> {
    const guest = this.currentGuestSubject.value;
    if (!guest) return throwError(() => new Error('No guest user to convert'));
    return of({ ...guest });
  }

  cleanupAfterConversion(uid: string): Observable<void> {
    return this.userService.deleteUser(uid).pipe(
      tap(() => this.currentGuestSubject.next(null)),
      map(() => void 0),
      catchError(() => of(void 0))
    );
  }

  isCurrentUserGuest(): boolean {
    return this.currentGuestSubject.value !== null;
  }

  get currentGuest(): GuestUser | null {
    return this.currentGuestSubject.value;
  }

  isGuestSessionValid(): boolean {
    const guest = this.currentGuestSubject.value;
    return guest !== null && !this.isGuestExpired(guest);
  }

  getGuestSessionTimeLeft(): number {
    const guest = this.currentGuestSubject.value;
    if (!guest) return 0;
    return Math.max(0, guest.expiresAt.toDate().getTime() - new Date().getTime());
  }

  getFormattedTimeLeft(): string {
    const ms = this.getGuestSessionTimeLeft();
    if (ms === 0) return '0 Minuten';
    const d = Math.floor(ms / (1000 * 60 * 60 * 24));
    const h = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (d > 0) return `${d} Tag${d > 1 ? 'e' : ''}`;
    if (h > 0) return `${h} Stunde${h > 1 ? 'n' : ''}`;
    return `${m} Minute${m > 1 ? 'n' : ''}`;
  }

  // ========== PRIVATE HELPER METHODS ==========

  private performCompleteGuestCleanup(guest: GuestUser): Observable<void> {
    if (!this.isGuestUser(guest.uid)) {
      console.warn('Attempted cleanup of non-guest user:', guest.uid);
      return of(void 0);
    }
    return forkJoin([
      this.cleanupGuestChannelReferences(guest),
      this.cleanupGuestConversations(guest),
      this.cleanupGuestThreadMessages(guest),
      this.cleanupGuestReactions(guest),
      this.cleanupGuestActivities(guest)
    ]).pipe(
      map(() => void 0),
      catchError(error => {
        console.error('Failed to perform complete guest cleanup:', error);
        return of(void 0);
      })
    );
  }

  private cleanupGuestChannelReferences(guest: GuestUser): Observable<void> {
    return this.channelService.getAllChannelsOnce().pipe(
      switchMap(channels => this.removeGuestFromAllChannels(channels, guest)),
      catchError(() => of(void 0))
    );
  }

  private cleanupGuestConversations(guest: GuestUser): Observable<void> {
    return this.conversationService.getConversationsByUser(guest.uid).pipe(
      switchMap(conversations => this.deleteGuestConversations(conversations)),
      catchError(() => of(void 0))
    );
  }

  private cleanupGuestThreadMessages(guest: GuestUser): Observable<void> {
    return this.threadMessageService.getThreadMessagesByAuthor(guest.uid).pipe(
      switchMap(threadMessages => this.processGuestThreadMessages(threadMessages)),
      catchError(() => of(void 0))
    );
  }

  private cleanupGuestReactions(guest: GuestUser): Observable<void> {
    return forkJoin([
      this.removeGuestReactionsFromMessages(guest.uid),
      this.removeGuestReactionsFromThreadMessages(guest.uid)
    ]).pipe(
      map(() => void 0),
      catchError(() => of(void 0))
    );
  }

  private cleanupGuestActivities(guest: GuestUser): Observable<void> {
    return forkJoin([
      this.messageService.deleteMessagesByUser(guest.uid),
      this.UserChannelActivityService.deleteActivitiesByUser(guest.uid)
    ]).pipe(
      map(() => void 0),
      catchError(() => of(void 0))
    );
  }

  private removeGuestFromAllChannels(channels: Channel[], guest: GuestUser): Observable<void> {
    const updateOperations = channels
      .filter(channel => channel.userIDs.includes(guest.uid))
      .map(channel => this.updateChannelWithoutGuest(channel, guest.uid));

    return updateOperations.length > 0
      ? forkJoin(updateOperations).pipe(map(() => void 0))
      : of(void 0);
  }

  private deleteGuestConversations(conversations: any[]): Observable<void> {
    const deleteOperations = conversations.map(conv =>
      this.conversationService.deleteConversation(conv.coversationID)
    );

    return deleteOperations.length > 0
      ? forkJoin(deleteOperations).pipe(map(() => void 0))
      : of(void 0);
  }

  private processGuestThreadMessages(threadMessages: ThreadMessage[]): Observable<void> {
    const processOperations = threadMessages.map(threadMsg =>
      this.deleteThreadMessageAndUpdateCount(threadMsg)
    );

    return processOperations.length > 0
      ? forkJoin(processOperations).pipe(map(() => void 0))
      : of(void 0);
  }

  private deleteThreadMessageAndUpdateCount(threadMessage: ThreadMessage): Observable<void> {
    return this.threadMessageService.deleteThreadMessage(threadMessage.id!).pipe(
      switchMap(() => this.decrementMessageThreadCount(threadMessage.messageId)),
      catchError(() => of(void 0))
    );
  }

  private decrementMessageThreadCount(messageId: string): Observable<void> {
    return this.messageService.getMessageById(messageId).pipe(
      switchMap(message => {
        if (!message) return of(void 0);
        const updatedCount = Math.max(0, message.threadCount - 1);
        return this.messageService.updateMessage(messageId, {
          threadCount: updatedCount
        });
      }),
      map(() => void 0),
      catchError(() => of(void 0))
    );
  }

  private removeGuestReactionsFromMessages(guestId: string): Observable<void> {
    return this.messageService.getAllMessages().pipe(
      switchMap(messages => this.updateMessagesWithoutGuestReactions(messages, guestId)),
      catchError(() => of(void 0))
    );
  }

  private removeGuestReactionsFromThreadMessages(guestId: string): Observable<void> {
    return this.threadMessageService.getAllThreadMessages().pipe(
      switchMap(threadMessages => this.updateThreadMessagesWithoutGuestReactions(threadMessages, guestId)),
      catchError(() => of(void 0))
    );
  }

  private updateMessagesWithoutGuestReactions(messages: Message[], guestId: string): Observable<void> {
    const updateOperations = messages
      .filter(msg => this.messageHasGuestReactions(msg, guestId))
      .map(msg => this.updateMessageReactions(msg, guestId));

    return updateOperations.length > 0
      ? forkJoin(updateOperations).pipe(map(() => void 0))
      : of(void 0);
  }

  private updateThreadMessagesWithoutGuestReactions(threadMessages: ThreadMessage[], guestId: string): Observable<void> {
    const updateOperations = threadMessages
      .filter(msg => this.threadMessageHasGuestReactions(msg, guestId))
      .map(msg => this.updateThreadMessageReactions(msg, guestId));

    return updateOperations.length > 0
      ? forkJoin(updateOperations).pipe(map(() => void 0))
      : of(void 0);
  }

  private messageHasGuestReactions(message: Message, guestId: string): boolean {
    if (!message.reactions) return false;
    return Object.values(message.reactions).some(reaction =>
      reaction.users.includes(guestId)
    );
  }

  private threadMessageHasGuestReactions(threadMessage: ThreadMessage, guestId: string): boolean {
    return threadMessage.reactions?.some(reaction =>
      reaction.user.includes(guestId)
    ) ?? false;
  }

  private updateMessageReactions(message: Message, guestId: string): Observable<void> {
    const cleanedReactions = this.removeGuestFromMessageReactions(message.reactions!, guestId);
    return this.messageService.updateMessage(message.id, { reactions: cleanedReactions });
  }

  private updateThreadMessageReactions(threadMessage: ThreadMessage, guestId: string): Observable<void> {
    const cleanedReactions = this.removeGuestFromThreadReactions(threadMessage.reactions!, guestId);
    return this.threadMessageService.updateThreadMessage(threadMessage.id!, {
      reactions: cleanedReactions
    });
  }

  private removeGuestFromMessageReactions(reactions: any, guestId: string): any {
    const cleaned: any = {};
    for (const [emoji, reaction] of Object.entries(reactions)) {
      const filteredUsers = (reaction as any).users.filter((userId: string) => userId !== guestId);
      if (filteredUsers.length > 0) {
        cleaned[emoji] = { users: filteredUsers };
      }
    }
    return cleaned;
  }

  private removeGuestFromThreadReactions(reactions: any[], guestId: string): any[] {
    return reactions
      .map(reaction => ({
        ...reaction,
        user: reaction.user.filter((userId: string) => userId !== guestId)
      }))
      .filter(reaction => reaction.user.length > 0);
  }

  private updateChannelWithoutGuest(channel: Channel, guestId: string): Observable<void> {
    const updatedUserIDs = channel.userIDs.filter(id => id !== guestId);
    return this.channelService.updateChannel(channel.id, {
      ...channel,
      userIDs: updatedUserIDs
    });
  }

  // ========== EXISTING HELPER METHODS (UNCHANGED) ==========

  private restoreGuestFromLocalStorage(): void {
    const deviceId = localStorage.getItem(this.GUEST_STORAGE_KEY);
    if (!deviceId) return;
    this.findExistingGuest(deviceId).subscribe(guest => {
      if (guest && !this.isGuestExpired(guest)) {
        this.currentGuestSubject.next(guest);
      }
    });
  }

  private findExistingGuest(deviceId: string): Observable<GuestUser | null> {
    return this.userService.getAllUsers().pipe(
      map(users => users
        .filter(u => u.email.includes('guest_') && u.email.includes('@temporaryuser.local'))
        .map(u => this.mapToGuest(u, deviceId))
        .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0] || null),
      catchError(() => of(null))
    );
  }

  private createNewGuest(deviceId: string): Observable<GuestUser> {
    const now = Timestamp.now();
    const guest: GuestUser = {
      uid: `guest_${uuidv4()}`,
      email: `guest_${uuidv4()}@temporaryuser.local`,
      displayName: this.generateDisplayName(),
      photoURL: this.getRandomAvatar(),
      emailVerified: false,
      role: 'guest',
      isTemporary: true,
      deviceId,
      createdAt: now,
      expiresAt: Timestamp.fromDate(this.calculateExpiryDate()),
      sessionId: uuidv4()
    };
    return this.saveGuest(guest);
  }

  private reactivateGuest(guest: GuestUser): Observable<GuestUser> {
    return this.saveGuest({
      ...guest,
      sessionId: uuidv4(),
      expiresAt: Timestamp.fromDate(this.calculateExpiryDate())
    });
  }

  private addGuestToChannel(guest: GuestUser): Observable<GuestUser> {
    return this.channelService.getChannelByNameOnce('Allgemein').pipe(
      switchMap(channels => {
        if (!channels.length) return of(guest);
        const channel = channels[0];
        const users = channel.userIDs || [];
        if (users.includes(guest.uid)) return of(guest);
        return this.channelService.updateChannel(channel.id, {
          ...channel,
          userIDs: [...users, guest.uid]
        }).pipe(map(() => guest));
      }),
      catchError(() => of(guest))
    );
  }

  private saveGuest(guest: GuestUser): Observable<GuestUser> {
    const user: User = {
      id: guest.uid,
      email: guest.email,
      displayName: guest.displayName,
      photoURL: guest.photoURL,
      lastSeen: guest.createdAt,
      isActive: true,
      createdAt: guest.createdAt,
      updatedAt: Timestamp.now(),
      profile: {
        firstName: guest.displayName.split(' ')[0],
        lastName: guest.displayName.split(' ')[1] || ''
      }
    };
    return from(this.userService.createUser(user)).pipe(
      map(() => guest),
      catchError(error => throwError(() => error))
    );
  }

  private getOrCreateDeviceId(): string {
    let id = localStorage.getItem(this.GUEST_STORAGE_KEY);
    if (!id) {
      id = uuidv4();
      localStorage.setItem(this.GUEST_STORAGE_KEY, id);
    }
    return id;
  }

  private calculateExpiryDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + this.GUEST_EXPIRY_DAYS);
    return date;
  }

  private isGuestExpired(guest: GuestUser): boolean {
    return new Date() > guest.expiresAt.toDate();
  }

  private isExpiredUser(user: User): boolean {
    if (!user.email.includes('@temporaryuser.local')) return false;
    const date = user.createdAt.toDate();
    date.setDate(date.getDate() + this.GUEST_EXPIRY_DAYS);
    return new Date() > date;
  }

  private mapToGuest(user: User, deviceId: string): GuestUser {
    return {
      uid: user.id,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: false,
      role: 'guest',
      isTemporary: true,
      deviceId,
      createdAt: user.createdAt,
      expiresAt: Timestamp.fromDate(this.calculateExpiryDate()),
      sessionId: user.id.replace('guest_', '')
    };
  }

  private generateDisplayName(): string {
    return `${this.GUEST_DISPLAY_NAME} ${Math.floor(Math.random() * 1000) + 1}`;
  }

  private getRandomAvatar(): string {
    const num = Math.floor(Math.random() * 6) + 1;
    return `images/icons/avatars/avatar_${num}.png`;
  }

  private isGuestUser(userId: string): boolean {
    return userId.startsWith('guest_');
  }
}