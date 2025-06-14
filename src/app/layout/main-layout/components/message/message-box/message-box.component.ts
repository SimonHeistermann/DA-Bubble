import { Component, ElementRef, inject, Input, OnDestroy, OnInit, QueryList, SimpleChanges, TemplateRef, ViewChild, ViewChildren, ViewContainerRef } from '@angular/core';
import { EmojiComponent } from '../../shared/emoji/emoji.component';
import { EmojiPickerComponent } from '../../shared/emoji-picker/emoji-picker.component';
import { Channel } from '../../../../../core/models/channel.interface';
import { User } from '../../../../../core/models/user.interface';
import { Subscription } from 'rxjs';
import { Message } from '../../../../../core/models/message.interface';
import { MessageService } from '../../../../../core/services/message.service';
import { ConnectedPosition, OverlayRef } from '@angular/cdk/overlay';
import { OverlayService } from '../../../../../core/services/overlay.service';

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

  @ViewChild('emojiPickerTemplate') emojiPickerTemplate!: TemplateRef<any>;
  @ViewChildren('emojiTriggerAtLeft') emojiTriggerAtLeftRefs!: QueryList<ElementRef>;
  @ViewChildren('emojiTriggerAtRight') emojiTriggerAtRightRefs!: QueryList<ElementRef>;
  
  emojiPickerOverlayRef!: OverlayRef;
  overlayService = inject(OverlayService);
  viewContainerRef = inject(ViewContainerRef);

  clickedMessageIndex = -1;
  
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

  showEmojiPicker(index: number, pos: 'left' | 'right') {
    const triggerRef = pos === 'right' ? this.emojiTriggerAtRightRefs.get(index) : this.emojiTriggerAtLeftRefs.get(index);
    if (!triggerRef) return;

    this.clickedMessageIndex = index;

    const positions:ConnectedPosition[] = pos === 'right'
    ? [
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' }
      ]
    : [
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'top' }
      ];
    
    this.emojiPickerOverlayRef = this.overlayService.openTemplateOverlay(
      triggerRef, 
      this.emojiPickerTemplate, 
      this.viewContainerRef, 
      positions
    );

    this.emojiPickerOverlayRef.backdropClick().subscribe(() => this.closeEmojiPickerOverlay());
  }

  closeEmojiPickerOverlay() {
    this.clickedMessageIndex = -1;
    this.emojiPickerOverlayRef?.dispose();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  
}
