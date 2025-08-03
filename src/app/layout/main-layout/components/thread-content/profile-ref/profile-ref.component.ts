import { Component, EventEmitter, Input, Output, ViewChild, inject } from '@angular/core';
import { User } from '../../../../../core/models/user.interface';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ThreadService } from '../../../../../core/services/thread-service/thread.service';
import { SidebarComponent } from '../../sidebar/sidebar.component';
import { UserService } from '../../../../../core/services/user-service/user.service';

@Component({
  selector: 'app-profile-ref',
  imports: [ CommonModule ],
  templateUrl: './profile-ref.component.html',
  styleUrl: './profile-ref.component.scss'
})
export class ProfileRefComponent {

   @Output() closeOverlayEmitter = new EventEmitter<void>(); 

   router = inject(Router);
   thradService = inject(ThreadService);
   userService = inject(UserService);

   @ViewChild(SidebarComponent) sidebarComp!: SidebarComponent;

  @Input() currentUser: User | null = null;
  @Input() showOverlay = false;

  openUserChat(){
      if (this.currentUser) {
    this.userService.triggerUserClick('currentUser', this.currentUser);
    this.router.navigate(['/dashboard', 'users', this.currentUser?.id]);
    this.thradService.hide();
    this.closeOverlay();
    }
  }

  closeOverlay(){
      this.closeOverlayEmitter.emit();
  }


}
