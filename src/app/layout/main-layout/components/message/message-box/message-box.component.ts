import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, inject, Input, NgZone, OnDestroy, OnInit, Output, QueryList, SimpleChanges, TemplateRef, ViewChild, ViewChildren, ViewContainerRef } from '@angular/core';
import { EmojiComponent } from '../../shared/emoji/emoji.component';
import { EmojiPickerComponent } from '../../shared/emoji-picker/emoji-picker.component';
import { Channel } from '../../../../../core/models/channel.interface';
import { User } from '../../../../../core/models/user.interface';
import { Subscription } from 'rxjs';
import { Message, MessageData, MessageReactions } from '../../../../../core/models/message.interface';
import { MessageService } from '../../../../../core/services/message.service';
import { ConnectedPosition, OverlayRef } from '@angular/cdk/overlay';
import { OverlayService } from '../../../../../core/services/overlay.service';
import { DateService } from '../../../../../core/services/date.service';
import { CommonModule } from '@angular/common';
import { Timestamp } from 'firebase/firestore';
import { UserChannelActivityService } from '../../../../../core/services/userChannelActivity.service';
import { UserChannelActivity } from '../../../../../core/models/userChannelActivity.interface';
import { object } from '@angular/fire/database';

@Component({
  selector: 'app-message-box',
  imports: [EmojiComponent, EmojiPickerComponent, CommonModule],
  standalone: true,
  templateUrl: './message-box.component.html',
  styleUrl: './message-box.component.scss'
})
export class MessageBoxComponent implements OnInit, OnDestroy, AfterViewInit{
  @Input() channel: Channel | null = null;
  @Input() currentUser: User | null = null;
  @Input() allUsers: User[] = [];

  @Output() readMessageEmitter = new EventEmitter<void>();

  private subscriptions = new Subscription();
  messageService = inject(MessageService);
  dateService = inject(DateService);
  userChannelActivityService = inject(UserChannelActivityService);
  userChannelActivity: UserChannelActivity | null = null;

  messages: Message[] = [];
  firstUnreadMessageId: string = '';

  @ViewChild('emojiPickerTemplate') emojiPickerTemplate!: TemplateRef<any>;
  @ViewChildren('emojiTriggerAtLeft') emojiTriggerAtLeftRefs!: QueryList<ElementRef>;
  @ViewChildren('emojiTriggerAtRight') emojiTriggerAtRightRefs!: QueryList<ElementRef>;
  @ViewChildren('messageDiv') messageRefs!: QueryList<ElementRef>;
  
  emojiPickerOverlayRef!: OverlayRef;
  overlayService = inject(OverlayService);
  viewContainerRef = inject(ViewContainerRef);

  clickedMessageIndex = -1;
  isNewInChannel = true;
  
  ngOnInit(): void {
    
  }

