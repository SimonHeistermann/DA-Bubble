import { AfterViewChecked, AfterViewInit, ChangeDetectionStrategy, Component, EventEmitter, Inject, inject, InjectionToken, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { InputComponent } from '../shared/input/input.component';
import { CommonModule } from '@angular/common';
import { Channel, CHANNEL_TOKEN } from '../../../../core/models/channel.interface';
import { filter, Subscription } from 'rxjs';
import { UserService } from '../../../../core/services/user-service/user.service';
import { forkJoin} from 'rxjs';
import { User } from '../../../../core/models/user.interface';
import {
  ElementRef,
  ViewChild,
} from '@angular/core';

import { AuthService } from '../../../../core/services/auth-service/auth.service';
import { MessageBoxComponent } from './message-box/message-box.component';
import { MessageService } from '../../../../core/services/message.service';
import { ChannelMessageHeaderComponent } from './channel-message-header/channel-message-header.component';
import { MessageData } from '../../../../core/models/message.interface';
import { UserChannelActivityService } from '../../../../core/services/userReadActivity.service';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { ChannelService } from '../../../../core/services/channel.service';
import { user } from '@angular/fire/auth';
import { SearchMessageHeaderComponent } from './search-message-header/search-message-header.component';
import { DashboardResponsiveService } from '../../../../core/services/dashboard-responsive/dashboard-responsive.service';
import { MainLayoutContentComponent } from '../../main-layout-content/main-layout-content.component';



@Component({
  selector: 'app-message',
  imports: [InputComponent, CommonModule, MessageBoxComponent, ChannelMessageHeaderComponent, SearchMessageHeaderComponent],
  standalone: true,
  templateUrl: './message.component.html',
  styleUrl: './message.component.scss',
  animations: [],
})
export class MessageComponent implements OnInit, AfterViewChecked{

  @ViewChild('containerBody') private containerBody!: ElementRef;
 
  
  private subscriptions = new Subscription();
  showHeader: 'direct' | 'channel' | 'new' = 'channel';
  
  userService = inject(UserService);
  channelService = inject(ChannelService);
  dashboardResponsive = inject(DashboardResponsiveService);
  mainLayoutContentComponent = inject(MainLayoutContentComponent);
  allUsers: User[] = [];
  allUsersWithOutCurrentUser: User[] = [];
  authService = inject(AuthService);
  currentUser: User | null = null;
  channel: Channel | null = null;
  allChannel: Channel[] = [];
  messageUser: User | null = null;
  messageService = inject(MessageService);
  userChannelActivityService = inject(UserChannelActivityService);

  showAddChannelUserOverlay = false;
  showUserListOverlay = false;
  isTablet = false;
  isMobile = false;

  route = inject(ActivatedRoute);
  router = inject(Router);


  ngOnInit(): void {
    this.subscriptions.add(
      this.route.paramMap.subscribe(params => {
        const channelId = params.get('channelId');
        const userId = params.get('userId');
        if (channelId) {
          this.loadChannel(channelId);
          this.messageUser = null;
        } else if (userId) {
          this.loadUser(userId);
          this.channel = null;
        } else {
           this.handleShowSearchField();
        }}));

     this.dashboardResponsive.isTablet$.subscribe(isTablet => { this.isTablet = isTablet;})
     this.dashboardResponsive.isMobile$.subscribe(isMobile => { this.isMobile = isMobile;})}

  handleShowSearchField() { 
    this.showHeader = 'new';
    this.messageUser = null;
    this.messageUser = null;
  }

  ngAfterViewChecked(): void {
    if (this.containerBody ) {
      this.containerBody.nativeElement.scrollTop = this.containerBody.nativeElement.scrollHeight;
    }
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
     })
    )
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  buildChannelMessageData(msg: string): MessageData {
    return {
      authorID: this.currentUser?.id || '',
      authorName: this.currentUser?.displayName || '',
      content: msg,
      isEdited: false,
      threadCount: 0,
      type: 'channel' as 'channel',
      channelID: this.channel?.id
    };
  }

  buildPrivateMessageData(msg: string): MessageData {
   
    return {
      authorID: this.currentUser?.id || '',
      authorName: this.currentUser?.displayName || '',
      content: msg,
      isEdited: false,
      threadCount: 0,
      type: 'private' as 'private',
      recipientID: this.messageUser?.id,
      conversationID: this.messageService.buildConversationID(this.currentUser!.id, this.messageUser!.id)
    };
  }


  onSendMessage(msg: string) {
    if ((this.currentUser && this.channel) || (this.currentUser && this.messageUser))  {
      let messsageData ;
      if(this.messageUser) {
        messsageData = this.buildPrivateMessageData(msg);
      } else {
        messsageData = this.buildChannelMessageData(msg);
      }
      
      this.subscriptions.add( this.messageService.addOneMessage(messsageData).subscribe(
        {
          next: (id: string) => {
            if (this.currentUser && this.channel)
              this.userChannelActivityService.markMessageAsReadByCurrentUser(this.currentUser.id, this.channel.id);
            if (this.currentUser && this.messageUser)
              this.userChannelActivityService.markMessageAsReadByCurrentUser(this.currentUser.id, this.messageUser.id);
          }
        }
      ));
    }


  }
}
