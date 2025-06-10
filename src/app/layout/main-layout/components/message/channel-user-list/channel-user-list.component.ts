import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from '../../../../../core/models/user.interface';
import { slideFadeInAnimation } from '../../../animations/slide.animation';

@Component({
  selector: 'app-channel-user-list',
  imports: [],
  standalone: true,
  templateUrl: './channel-user-list.component.html',
  styleUrl: './channel-user-list.component.scss',
  animations: [slideFadeInAnimation]
})
export class ChannelUserListComponent {
  @Input() currentUser: User | null = null;
  @Input() allUsers: User[] = [];

  @Output() closeOverlayEmitter = new EventEmitter<void>();
  @Output() addMemberEmitter = new EventEmitter<void>();

  closeOverlay() {
    this.closeOverlayEmitter.emit();
  }

  addMember() {
    this.addMemberEmitter.emit();
  }
}
