import { AfterContentInit, Component, ElementRef, inject, Input, OnInit } from '@angular/core';
import { emojiMap } from './emoji.map';

@Component({
  selector: 'app-emoji',
  imports: [],
  standalone: true,
  templateUrl: './emoji.component.html',
  styleUrl: './emoji.component.scss'
})
export class EmojiComponent implements AfterContentInit {
  @Input() emoji: string = '';
  emojiPath: string = '';
  basePath = 'icons/emojis/';
  emojiMapWithPath: Record<string, string>;

  el = inject(ElementRef);

  constructor() {
    this.emojiMapWithPath = Object.fromEntries(
      Object.entries(emojiMap).map(([key, file]) => [key, this.basePath + file])
    );
  }

  ngAfterContentInit(): void {
    const projected = this.el.nativeElement.textContent?.trim();
    const emojiKey = this.emoji ||  projected || '';

    this.emojiPath = this.emojiMapWithPath[emojiKey];
    
  }
}
