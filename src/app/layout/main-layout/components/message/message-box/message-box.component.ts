import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, inject, Input, NgZone, OnDestroy, OnInit, Output, QueryList, SimpleChanges, TemplateRef, ViewChild, ViewChildren, ViewContainerRef } from '@angular/core';
import { EmojiComponent } from '../../shared/emoji/emoji.component';
import { EmojiPickerComponent } from '../../shared/emoji-picker/emoji-picker.component';
import { Channel } from '../../../../../core/models/channel.interface';
import { User } from '../../../../../core/models/user.interface';
import { Subscription } from 'rxjs';
import { Message } from '../../../../../core/models/message.interface';
import { MessageService } from '../../../../../core/services/message.service';
import { ConnectedPosition, OverlayRef } from '@angular/cdk/overlay';
import { OverlayService } from '../../../../../core/services/overlay.service';
import { DateService } from '../../../../../core/services/date.service';
import { CommonModule } from '@angular/common';
import { Timestamp } from 'firebase/firestore';
import { UserChannelActivityService } from '../../../../../core/services/userChannelActivity.service';
import { UserChannelActivity } from '../../../../../core/models/userChannelActivity.interface';

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
          
          this.messages = [...data];
          this.subChannelUserActivity();
      })
    );
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

  showEmojiPicker(index: number, pos: 'left' | 'right') {
    const triggerRef = pos === 'right' ? this.emojiTriggerAtRightRefs.get(index) : this.emojiTriggerAtLeftRefs.get(index);
    if (!triggerRef) return;

    this.clickedMessageIndex = index;

    this.emojiPickerOverlayRef = this.overlayService.openTemplateOverlay(
      triggerRef, 
      this.emojiPickerTemplate, 
      this.viewContainerRef, 
      this.buildPosition(pos),
    );

    this.emojiPickerOverlayRef.backdropClick().subscribe(() => this.closeEmojiPickerOverlay());
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
