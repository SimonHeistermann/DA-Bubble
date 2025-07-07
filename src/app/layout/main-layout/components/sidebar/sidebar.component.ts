import { AfterViewInit, Component, ElementRef, EventEmitter, inject, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChannelService } from '../../../../core/services/channel.service';
import { Channel } from '../../../../core/models/channel.interface';
import { toggleMarginRight20Animation, toggleMarginTop25Animation } from '../../animations/expand-collapse.animation';
import { User } from '../../../../core/models/user.interface';
import { AuthService } from '../../../../core/services/auth-service/auth.service';
import { UserService } from '../../../../core/services/user-service/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SimplebarAngularModule } from 'simplebar-angular';
import { CommonModule } from '@angular/common';
import { MessageService } from '../../../../core/services/message.service';
import { UserChannelActivityService } from '../../../../core/services/userReadActivity.service';
import { UserReadActivity, UserReadActivityData } from '../../../../core/models/userReadActivity.interface';
import { user } from '@angular/fire/auth';
import { Message } from '../../../../core/models/message.interface';

@Component({
  selector: 'app-sidebar',
  imports: [SimplebarAngularModule, CommonModule],
  standalone: true,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  animations: [toggleMarginTop25Animation, toggleMarginRight20Animation],

})
export class SidebarComponent implements OnInit, OnDestroy {
  route = inject(ActivatedRoute);

  private subscriptions = new Subscription();
  channelService = inject(ChannelService);
  authService = inject(AuthService);
  userService = inject(UserService);
  messageService = inject(MessageService)
  userChannelActivityService = inject(UserChannelActivityService);
  
  channels: Channel[] = [];
  allUsers: User[] = [];
  userChannelActivities: UserReadActivity[] = [];
  currentUser: User | null = null;
  imgLoadStatus: Record<string, boolean> = {};
  isOverflowing = false;

  @Input() showSelf: boolean = true;
  @Output() addChannel = new EventEmitter<void>();
  @Output() clickDevspaceEmiter = new EventEmitter<void>();
  @Output() clickChannelNameEmitter = new EventEmitter<Channel>();

  openChannel = true;
  openMessage = true;

  public currentChannelIndex: number = 0;
  public currentUserIndex: number | 'currentUser' = -1;
  
  newMessageMap: Record<string,{ unreadCount: number; firstUnreadMessageId?: string }> = {'': {unreadCount:0, firstUnreadMessageId: ''}};
  router = inject(Router);

  ngOnInit(): void {
    this.subCurrentUser();
  }

  subUserChannelActivites() {
    this.subscriptions.add(
      this.userChannelActivityService.getUserReadActivities((data: any) => {
         this.userChannelActivities = [...data];
         this.subMessagesInAllChannel();
         this.subMessagesInAllPrivate();
      }) 
    );
  }

  buildNewMessageMap(messages: Message[], activityID: string) {
    const activity = this.userChannelActivities.find(act => act.activityID === activityID && act.userID === this.currentUser?.id);
    if(activity?.updatedAt) {
        const unreadMessages = messages.filter(
          msg =>
            msg.createdAt &&
            msg.createdAt.toMillis() > activity.updatedAt.toMillis() &&
            msg.authorID !== this.currentUser?.id
        );
        this.newMessageMap[activityID] = {unreadCount: unreadMessages.length, firstUnreadMessageId: unreadMessages.length > 0 ? unreadMessages[0].id : undefined};
        
    } else {
        this.newMessageMap[activityID] = {unreadCount: messages.length, firstUnreadMessageId: messages.length > 0 ? messages[0].id : undefined};
    }
  }

  subMessagesInAllPrivate() {

    let currentUserID = '';
    if(this.currentUser != null) {
       currentUserID = this.currentUser.id;
    }
    
    for (let index = 0; index < this.allUsers.length; index++) {
      const user = this.allUsers[index];
      const userID = user.id;
      this.subscriptions.add(
        this.messageService.getPrivateMessageOrderByCreatedAt(this.messageService.buildConversationID(currentUserID, userID), (data) => {
          this.buildNewMessageMap(data, userID);
      }));
      
    }
  }

  subMessagesInAllChannel() {
    for (let index = 0; index < this.channels.length; index++) {
      const channel = this.channels[index];
      const channelID = channel.id;

      this.subscriptions.add(
        this.messageService.getChannelMessageOrderByCreatedAt(channel.id, (messages) => {
          if(this.currentUser !== null) {
            this.buildNewMessageMap(messages, channelID);
          }
        })
      );
    }
  }

  subCurrentUser(){
    const authUser = this.authService.currentUser;
    if (authUser) {
      this.userService.loadCurrentUser(authUser.uid);
    }
    this.subscriptions.add(
      this.userService.currentUser$.subscribe(user => {
        this.currentUser = user;
        
        this.subAllUsers();
        this.subAllChannels();
        
      })
    );
  }

  subAllUsers() {
    this.subscriptions.add(
      this.userService.allUsers$.subscribe(users => {
        this.allUsers = users;
        this.allUsers = this.allUsers.filter(u => u.id !== this.currentUser?.id);
        this.subUserChannelActivites();
      }));
  }

  subAllChannels() {
    if(!this.currentUser) return;
    
    this.subscriptions.add(
      this.channelService.getChannelsOrderByCreatedAt(this.currentUser.id, (data) => {
        this.channels = [...data];
        if (this.channels.length > 0) {
          this.clickChannelNameEmitter.emit(this.channels[this.currentChannelIndex]);
        }
      })
    );
  }

  
  clickDevspace() {
    // this.clickDevspaceEmiter.emit();
     this.router.navigate(['/dashboard', 'search']);
  }

  clickChannelHead(){
    this.openChannel = !this.openChannel;
  }

  clickMessageHead(){
    this.openMessage = !this.openMessage;
  }

  clickAddChannel() {
    this.addChannel.emit();
    this.currentUserIndex = -1;
    this.currentChannelIndex = -1;
  }

  clickChannelName(index: number, channel: Channel) {
    this.currentChannelIndex = index;
    this.currentUserIndex = -1;
    if (this.currentUser) {
       this.userChannelActivityService.markMessageAsReadByCurrentUser(this.currentUser?.id, channel.id);
    }
    this.router.navigate(['/dashboard', 'channels', channel.id]);
  }

  clickUserName(index: number | 'currentUser', user: User | null) {
    this.currentChannelIndex = -1;
    this.currentUserIndex = index;
    let id;
    if(user && this.currentUser) {
      id = user.id;
      this.userChannelActivityService.markMessageAsReadByCurrentUser(this.currentUser?.id, user.id);
    } else {
      id = this.currentUser?.id;
    }
    this.router.navigate(['/dashboard', 'users', id]);
  }

  renewSubscriptions() {
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

}
