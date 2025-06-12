import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from '../../../../../core/models/user.interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
  @Output() closeOverlayEmitter = new EventEmitter<void>(); 

  @Input() currentUser: User | null = null;
  @Input() showOverlay = false;

  closeOverlay(){
      this.closeOverlayEmitter.emit();
  }
}
