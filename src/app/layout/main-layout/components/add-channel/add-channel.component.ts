import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-channel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-channel.component.html',
  styleUrl: './add-channel.component.scss'
})
export class AddChannelComponent {

  @Output() closeOverlay = new EventEmitter<void>();
  showChannelNameError = false;
  channelName: string = '';

  clickClose() {
    this.closeOverlay.emit();
  }

  clickCreateChannel() {
    
  }
}
