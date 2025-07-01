import { Inject, Injectable, Input } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Message, ThreadMessage } from '../../models/message.interface';
import { DateService } from '../date.service';
import { ChannelService } from '../channel.service';
import { UserService } from '../user-service/user.service';
import { AuthService } from '../auth-service/auth.service';
import { FirebaseService } from '../firebase-service/firebase.service';
import { User } from '../../models/user.interface';
import { Subscription } from 'rxjs';
import { forkJoin } from 'rxjs';
import { or, orderBy, where } from 'firebase/firestore';
import { ChannelData } from '../../models/channel.interface';
import { ThreadContentComponent } from '../../../layout/main-layout/components/thread-content/thread-content.component';

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

  private showThread = new BehaviorSubject<boolean>(false);
  showThread$ = this.showThread.asObservable();

  private message = new BehaviorSubject<Message | null>(null);
  message$ = this.message.asObservable();

  constructor(
    private dateService: DateService,
    private channelService: ChannelService,
    private userService: UserService,
    private authService: AuthService,
    private firebaseService: FirebaseService,
  ) {}


  show() {
    this.showThread.next(true);
    this.threadOpen = true;
  }

  hide() {
    this.showThread.next(false);
    this.threadOpen = false;
  }

  setMessage(message: Message) {
   this.message.next(message);
   console.log(this.message.value?.createdAt);

   if (this.message.value?.createdAt) {
   this.formattedTime = this.dateService.getHoursAndMinutes(this.message.value.createdAt)
   }
   
   this.subChannelUsers();
     if (this.message.value?.channelID) {
          this.loadChannel(this.message.value?.channelID);
          this.messageUser = null;
          console.log(`ChannelId gefunden: ${this.message.value?.channelID}`);
        } 

this.firebaseService.getCollectionOnce( 'threadmessage', (content) => {
    this.currentThreadMessages = content;
    const authorIDs = this.currentThreadMessages.map(m => m.authorId);
    const timeStamp  = this.currentThreadMessages.map(m => m.messageId );
    console.log(`AuthorIDs: ${timeStamp}`);
    const uniqueAuthorIDs = Array.from(new Set(authorIDs));
    this.userService.getUsersByIds(uniqueAuthorIDs).subscribe(users => {
     this.threadUsers = uniqueAuthorIDs
    .map(id => users.find(u => u?.id === id))
    .filter((u): u is User => u !== null);
    });
  },
  where('messageId', '==', this.message.value?.id),
  orderBy('editedAt', 'asc')
);


this.userService.getUserById(this.message.value?.authorID ?? '').subscribe({
  next: (user) => {
    this.mainUser = user;
  }
})

  }

  loadChannel(channelId: string) {
    this.showHeader = 'channel';
    this.subscriptions.add(
      this.channelService.getChannelById(channelId).subscribe({
        next: (data) => {
          if(data) {
             this.channel = {...data};
             this.subCurrentUser();
          }
        }
      })
    );
    
  }


  loadUser(userId:string) {
    this.showHeader = 'direct';
    this.subscriptions.add(
      this.userService.getUserById(userId).subscribe({
        next: (data) => {
          if(data) {
             this.messageUser = {...data};
             this.subCurrentUser();
          }
        }
      })
    );
  }

  subCurrentUser(){
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
    console.log(`Current User: ${this.currentUser?.id} - ${this.currentUser?.displayName}`);
    
  }

    subChannelUsers() {
      if(!this.channel) return;
      const userIDs = this.channel.userIDs ?? [];
      if(this.channel.userIDs?.length === 0) return;
  
      this.subscriptions.add(
        forkJoin(userIDs.map(uid => this.userService.getUserById(uid)))
        .subscribe( users => {
          this.allUsers = [];
          this.allUsers = users.filter((u): u is User => u !== null);
          this.allUsersWithOutCurrentUser = this.allUsers.filter(u => u.id !== this.currentUser?.id);
          // console.log(this.allUsersWithOutCurrentUser);
          
       })
      )
    }
  
}
