import { Component, ElementRef, Input, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toggleMarginLeft20Animation } from '../../animations/expand-collapse.animation';
import { ThreadService } from '../../../../core/services/thread-service/thread.service';
import { InputComponent } from '../shared/input/input.component';
import { Message, ThreadMessage } from '../../../../core/models/message.interface';
import { User } from '../../../../core/models/user.interface';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { FirebaseService } from '../../../../core/services/firebase-service/firebase.service';
import { ChannelData } from '../../../../core/models/channel.interface';
import { ChannelService } from '../../../../core/services/channel.service';
import { DateService } from '../../../../core/services/date.service';
import { UserService } from '../../../../core/services/user-service/user.service';
import { MessageService } from '../../../../core/services/message.service';
import { Subscription } from 'rxjs';
import { forkJoin } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { Timestamp } from 'firebase/firestore';
import { DataService } from '../../../../core/services/data-service/data.service';
import { Firestore } from '@angular/fire/firestore';

@Component({
  selector: 'app-thread-content',
  imports: [ InputComponent, CommonModule ],
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

  formattedDate: string = '';
  showHeader: 'direct' | 'channel' | 'new' = 'channel';
  messageUser: User | null = null;
  currentUser: User | null = null;

  @ViewChild('containerBody') containerBody!: ElementRef;

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
    if (rawDate){
    this.formattedDate = this.dateService.getHoursAndMinutes(rawDate);
 }
  }

  hideThreadContainer() {
    this.threadService.hide();
  }

readMessage() {
  console.log(`ReadMessage called`);
  
  }

  buildMessageData(msg: string): ThreadMessage {
      return {
        messageId: this.selectedMessage?.id ?? '',
        authorId: this.threadService.currentUser?.id ?? '',
        content: msg,
        createdAt: this.selectedMessage?.createdAt ?? Timestamp.now(),
        editedAt: this.selectedMessage?.updatedAt ?? Timestamp.now(),
        isEdited: false,
        mentions: [''],
        reactions: {},
      };
    }

  sendMessage(msg: string) {
  console.log(msg);

  console.log(this.containerBody);
  
  this.buildMessageData(msg);
  if (this.selectedMessage) {
    this.selectedMessage.threadCount++;
    console.log(this.selectedMessage.id);
    this.dataService.updateDocument('messages', this.selectedMessage.id, this.selectedMessage);
    this.dataService.addDocument('threadmessage', this.buildMessageData(msg));
  }
  }


}
