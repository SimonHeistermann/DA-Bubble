import { Component } from '@angular/core';
import { EmojiComponent } from '../../shared/emoji/emoji.component';
import { EmojiPickerComponent } from '../../shared/emoji-picker/emoji-picker.component';

@Component({
  selector: 'app-message-box',
  imports: [EmojiComponent, EmojiPickerComponent],
  standalone: true,
  templateUrl: './message-box.component.html',
  styleUrl: './message-box.component.scss'
})
export class MessageBoxComponent {

}
