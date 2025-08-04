import { Component, EventEmitter, Input, Output, ViewChild, inject } from '@angular/core';
import { User } from '../../../../../core/models/user.interface';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ThreadService } from '../../../../../core/services/thread-service/thread.service';
import { SidebarComponent } from '../../sidebar/sidebar.component';
import { UserService } from '../../../../../core/services/user-service/user.service';
import { AuthService } from '../../../../../core/services/auth-service/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-profile-ref',
  imports: [CommonModule],
  templateUrl: './profile-ref.component.html',
  styleUrl: './profile-ref.component.scss'
})
export class ProfileRefComponent {

  @Output() closeOverlayEmitter = new EventEmitter<void>();

  router = inject(Router);
  thradService = inject(ThreadService);
  userService = inject(UserService);
  authService = inject(AuthService);
  private subscriptions = new Subscription();
  operator: User | null = null;

  @ViewChild(SidebarComponent) sidebarComp!: SidebarComponent;

  @Input() currentUser: User | null = null;
  @Input() showOverlay = false;

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
    this.router.navigate(['/dashboard', 'users', this.currentUser?.id]);
    this.closeOverlay();
    setTimeout(() => {
      this.userService.allUsers$.subscribe(users => {
        this.userIncludeOperator = users;
      });
      if (this.currentUser) {
        const operatorIndex = this.userIncludeOperator.findIndex(u => u.id == this.operator?.id);
        this.userService.triggerUserClick(operatorIndex, this.currentUser);
        this.thradService.hide();
      }

    })
  }

  closeOverlay() {
    this.closeOverlayEmitter.emit();
  }


}
