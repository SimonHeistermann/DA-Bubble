import { Component, inject, OnDestroy, Input } from '@angular/core';
import { User } from '../../../../core/models/user.interface';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth-service/auth.service';
import { UserService } from '../../../../core/services/user-service/user.service';
import { ToggleComponent } from "./toggle/toggle.component";
import { Dialog} from '@angular/cdk/dialog';


@Component({
  selector: 'app-main-header',
  standalone: true,
  imports: [],
  templateUrl: './main-header.component.html',
  styleUrl: './main-header.component.scss'
})
export class MainHeaderComponent implements OnDestroy {

  @Input() allChannelUsers: User[] = [];

  currentUser: User | null = null;
  private subscriptions = new Subscription();
  showProfileOverlay = false;
  currentUserIndex = -1;
  selectedUser: User | null = null;
  authService = inject(AuthService);
  userService = inject(UserService);
  dialog = inject(Dialog);

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
        this.currentUser = user;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  showProfile( user: User) {
    console.log(user);
    this.dialog.open(ToggleComponent, {
      data: {
        user: user
      },
      panelClass: 'profile-dialog',
    });
    this.showProfileOverlay = true;
  }


}
