import { Component } from '@angular/core';
import { faceEmojis } from './emojis';

@Component({
  selector: 'app-emoji-picker',
  imports: [],
  templateUrl: './emoji-picker.component.html',
  styleUrl: './emoji-picker.component.scss'
})
export class EmojiPickerComponent {
  emojis: string[] = faceEmojis;
}
