import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Message, ThreadMessage } from '../../models/message.interface';
import { DateService } from '../date.service';
import { ChannelService } from '../channel.service';
import { UserService } from '../user-service/user.service';
import { AuthService } from '../auth-service/auth.service';
import { FirebaseService } from '../firebase-service/firebase.service';
import { DashboardResponsiveService } from '../dashboard-responsive/dashboard-responsive.service';
import { User } from '../../models/user.interface';
import { Subscription } from 'rxjs';
import { forkJoin } from 'rxjs';
import { orderBy, where } from 'firebase/firestore';
import { Channel, ChannelData } from '../../models/channel.interface';

@Injectable({
  providedIn: 'root'
})
export class ThreadService {

  threadOpen = false;
  formattedTime = '';

  private subscriptions = new Subscription();
  showHeader: 'direct' | 'channel' | 'new' = 'channel';
  messageUser: User | null = null;
  currentUser: User | null = null;
  mainUser: User | null = null;
  channel: ChannelData | null = null;
  currentThreadMessages: ThreadMessage[] = [];
  threadUsers: User[] = [];
  allUsers: User[] = [];
  allUsersWithOutCurrentUser: User[] = [];
  allSelectedUsers: User[] = [];
  reactionsArray: { emoji: string; user: any }[] = [];
  mentions: string[] = [];

  private showThread = new BehaviorSubject<boolean>(false);
  showThread$ = this.showThread.asObservable();

  private message = new BehaviorSubject<Message | null>(null);
  message$ = this.message.asObservable();

  private selectedUserSource = new BehaviorSubject<User | null>(null);
  selectedUser$ = this.selectedUserSource.asObservable();

  constructor(
    private dateService: DateService,
    private channelService: ChannelService,
    private userService: UserService,
    private authService: AuthService,
    private firebaseService: FirebaseService,
    private dashboardResponsive: DashboardResponsiveService,
  ) {
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  show() {
    this.dashboardResponsive.setOpenThread(true);
    this.showThread.next(true);
    this.threadOpen = true;
  }

  hide() {
    this.showThread.next(false);
    this.threadOpen = false;
  }
  setMessage(message: Message) {
    this.message.next(message);

    this.formattedTime = message.createdAt ? this.dateService.getHoursAndMinutes(message.createdAt) : '';

    this.subChannelUsers();
    this.getMessageUser(message);
    this.sortThreadMessage(message)
    this.getUsers(message);
    this.getReactions(message);
  }

  getMessageUser(message: Message) {
    if (message.channelID) {
      this.loadChannel(message.channelID);
      this.messageUser = null;
    }
  }

  sortThreadMessage(message: Message) {
    this.firebaseService.getCollectionOnce('threadmessage', (content) => {
      this.currentThreadMessages = content.map(doc => ({
        ...doc,
        id: doc.id
      }));
      const authorIDs = this.currentThreadMessages.map(m => m.authorId);
      const uniqueAuthorIDs = Array.from(new Set(authorIDs));
      this.userService.getUsersByIds(uniqueAuthorIDs).subscribe(users => {
        const userMap = new Map(users.map(u => [u.id, u]));
        this.threadUsers = this.currentThreadMessages.map(m => userMap.get(m.authorId)!);
      });
    },
      where('messageId', '==', message.id),
      orderBy('createdAt', 'asc'));
  }


  getUsers(message: Message) {
    this.userService.getUserById(message.authorID ?? '').subscribe({
      next: (user) => {
        this.mainUser = user;
      }
    })
  }

  getReactions(message: Message) {
    this.reactionsArray = Object.entries(message.reactions ?? {}).flatMap(([key, value]) =>
      value.users.map(user => ({ emoji: key, user }))
    );
  }

  loadChannel(channelId: string) {
    this.showHeader = 'channel';
    this.subscriptions.add(
      this.channelService.getChannelById(channelId).subscribe({
        next: (data) => {
          if (data) {
            this.channel = { ...data };
            this.subCurrentUser();
          }
        }
      }));
  }


  subCurrentUser() {
    const authUser = this.authService.currentUser;
    if (authUser) {
      this.userService.loadCurrentUser(authUser.uid);
    }
    this.subscriptions.add(
      this.userService.currentUser$.subscribe(user => {
        this.currentUser = user;
        this.subChannelUsers();
      })
    );

  }

  subChannelUsers() {
    if (!this.channel || !this.channel.userIDs?.length) return;

    this.subscriptions.add(
      forkJoin(this.channel.userIDs.map(uid => this.userService.getUserById(uid)))
        .subscribe(users => {
          this.allUsers = users.filter((u): u is User => u !== null);

          this.allUsersWithOutCurrentUser = this.allUsers.filter(
            u => u.id !== this.currentUser?.id
          );
        })
    );
  }

  setSelectedUser(user: User) {
    this.selectedUserSource.next(user);

    if (user.displayName) {
      this.mentions.push(user.displayName);
      this.allSelectedUsers.push(user);
    }

    this.allUsersWithOutCurrentUser = this.allUsers.filter(u =>
      u.id !== this.currentUser?.id &&
      !this.allSelectedUsers.some(selected => selected.id === u.id)
    );
  }
}