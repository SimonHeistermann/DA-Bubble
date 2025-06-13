import { Component, inject, Input, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { EmojiComponent } from '../../shared/emoji/emoji.component';
import { EmojiPickerComponent } from '../../shared/emoji-picker/emoji-picker.component';
import { Channel } from '../../../../../core/models/channel.interface';
import { User } from '../../../../../core/models/user.interface';
import { Subscription } from 'rxjs';
import { Message } from '../../../../../core/models/message.interface';
import { MessageService } from '../../../../../core/services/message.service';

@Component({
  selector: 'app-message-box',
  imports: [EmojiComponent, EmojiPickerComponent],
  standalone: true,
  templateUrl: './message-box.component.html',
  styleUrl: './message-box.component.scss'
})
export class MessageBoxComponent implements OnInit, OnDestroy{
  @Input() channel: Channel | null = null;
  @Input() currentUser: User | null = null;

  private subscriptions = new Subscription();
  messageService = inject(MessageService);

  messages: Message[] = [];
  
  ngOnInit(): void {
   
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['channel'] && changes['channel'].currentValue) {
      this.channel = changes['channel'].currentValue;
      this.subMessages();
    }
  }

  subMessages() {
    if(!this.currentUser || !this.channel) return;

    console.log(this.channel.id);
    
    this.subscriptions.add(
      this.messageService.getChannelMessageOrderByCreatedAt(this.channel.id, (data) => {
        this.messages.length=0;
        this.messages.push(...data);
        console.log('sub messages', data);
        
        if (this.messages.length > 0) {
          console.log('messaged updatged', this.messages);
        }
      })
    );

  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  
}
