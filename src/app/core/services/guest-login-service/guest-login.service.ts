import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of, throwError, forkJoin } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { AuthUser } from '../../models/auth.interface';
import { User } from '../../models/user.interface';
import { Channel } from '../../models/channel.interface';
import { UserService } from '../user-service/user.service';
import { ChannelService } from '../channel.service';
import { MessageService } from '../message.service';
import { UserChannelActivityService } from '../userReadActivity.service';
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
    private UserChannelActivityService: UserChannelActivityService
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
    return this.cleanupGuestReferences(guest).pipe(
      switchMap(() => this.userService.deleteUser(guest.uid)),
      tap(() => localStorage.removeItem(this.GUEST_STORAGE_KEY)),
      map(() => void 0),
      catchError(error => {
        console.error('Guest sign out failed:', error);
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

  private removeGuestFromDefaultChannel(guest: GuestUser): Observable<GuestUser> {
    return this.channelService.getChannelByNameOnce('Allgemein').pipe(
      switchMap(channels => {
        if (!channels.length) return of(guest);
        const channel = channels[0];
        const filtered = (channel.userIDs || []).filter(id => id !== guest.uid);
        return this.channelService.updateChannel(channel.id, {
          ...channel,
          userIDs: filtered
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

  private deleteGuest(uid: string): Observable<void> {
    return this.userService.deleteUser(uid).pipe(
      map(() => void 0),
      catchError(() => of(void 0))
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
    return `/icons/avatars/avatar_${num}.png`;
  }

  private cleanupGuestReferences(guest: GuestUser): Observable<void> {
    return this.channelService.getAllChannelsOnce().pipe(
      switchMap(channels => this.performGuestCleanup(channels, guest)),
      catchError(error => {
        console.error('Failed to clean up guest references:', error);
        return of(void 0);
      })
    );
  }
  
  private performGuestCleanup(channels: Channel[], guest: GuestUser): Observable<void> {
    const removeFromChannels$ = this.removeGuestFromChannels(channels, guest);
    const deleteMessages$ = this.messageService.deleteMessagesByUser(guest.uid);
    const deleteActivities$ = this.UserChannelActivityService.deleteActivitiesByUser(guest.uid);
    return forkJoin([
      ...removeFromChannels$,
      deleteMessages$,
      deleteActivities$
    ]).pipe(map(() => void 0));
  }
  
  private removeGuestFromChannels(channels: Channel[], guest: GuestUser): Observable<void>[] {
    return channels
      .filter(channel => channel.userIDs.includes(guest.uid))
      .map(channel => this.updateChannelWithoutGuest(channel, guest.uid));
  }
  
  private updateChannelWithoutGuest(channel: Channel, guestId: string): Observable<void> {
    const updatedUserIDs = channel.userIDs.filter(id => id !== guestId);
    return this.channelService.updateChannel(channel.id, {
      ...channel,
      userIDs: updatedUserIDs
    });
  }  
}