import { Component, ElementRef, Input, TemplateRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toggleMarginLeft20Animation } from '../../animations/expand-collapse.animation';
import { ThreadService } from '../../../../core/services/thread-service/thread.service';
import { InputComponent } from '../shared/input/input.component';
import { Message, ThreadMessage, ThreadReactions } from '../../../../core/models/message.interface';
import { User } from '../../../../core/models/user.interface';
import { FirebaseService } from '../../../../core/services/firebase-service/firebase.service';
import { ChannelData } from '../../../../core/models/channel.interface';
import { ChannelService } from '../../../../core/services/channel.service';
import { DateService } from '../../../../core/services/date.service';
import { UserService } from '../../../../core/services/user-service/user.service';
import { MessageService } from '../../../../core/services/message.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { Timestamp } from 'firebase/firestore';
import { DataService } from '../../../../core/services/data-service/data.service';
import { Firestore } from '@angular/fire/firestore';
import { EmojiPickerComponent } from '../shared/emoji-picker/emoji-picker.component';
import { OverlayRef } from '@angular/cdk/overlay';
import { OverlayService } from '../../../../core/services/overlay.service';
import { ViewContainerRef } from '@angular/core';
import { ProfileRefComponent } from "./profile-ref/profile-ref.component";
@Component({
  selector: 'app-thread-content',
  imports: [InputComponent, CommonModule, FormsModule, EmojiPickerComponent, ProfileRefComponent],
  templateUrl: './thread-content.component.html',
  styleUrl: './thread-content.component.scss',
  animations: [toggleMarginLeft20Animation]
})
export class ThreadContentComponent {

  @Input() showSelf: boolean = true;
  @Input() channel: ChannelData | null = null;
  @Input() allUsers: User[] = [];
  @Input() allUsersWithOutCurrentUser: User[] = [];
  @Input() selectedMessage: Message | null = null;


  hideEditBar: boolean = true;
  showEmoji: boolean = false;
  editingMode: boolean = false;
  currentUserIndex = -1;
  profileRefUser: User | null = null;

  emojiPickerOverlayRef!: OverlayRef;
  overlayService = inject(OverlayService);
  viewContainerRef = inject(ViewContainerRef);
  showProfileOverlay = false;
  canShowProfile = false;

  formattedDate: string = '';
  showHeader: 'direct' | 'channel' | 'new' = 'channel';
  messageUser: User | null = null;
  currentUser: User | null = null;
  emojiPickerIndex: number | null = null;
  editingIndex: number | null = null;

  @ViewChild('containerBody') containerBody!: ElementRef;
  @ViewChild('emojiPickerTemplate') emojiPickerTemplate !: TemplateRef<any>;

  private subscriptions = new Subscription();
  threadService = inject(ThreadService);
  channelService = inject(ChannelService);
  dataService = inject(DataService);
  dateService = inject(DateService);
  userService = inject(UserService);
  messageService = inject(MessageService);
  authService = inject(FirebaseService);
  firestore = inject(Firestore);
  route = inject(ActivatedRoute);


  ngOnInit() {
    this.threadService.message$.subscribe(msg => {
      this.selectedMessage = msg;
    });
  } 


  formatDate(rawDate: Timestamp | Timestamp) {
    if (rawDate) {
      this.formattedDate = this.dateService.getHoursAndMinutes(rawDate);
    }
  }

  hideThreadContainer() {
    this.threadService.hide();
  }

  buildMessageData(msg: string): ThreadMessage {
    return {
      messageId: this.selectedMessage?.id ?? '',
      authorId: this.threadService.currentUser?.id ?? '',
      content: msg,
      createdAt: this.selectedMessage?.createdAt ?? Timestamp.now(),
      editedAt: this.selectedMessage?.updatedAt ?? Timestamp.now(),
      isEdited: false,
      mentions: this.threadService.mentions,
      reactions: [] as ThreadReactions[],
    };
  }

  sendMessage(msg: string) {
    this.buildMessageData(msg);
    if (this.selectedMessage) {
      this.selectedMessage.threadCount++;
      this.dataService.updateDocument('messages', this.selectedMessage.id, this.selectedMessage);
      this.dataService.addDocument('threadmessage', this.buildMessageData(msg)).then(() => {
        this.threadService.setMessage(this.selectedMessage!);
      });
    }
  }

  showEmojiPicker(event: MouseEvent, index: number) {
    console.log(`showEmojiPicker called`, event.currentTarget as HTMLElement);
    this.emojiPickerIndex = index;
    console.log(this.emojiPickerIndex);


    this.emojiPickerOverlayRef = this.overlayService.openTemplateOverlay(
      this.containerBody,
      this.emojiPickerTemplate,
      this.viewContainerRef
    );

    this.emojiPickerOverlayRef.backdropClick().subscribe(() => this.emojiPickerOverlayRef.dispose());
  }

  emojis: {}[] = [];

  onSelectedEmoji(emojiStr: string) {
    if (this.emojiPickerIndex == null) return;
    const index = this.emojiPickerIndex;
    const currentMessage = this.threadService.currentThreadMessages[index];
    const user = this.threadService.currentUser?.displayName ?? '';
    if (!Array.isArray(currentMessage.reactions)) {
      currentMessage.reactions = [];
    }
    currentMessage.reactions.push({ emojiStr, user });
    console.log(`currentMessage called`, currentMessage.id);
    console.log(`onSelectedEmoji called`, emojiStr, user);
    // currentMessage.reactions = this.emojis;
    console.log(`onSelectedEmoji called`, currentMessage.reactions);
    console.log(`onSelectedEmoji called`, currentMessage.id);
    if (currentMessage.id) {
      this.dataService.updateDocument('threadmessage', currentMessage.id,
        { reactions: currentMessage.reactions }).then(() => {
          console.log(`Reaction updated successfully`);
        });
    } else {
      console.error('currentMessage.id is undefined, cannot update document.');
    }
    this.emojiPickerOverlayRef?.dispose();

  }

  closeEmojiPickerOverlay() {
    this.emojiPickerOverlayRef?.dispose();
  }

  editMessage(index: number) {
    this.editingIndex = index;
    if (!this.editingMode) {
      this.editingMode = true
    } else {
      this.editingMode = false;
    }
    
  }

  breakEditing(index: number) {
    this.editingIndex = null;
    this.editingMode = false;
  }

  saveEditing(index: number, content: string) {
    this.edittedMessage(content, index);
    this.editingIndex = null;
    this.editingMode = false;
    
  }
  edittedMessage(content: string, index: number) {
    // debugger;
    console.log(index, `ReadMessage called`, content);
    this.threadService.currentThreadMessages[index].content = content;
    this.threadService.currentThreadMessages[index].editedAt = Timestamp.now();
    console.log(this.threadService.currentThreadMessages[index]);
    const messageId = this.threadService.currentThreadMessages[index].id;
    if (typeof messageId === 'string') {
      this.dataService.updateDocument('threadmessage', messageId,
        { content: content, editedAt: Timestamp.now() }).then(() => {
          console.log(`Message updated successfully`);
      });
    } else {
      console.error('Message ID is undefined, cannot update document.');
    }
  }

showProfile(user: User) {
   this.canShowProfile = true;
   this.profileRefUser = user;
}

}
