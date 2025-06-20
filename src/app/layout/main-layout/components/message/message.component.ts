import { AfterViewChecked, AfterViewInit, ChangeDetectionStrategy, Component, EventEmitter, Inject, inject, InjectionToken, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { InputComponent } from '../shared/input/input.component';
import { CommonModule } from '@angular/common';
import { Channel, CHANNEL_TOKEN } from '../../../../core/models/channel.interface';
import { Subscription } from 'rxjs';
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
import { UserChannelActivityService } from '../../../../core/services/userChannelActivity.service';
import { ActivatedRoute } from '@angular/router';
import { ChannelService } from '../../../../core/services/channel.service';



@Component({
  selector: 'app-message',
  imports: [InputComponent, CommonModule, MessageBoxComponent, ChannelMessageHeaderComponent],
  standalone: true,
  templateUrl: './message.component.html',
  styleUrl: './message.component.scss',
  animations: [],
})
export class MessageComponent implements OnInit, AfterViewInit{

  @ViewChild('containerBody') private containerBody!: ElementRef;
 
  
  private subscriptions = new Subscription();
  showHeader: 'direct' | 'channel' | 'new' = 'channel';
  
  userService = inject(UserService);
  channelService = inject(ChannelService);
  allUsers: User[] = [];
  allUsersWithOutCurrentUser: User[] = [];
  authService = inject(AuthService);
  currentUser: User | null = null;
  channel: Channel | null = null;
  messageService = inject(MessageService);
  userChannelActivityService = inject(UserChannelActivityService);

  showAddChannelUserOverlay = false;
  showUserListOverlay = false;

  route = inject(ActivatedRoute);

  constructor() {}

  ngOnInit(): void {
    // Subscribe once to paramMap changes
    this.subscriptions.add(
      this.route.paramMap.subscribe(params => {
        const channelId = params.get('channelId');
        if (channelId) {
          this.loadChannel(channelId);
        }
      })
    );
  }

  loadChannel(channelId: string) {
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

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      const el = this.containerBody.nativeElement;
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth'
      });
    } catch(err) {
      console.error('Scroll error:', err);
    }
  }

  scrollToBottomWithoutAnimation(): void {
  try {
    const el = this.containerBody.nativeElement;
    el.scrollTo({
      top: el.scrollHeight
    });
  } catch (err) {
    console.error('Scroll error:', err);
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
    console.log('ngOnDescrty, message component');
    
    this.subscriptions.unsubscribe();
  }

  buildMessageData(msg: string): MessageData {
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

  onReadMessage() {
    this.scrollToBottomWithoutAnimation();
  }

  onSendMessage(msg: string) {
    if (!this.currentUser || !this.channel) return;

    let messsageData = this.buildMessageData(msg);
    this.subscriptions.add( this.messageService.addOneMessage(messsageData).subscribe(
      {
        next: (id: string) => {
          if (this.currentUser && this.channel)
            this.userChannelActivityService.markChannelMessageAsReadByCurrentUser(this.currentUser?.id, this.channel?.id);
        },
        complete:() => {

        }
      }
    ))
   ;
  }
}
