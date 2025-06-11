import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from '../../../../../core/models/user.interface';
import { slideFadeInAnimation } from '../../../animations/slide.animation';
import { ProfileComponent } from '../../shared/profile/profile.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-channel-user-list',
  imports: [ProfileComponent, CommonModule],
  standalone: true,
  templateUrl: './channel-user-list.component.html',
  styleUrl: './channel-user-list.component.scss',
  animations: [slideFadeInAnimation]
})
export class ChannelUserListComponent {
  @Input() currentUser: User | null = null;
  @Input() allChannelUsers: User[] = [];

  @Output() closeOverlayEmitter = new EventEmitter<void>();
  @Output() addMemberEmitter = new EventEmitter<void>();

  showProfileOverlay = true;

  closeOverlay() {
    this.closeOverlayEmitter.emit();
  }

  showProfile(){
    console.log(111);
    
    this.showProfileOverlay = true;
  }

  addMember() {
    this.addMemberEmitter.emit();
  }
}