  ngAfterViewInit(): void {
    
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['channel'] && changes['channel'].currentValue) {
      this.channel = changes['channel'].currentValue;
       this.isNewInChannel = true;
       this.subMessages();
    }

  }

  shouldShowDateDivider(index: number) {
    if (index === 0) return true;

    const current = this.messages[index];
    const previous = this.messages[index - 1];

    if (!current.createdAt || !previous.createdAt) return false;

    const currentDate = this.dateService.toDate(current.createdAt);
    const previousDate = this.dateService.toDate(previous.createdAt);

    return !this.dateService.isSameDay(currentDate, previousDate);
  }

  convertReaction(mr: MessageReactions | undefined) {
    if (!mr) return [];
    const mrKeys= Object.keys(mr);
    return mrKeys;
  }

  buildFirstUnreadMessageId(activity: UserChannelActivity, messages: Message[]) {
      if(!activity?.updatedAt) return;

      const unreadMessages = messages.filter(
        msg =>
          msg.createdAt &&
          msg.createdAt.toMillis() > activity.updatedAt.toMillis() &&
          msg.authorID !== this.currentUser?.id
      );
      if (unreadMessages.length !==0 ) {
        if(this.isNewInChannel) {
          this.firstUnreadMessageId = unreadMessages[0].id;
          this.isNewInChannel = false;
        } else {
          this.firstUnreadMessageId = unreadMessages[unreadMessages.length - 1].id;
        }
      } else {
        this.firstUnreadMessageId = '';
      }
  }

  subChannelUserActivity() {
    if(!this.currentUser || !this.channel) return;

    this.userChannelActivityService.getUserChannelActivityByIDsOnce(this.currentUser.id, this.channel.id, (data: any) => {
      const activities = [...data];
      if(activities.length === 1) {
        const activity = activities[0];
        if(activity.channelID == this.channel?.id && activity.userID == this.currentUser?.id) {
          this.userChannelActivity = activities[0];
          if (this.userChannelActivity) {
            this.buildFirstUnreadMessageId(this.userChannelActivity, this.messages);
          }
          this.scrollTo() ;
        }
      }
    })
    
  }

  scrollTo() {
    let element;
    if (this.firstUnreadMessageId) {
      element = this.messageRefs.find(ref =>ref.nativeElement.getAttribute('data-id') === this.firstUnreadMessageId);
    } else {
      element = this.messageRefs.get(this.messageRefs.length - 1);
    }
    if (element) element.nativeElement.scrollIntoView({block: 'start' });
    
  }

  subMessages() {
    if(!this.currentUser || !this.channel) return;

    this.subscriptions.add(
      this.messageService.getChannelMessageOrderByCreatedAt(this.channel.id, (data) => {
          if(data.length === 0 || data[0].channelID !== this.channel?.id) {
            this.messages = [];
            return;
          };

          if(this.isNewMessage(data)) {
             this.messages = [...data];
             this.subChannelUserActivity();
          }
      })
    );
  }

  isNewMessage(newMessages: Message[]) {
     return this.messages.length === 0 ||
        newMessages.length > this.messages.length ||
        newMessages[newMessages.length - 1].id !== this.messages[this.messages.length - 1].id;
  }

  findURLByUserId(userID: string): string | ''{
    const user = this.allUsers.find(u => u.id === userID) ?? null;
    if (user) {
       const url = user.photoURL.startsWith('http') ? '/icons/avatars/avatar_1.png' : user.photoURL;
       return url;
    } else {
      return '';
    }
  }

  buildPosition (pos: string): ConnectedPosition[] {
    return  pos === 'right'
    ? [
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' }
      ]
    : [
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
        { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'bottom' }
      ];
  }

  showEmojiPicker(event: MouseEvent, index: number, pos: 'left' | 'right') {
    const trigger = event.currentTarget as HTMLElement;
  
    this.clickedMessageIndex = index;

    this.emojiPickerOverlayRef = this.overlayService.openTemplateOverlay(
      new ElementRef(trigger), 
      this.emojiPickerTemplate, 
      this.viewContainerRef, 
      this.buildPosition(pos),
    );

    this.emojiPickerOverlayRef.backdropClick().subscribe(() => this.closeEmojiPickerOverlay());
  }

  onSelectedEmoji(emojiStr: string){
    this.clickEmoji(emojiStr,this.messages[this.clickedMessageIndex]);
    this.clickedMessageIndex = -1;
    this.emojiPickerOverlayRef?.dispose();
    
  }

  clickEmoji(emojiStr: string, message: Message) {
    if(!this.currentUser) return; 
    const userName = this.currentUser.displayName;

    let {id, ...messageData} = message;

    this.updateMessageReaction(userName, emojiStr, messageData);
    this.subUpdateMessage(id, messageData);
  }

  updateMessageReaction(userName: string, emojiStr: string, messageData: MessageData){
    if (!messageData.reactions) messageData.reactions = {};

    if (!messageData.reactions[emojiStr]) {
      messageData.reactions[emojiStr] = {users: [userName]};
    } else {
      const reaction = messageData.reactions[emojiStr];
      const index = reaction.users.indexOf(userName);
      if (index === -1) {
        reaction.users.push(userName);
      } else {
        reaction.users.splice(index, 1);
        if(reaction.users.length == 0) delete messageData.reactions[emojiStr];
      }
    }
  }

  subUpdateMessage(id: string, messageData: MessageData) {
    this.subscriptions.add(
      this.messageService.updateMessage(id, messageData).subscribe({
        next: () =>{
          console.log('reactions updated');
        }
      })
    );
  }

  closeEmojiPickerOverlay() {
    this.clickedMessageIndex = -1;
    this.emojiPickerOverlayRef?.dispose();
  }

  renewSubscriptions() {
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  
}
