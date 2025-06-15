import { AfterViewChecked, AfterViewInit, ChangeDetectionStrategy, Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { InputComponent } from '../shared/input/input.component';
import { CommonModule } from '@angular/common';
import { Channel } from '../../../../core/models/channel.interface';
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

@Component({
  selector: 'app-message',
  imports: [InputComponent, CommonModule, MessageBoxComponent, ChannelMessageHeaderComponent],
  standalone: true,
  templateUrl: './message.component.html',
  styleUrl: './message.component.scss',
  animations: [],
})
export class MessageComponent implements OnInit, AfterViewInit, AfterViewChecked{

  @ViewChild('containerBody') private containerBody!: ElementRef;
  @Input() channel: Channel | null = null;
  
  private subscriptions = new Subscription();
  showHeader: 'direct' | 'channel' | 'new' = 'channel';
  
  userService = inject(UserService);
  allUsers: User[] = [];
  authService = inject(AuthService);
  currentUser: User | null = null;
  messageService = inject(MessageService);

  showAddChannelUserOverlay = false;
  showUserListOverlay = false;

  ngOnInit(): void {
    this.subCurrentUser();
  }

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  ngAfterViewChecked() {
    
  }

  onReadMessage() {
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

  subCurrentUser(){
    const authUser = this.authService.currentUser;
    if (authUser) {
      this.userService.loadCurrentUser(authUser.uid);
    }
    this.subscriptions.add(
      this.userService.currentUser$.subscribe(user => {
        this.currentUser = user;
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['channel'] && changes['channel'].currentValue) {
      this.onChannelChanged(changes['channel'].currentValue);
    }
  }

  onChannelChanged(channel: Channel) {
    this.channel = channel;
    const userIDs = this.channel.userIDs ?? [];
    if(this.channel.userIDs?.length === 0) return;

    this.subscriptions.add(
      forkJoin(userIDs.map(uid => this.userService.getUserById(uid)))
      .subscribe( users => {
        this.allUsers = [];
        this.allUsers = users.filter((u): u is User => u !== null);
        
     })
    )
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onSendMessage(msg: string) {
    if (!this.currentUser || !this.channel) return;

    let messsageData = {
      authorID: this.currentUser.id,
      authorName: this.currentUser.displayName,
      content: msg,
      isEdited: false,
      threadCount: 0,
      type: 'channel' as 'channel',
      channelID: this.channel?.id
    }

    this.subscriptions.add( this.messageService.addOneMessage(messsageData).subscribe(
      {
        next: (id: string) => {
          console.log('Channel added with ID:', id);
        },
        complete:() => {
          this.scrollToBottom();
        }
      }
    ))
   ;
  }
}
