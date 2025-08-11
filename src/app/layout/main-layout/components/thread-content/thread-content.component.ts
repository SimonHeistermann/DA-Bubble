import { Component, ElementRef, AfterViewInit, Input, TemplateRef, ViewChild, inject, ChangeDetectorRef, signal, effect, afterNextRender, runInInjectionContext, EnvironmentInjector, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toggleMarginLeft20Animation } from '../../animations/expand-collapse.animation';
import { ThreadService } from '../../../../core/services/thread-service/thread.service';
import { Message, ThreadMessage, ThreadReactions } from '../../../../core/models/message.interface';
import { User } from '../../../../core/models/user.interface';
import { ChannelData } from '../../../../core/models/channel.interface';
import { DateService } from '../../../../core/services/date.service';
import { UserService } from '../../../../core/services/user-service/user.service';
import { ActivatedRoute } from '@angular/router';
import { Timestamp } from 'firebase/firestore';
import { DataService } from '../../../../core/services/data-service/data.service';
import { Firestore } from '@angular/fire/firestore';
import { EmojiPickerComponent } from '../shared/emoji-picker/emoji-picker.component';
import { OverlayRef } from '@angular/cdk/overlay';
import { OverlayService } from '../../../../core/services/overlay.service';
import { ViewContainerRef } from '@angular/core';
import { ProfileRefComponent } from "./profile-ref/profile-ref.component";
import { DashboardResponsiveService } from '../../../../core/services/dashboard-responsive/dashboard-responsive.service';
import { InputContComponent } from "./input-cont/input-cont.component";

@Component({
  selector: 'app-thread-content',
  imports: [CommonModule, FormsModule, EmojiPickerComponent, ProfileRefComponent, InputContComponent],
  templateUrl: './thread-content.component.html',
  styleUrl: './thread-content.component.scss',
  animations: [toggleMarginLeft20Animation]
})
export class ThreadContentComponent implements AfterViewInit {

  @Input() showSelf: boolean = true;
  @Input() channel: ChannelData | null = null;
  @Input() allUsers: User[] = [];
  @Input() allUsersWithOutCurrentUser: User[] = [];
  @Input() selectedMessage: Message | null = null;

  showProfileOverlay = false;
  canShowProfile = false;
  hideEditBar: boolean = true;
  showEmoji: boolean = false;
  editingMode: boolean = false;
  profileRefUser: User | null = null;
  messageUser: User | null = null;
  currentUser: User | null = null;
  emojiPickerIndex: number | null = null;
  editingIndex: number | null = null;
  formattedDate: string = '';
  showHeader: 'direct' | 'channel' | 'new' = 'channel';

  currentUserIndex = -1;
  emojis: {}[] = [];
  smallScreen = false;
  isTablet = false;
  isMobile = false;


  emojiPickerOverlayRef!: OverlayRef;
  threadService = inject(ThreadService);
  dataService = inject(DataService);
  dateService = inject(DateService);
  userService = inject(UserService);
  firestore = inject(Firestore);
  route = inject(ActivatedRoute);
  overlayService = inject(OverlayService);
  viewContainerRef = inject(ViewContainerRef);
  dashboardResponsive = inject(DashboardResponsiveService);
  changeDetectorRef = inject(ChangeDetectorRef);

  @ViewChild('inputCont') inputCont!: InputContComponent;
  @ViewChild('containerBody') containerBody!: ElementRef;
  @ViewChild('threadContainer') threadContainer!: ElementRef<HTMLElement>;
  @ViewChild('emojiPickerTemplate') emojiPickerTemplate !: TemplateRef<any>;

  platformId = inject(PLATFORM_ID);
  injector = inject(EnvironmentInjector);

  threadMessages = signal(this.threadService.currentThreadMessages);

