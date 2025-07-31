import { Component, ElementRef, EventEmitter, inject, Input, OnDestroy, Output, QueryList, SimpleChanges, TemplateRef, ViewChild, ViewChildren, ViewContainerRef } from '@angular/core';
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
import { UserChannelActivityService } from '../../../../../core/services/userReadActivity.service';
import { UserReadActivity, UserReadActivityData } from '../../../../../core/models/userReadActivity.interface';
import { ProfileComponent } from '../../shared/profile/profile.component';
import { UserService } from '../../../../../core/services/user-service/user.service';
import { MessageContentComponent } from './message-content/message-content.component';
import { ThreadService } from '../../../../../core/services/thread-service/thread.service';

@Component({
  selector: 'app-message-box',
  imports: [EmojiComponent, EmojiPickerComponent, CommonModule, ProfileComponent, MessageContentComponent],
  standalone: true,
  templateUrl: './message-box.component.html',
  styleUrl: './message-box.component.scss'
})
export class MessageBoxComponent implements OnDestroy{
  @Input() channel: Channel | null = null;
  @Input() messageUser: User | null = null;
  @Input() currentUser: User | null = null;
  @Input() allUsers: User[] = [];
  @Input() allUsersWithOutCurrentUser: User[] = [];
  @Input() firstUnreadMessageId: string = '';
  
  @Output() threadMessageEmitter = new EventEmitter<Message>();

  private subscriptions = new Subscription();
  unsubscribeChannelMessages: (() => void) | null = null;
  unsubscribePrivateMessages: (() => void) | null = null;
  messageService = inject(MessageService);
  dateService = inject(DateService);
  threadService = inject(ThreadService);
  userService = inject(UserService);
  userChannelActivityService = inject(UserChannelActivityService);
  userChannelActivity: UserReadActivity | null = null;

  messages: Message[] = [];
  

  @ViewChild('emojiPickerTemplate') emojiPickerTemplate!: TemplateRef<any>;
  @ViewChildren('emojiTriggerAtLeft') emojiTriggerAtLeftRefs!: QueryList<ElementRef>;
  @ViewChildren('emojiTriggerAtRight') emojiTriggerAtRightRefs!: QueryList<ElementRef>;
  @ViewChildren('messageDiv') messageRefs!: QueryList<ElementRef>;
  
  emojiPickerOverlayRef!: OverlayRef;
  overlayService = inject(OverlayService);
  viewContainerRef = inject(ViewContainerRef);
  showProfileOverlay = false;

  clickedMessageIndex = -1;
  isNewInChat = true;

  showThread = inject(ThreadService);
  
