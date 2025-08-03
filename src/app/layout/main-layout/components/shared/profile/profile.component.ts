import { Component, EventEmitter, Input, Output, inject, ViewChild } from '@angular/core';
import { User } from '../../../../../core/models/user.interface';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../../../core/services/user-service/user.service';
import { Router } from '@angular/router';

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

  router = inject(Router);
  userService = inject(UserService);

  openUserChat(){
    if (this.currentUser) {
    this.userService.triggerUserClick('currentUser', this.currentUser);
    this.router.navigate(['/dashboard', 'users', this.currentUser?.id]);
    }
  }

  closeOverlay(){
      this.closeOverlayEmitter.emit();
  }
}
