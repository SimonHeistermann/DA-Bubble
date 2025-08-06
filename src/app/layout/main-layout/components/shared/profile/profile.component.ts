import { Component, EventEmitter, Input, Output, inject, ViewChild } from '@angular/core';
import { User } from '../../../../../core/models/user.interface';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../../../core/services/user-service/user.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth-service/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-profile',
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
  @Output() closeOverlayEmitter = new EventEmitter<void>();

  @Input() currentUser: User | null = null;
  @Input() operator: User | null = null;
  @Input() showOverlay = false;

  router = inject(Router);
  userService = inject(UserService);
  authService = inject(AuthService);

  private subscriptions = new Subscription();

  userIncludeOperator: User[] = [];

  ngOnInit() {
    this.subCurrentUser();
  }

  subCurrentUser() {
    const authUser = this.authService.currentUser;
    if (authUser) {
      this.userService.loadCurrentUser(authUser.uid);
    }
    this.subscriptions.add(
      this.userService.currentUser$.subscribe(user => {
        this.operator = user;
      })
    );
  }


  openUserChat() {
    this.userService.allUsers$.subscribe(users => {
      this.userIncludeOperator = users;
    });
    if (this.currentUser) {
      const operatorIndex = this.userIncludeOperator.findIndex(u => u.id == this.operator?.id);
      this.userService.triggerUserClick(operatorIndex, this.currentUser);
      this.router.navigate(['/dashboard', 'users', this.currentUser?.id]);
    }
  }

  closeOverlay() {
    this.closeOverlayEmitter.emit();
  }
}