  lastLoadedId: string | null = null;
  selectedUser: User | null = null;
  editingIndex = -1;


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['channel'] && changes['channel'].currentValue) {
      this.channel = changes['channel'].currentValue;
       this.isNewInChat = true;
       this.subChannelMessages();
    }

    if (changes['messageUser'] && changes['messageUser'].currentValue) {
      this.messageUser = changes['messageUser'].currentValue;
       this.isNewInChat = true;
       this.subPrivateMessages();
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

  buildFirstUnreadMessageId(activity: UserReadActivityData, messages: Message[]) {
      if(!activity?.updatedAt) return;

      const unreadMessages = messages.filter(
        msg =>
          msg.createdAt &&
          msg.createdAt.toMillis() > activity.updatedAt.toMillis() &&
          msg.authorID !== this.currentUser?.id
      );
      
      if (unreadMessages.length !==0 ) {
        if(this.isNewInChat) {
          this.firstUnreadMessageId = unreadMessages[0].id;
          this.isNewInChat = false;
        } else {
          this.firstUnreadMessageId = unreadMessages[unreadMessages.length - 1].id;
        }
        console.log('firstunreadmessageid:', this.firstUnreadMessageId);
        
      } else {
        this.firstUnreadMessageId = '';
      }
      
  }

  subChannelUserActivity(activityId: string) {
    if(!this.currentUser || !activityId) return;

    this.userChannelActivityService.getUserReadActivityByIDsOnce(this.currentUser.id, activityId, (data: any) => {
      const activities = [...data];
      if(activities.length === 1) {
        const activity = activities[0];
        if(activity.channelID == activityId && activity.userID == this.currentUser?.id) {
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
      if (element) element.nativeElement.scrollIntoView({block: 'start' });
    } else {
      this.scrollToBottom();
    }
  }

  scrollToBottom() {
    let element = this.messageRefs.get(this.messageRefs.length - 1);
    if (element) element.nativeElement.scrollIntoView({block: 'start' });
  }

  subPrivateMessages() {
    if(!this.currentUser || !this.messageUser) return;
    this.unsubscribeChannelMessages = this.messageService.getPrivateMessageOrderByCreatedAt(this.messageService.buildConversationID(this.currentUser.id, this.messageUser.id), (data) => {
      if(data.length == 0) {
        this.messages = [...data]; return;
      };

      if(!data[0].conversationID?.includes(this.messageUser?.id ?? '')) return;
      
      const isNew = this.isNewMessage(data, this.messageUser?.id || '');
      this.messages = [...data];

      if (isNew) {
        this.subChannelUserActivity(this.messageUser?.id || '');
      }
      this.scrollTo();
    })
  }

  subChannelMessages() {
    if(!this.currentUser || !this.channel) return;
    this.unsubscribeChannelMessages = this.messageService.getChannelMessageOrderByCreatedAt(this.channel.id, (data) => {
        if(data.length == 0) {
          this.messages = [...data]; return;
        };

        if(data[0].channelID !== this.channel?.id) return;
        
        const isNew = this.isNewMessage(data, this.channel?.id || '');
        this.messages = [...data];

        if (isNew) this.subChannelUserActivity(this.channel?.id || '');
         
    })
  }

  isNewMessage(newMessages: Message[], newLoadID: string) {
    if(!newLoadID) return;

    if(this.lastLoadedId !== newLoadID) {
      this.lastLoadedId = newLoadID;
      return true;
    } 

    const prevLastMsgId = this.messages.at(-1)?.id;
    const newLastMsgId = newMessages.at(-1)?.id;

    return prevLastMsgId !== newLastMsgId;
  }

  findURLByUserId(userID: string): string | ''{
    let user;
    if(this.allUsers.length == 0) {
      user = this.currentUser;
    } else {
      user = this.allUsers.find(u => u.id === userID) ?? null;
    }
    return user ? user.photoURL.startsWith('http') ? 'images/icons/avatars/avatar_1.png' : user.photoURL : '';
  }

  findUserByUserId(userID: string): string{
    const user = this.allUsers.find(u => u.id === userID);
    if(user) {
      if(user.id === this.currentUser?.id) {
        return 'Du';
      }
      else {
         return user?.displayName;
      }
    }
    return '';

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

  clickUserAvatar(userID: string){
    this.subscriptions.add(this.userService.getUserById(userID).subscribe({
        next: ((user) => {
          this.selectedUser = user;
          this.showProfileOverlay = true;
        })
      }));
  }

  onSaveEditing(msg: string, message: Message) {
    if(!this.currentUser) return; 
    let {id, ...messageData} = message;
    messageData.content = msg;
    this.subUpdateMessage(id, messageData);
  
  }

  clickEmoji(emojiStr: string, message: Message) {
    if(!this.currentUser) return; 
    const userName = this.currentUser.displayName;

    let {id, ...messageData} = message;

    this.updateMessageReaction(userName, emojiStr, messageData);
    this.subUpdateMessage(id, messageData);
  }

  clickEditMessage(index: number){
    this.clickedMessageIndex = index;
    this.editingIndex = index;
    if(this.messages[index].id === this.messages[this.messages.length - 1].id) {
      this.scrollToBottom();
    }
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
          if(id === this.messages[this.messages.length - 1].id) {
            this.scrollToBottom();
          }
        }
      })
    );
  }

  closeEmojiPickerOverlay() {
    this.clickedMessageIndex = -1;
    this.emojiPickerOverlayRef?.dispose();
  }

  renewSubscriptions() {
    if (this.unsubscribeChannelMessages) {
      this.unsubscribeChannelMessages();
      this.unsubscribeChannelMessages = null;
    }
    if (this.unsubscribePrivateMessages) {
      this.unsubscribePrivateMessages();
      this.unsubscribePrivateMessages = null;
    }
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();
  }

  ngOnDestroy(): void {
    this.unsubscribeChannelMessages?.();
    this.unsubscribePrivateMessages?.();
    this.subscriptions.unsubscribe();
  }

  showThreadContainer(index: number){
    this.threadService.show(); 
    this.threadService.setMessage(this.messages[index]);
  }

}
