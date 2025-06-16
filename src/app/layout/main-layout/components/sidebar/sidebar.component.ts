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
import { UserChannelActivityService } from '../../../../core/services/userChannelActivity.service';
import { UserChannelActivity, UserChannelActivityData } from '../../../../core/models/userChannelActivity.interface';
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
  userChannelActivities: UserChannelActivity[] = []
  currentUser: User | null = null;
  imgLoadStatus: Record<string, boolean> = {};
  isOverflowing = false;

  @Input() showSelf: boolean = true;
  @Output() addChannel = new EventEmitter<void>();
  @Output() clickChannelNameEmitter = new EventEmitter<Channel>();

  openChannel = true;
  openMessage = true;

  public currentChannelIndex: number = 0;
  
  newMessageMap: Record<string,{ unreadCount: number; firstUnreadMessageId?: string }> = {'': {unreadCount:0, firstUnreadMessageId: ''}};
  router = inject(Router);

  ngOnInit(): void {
    this.subCurrentUser();
  }

  subUserChannelActivites() {
    this.subscriptions.add(
      this.userChannelActivityService.getUserChannelActivities((data: any) => {
         this.userChannelActivities = [...data];
         this.subMessagesInAllChannel();
      }) 
    );
  }



  buildNewMessageMap(messages: Message[], channel: Channel, channelID: string) {
    const activity = this.userChannelActivities.find(act => act.channelID === channel.id && act.userID === this.currentUser?.id);
    if(activity?.updatedAt) {
        const unreadMessages = messages.filter(
          msg =>
            msg.createdAt &&
            msg.createdAt.toMillis() > activity.updatedAt.toMillis() &&
            msg.authorID !== this.currentUser?.id
        );
        this.newMessageMap[channelID] = {unreadCount: unreadMessages.length, firstUnreadMessageId: unreadMessages.length > 0 ? unreadMessages[0].id : undefined};
        
    } else {
        this.newMessageMap[channelID] = {unreadCount: messages.length, firstUnreadMessageId: messages.length > 0 ? messages[0].id : undefined};
    }
  }

  subMessagesInAllChannel() {
    for (let index = 0; index < this.channels.length; index++) {
      const channel = this.channels[index];
      const channelID = channel.id;

      this.subscriptions.add(
        this.messageService.getChannelMessageOrderByCreatedAt(channel.id, (messages) => {
          if(this.currentUser !== null) {
            this.buildNewMessageMap(messages, channel, channelID);
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
        this.subUserChannelActivites();
      })
    );
  }

  subAllUsers() {
    this.subscriptions.add(
      this.userService.allUsers$.subscribe(users => {
        this.allUsers = users;
        this.allUsers = this.allUsers.filter(u => u.id !== this.currentUser?.id);
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

  
  

  clickChannelHead(){
    this.openChannel = !this.openChannel;
  }

  clickMessageHead(){
    this.openMessage = !this.openMessage;
  }

  clickAddChannel() {
    this.addChannel.emit();
  }

  clickChannelName(index: number, channel: Channel) {
    this.currentChannelIndex = index;
    if (this.currentUser) {
       this.userChannelActivityService.markChannelMessageAsReadByCurrentUser(this.currentUser?.id, channel.id);
    }
   
    this.router.navigate(['/dashboard', 'channels', channel.id]);
   
  }

  renewSubscriptions() {
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

}
