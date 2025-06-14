import { Component, EventEmitter, Output } from '@angular/core';
import { emojis } from '../emoji/emoji';
import { SimplebarAngularModule } from 'simplebar-angular';

@Component({
  selector: 'app-emoji-picker',
  imports: [SimplebarAngularModule],
  standalone: true,
  templateUrl: './emoji-picker.component.html',
  styleUrl: './emoji-picker.component.scss'
})
export class EmojiPickerComponent {
  @Output() closeOverlayEmitter = new EventEmitter<void>();

  emoji = '';
  allEmoji = [...emojis];

  closeOverlay(){
    this.closeOverlayEmitter.emit();
  }
}