  constructor() {

    this.responsiveSubs();

    this.threadServiceSubs();

    this.effectScroll();
  }


  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      runInInjectionContext(this.injector, () => {
        afterNextRender(() => this.scrollToBottom());
      });
    }
  }

  responsiveSubs() {
    this.dashboardResponsive.smallScreen$.subscribe(smallScreen => {
      this.smallScreen = smallScreen;
    })
    this.dashboardResponsive.isTablet$.subscribe(isTablet => {
      this.isTablet = isTablet;
    })
    this.dashboardResponsive.isMobile$.subscribe(isMobile => {
      this.isMobile = isMobile;
    })
  }

  threadServiceSubs() {
    this.threadService.currentThreadMessages$.subscribe(msgs => {
      this.threadMessages.set(msgs);
      this.threadService.currentThreadMessages = msgs;
    });

    this.threadService.message$.subscribe(msg => {
      this.selectedMessage = msg;
    });

  }

  effectScroll() {
    effect(() => {
      const msgs = this.threadMessages();
      if (msgs.length > 0) {
        runInInjectionContext(this.injector, () => {
          afterNextRender(() => this.scrollToBottom());
        });
      }
    });
    this.scrollToBottom();
  }

  scrollToBottom() {
    let element = this.threadContainer?.nativeElement;
    if (element) {
      setTimeout(() => {
        element.scrollTop = element.scrollHeight;
      }, 0);
    }
  }
  getReactionsArray() {
    const reaction = this.selectedMessage?.reactions ?? {};
    return Object.entries(reaction).map(([emoji, data]) => ({
      emoji,
      users: data.users
    }));
  }

  formatDate(rawDate: Timestamp | Timestamp) {
    if (rawDate) {
      this.formattedDate = this.dateService.getHoursAndMinutes(rawDate);
    }
  }

  getRows(text: string): number {
    return Math.max(Math.ceil(text.length / 35));
  }

  getCols(text: string): number {
    return Math.max(Math.ceil(text.length / 20));
  }

  showProfile(user: User) {
    this.canShowProfile = true;
    this.profileRefUser = user;
  }

  hideThreadContainer() {
    this.threadService.hide();
    this.dashboardResponsive.setOpenMain(true);
  }

  buildMessageData(msg: string): ThreadMessage {
    return {
      messageId: this.selectedMessage?.id ?? '',
      authorId: this.threadService.currentUser?.id ?? '',
      content: msg,
      createdAt: Timestamp.now(),
      editedAt: Timestamp.now(),
      isEdited: false,
      mentions: this.threadService.mentions,
      reactions: [] as ThreadReactions[],
    };
  }

  sendMessage(msg: string) {
    if (!msg.trim() || !this.selectedMessage) return;
    if (this.selectedMessage) {
      this.selectedMessage.threadCount++;
      this.dataService.updateDocument('messages', this.selectedMessage.id, this.selectedMessage);
      this.dataService.addDocument('threadmessage', this.buildMessageData(msg)).then(() => {
        this.threadService.setMessage(this.selectedMessage!);
        this.scrollToBottom();
      });
    }
  }

  showEmojiPicker(index: number) {
    this.emojiPickerIndex = index;
    this.emojiPickerOverlayRef = this.overlayService.openTemplateOverlay(
      this.containerBody,
      this.emojiPickerTemplate,
      this.viewContainerRef
    );

    this.emojiPickerOverlayRef.backdropClick().subscribe(() => this.emojiPickerOverlayRef.dispose());
  }

  shouldShowDateDivider(index: number) {
    if (index === 0) return true;

    const current = this.threadService.currentThreadMessages[index];
    const previous = this.threadService.currentThreadMessages[index - 1];
    if (!current.createdAt || !previous.createdAt) return false;

    const currentDate = this.dateService.toDate(current.createdAt);
    const previousDate = this.dateService.toDate(previous.createdAt);

    return !this.dateService.isSameDay(currentDate, previousDate);
  }

  onSelectedEmoji(emojiStr: string) {
    if (this.emojiPickerIndex == null) return;

    const index = this.emojiPickerIndex;
    const currentMessage = this.threadService.currentThreadMessages[index];
    const currentUser = this.threadService.currentUser?.displayName ?? '';

    if (!Array.isArray(currentMessage.reactions)) {
      currentMessage.reactions = [];
    }

    this.handleSameReaction(currentMessage, currentUser, emojiStr);
  }

  handleSameReaction(currentMessage: ThreadMessage, currentUser: string, emojiStr: string): void {

    const existingReaction = currentMessage.reactions.find(reaction => reaction.emojiStr === emojiStr);

    if (existingReaction) {
      if (!existingReaction.user.includes(currentUser)) {
        existingReaction.user.push(currentUser);
      } else {
        existingReaction.user.splice(existingReaction.user.indexOf(currentUser), 1);
        if (existingReaction.user.length == 0) {
          currentMessage.reactions.splice(currentMessage.reactions.indexOf(existingReaction), 1);
        }
      }
    } else { currentMessage.reactions.push({ emojiStr, user: [currentUser] }); }

    this.updateEmoji(currentMessage);
  }

  updateEmoji(currentMessage: ThreadMessage) {

    if (currentMessage.id) {
      this.dataService.updateDocument('threadmessage', currentMessage.id,
        { reactions: currentMessage.reactions })
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

  breakEditing() {
    this.editingIndex = null;
    this.editingMode = false;
  }

  saveEditing(index: number, content: string) {
    this.edittedMessage(content, index);
    this.editingIndex = null;
    this.editingMode = false;

  }
  
  edittedMessage(content: string, index: number) {
    this.threadService.currentThreadMessages[index].content = content;
    this.threadService.currentThreadMessages[index].editedAt = Timestamp.now();
    const messageId = this.threadService.currentThreadMessages[index].id;
    if (typeof messageId === 'string') {
      this.dataService.updateDocument('threadmessage', messageId,
        { content: content, editedAt: Timestamp.now() })
    }
  }
}