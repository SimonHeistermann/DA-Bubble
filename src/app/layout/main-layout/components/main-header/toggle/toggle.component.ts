import { Component, Input, Inject } from '@angular/core';
import { User } from '../../../../../core/models/user.interface';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { ActualProfileComponent } from "./actual-profile/actual-profile.component";

@Component({
  selector: 'app-toggle',
  imports: [ActualProfileComponent],
  templateUrl: './toggle.component.html',
  styleUrl: './toggle.component.scss',
})
export class ToggleComponent {


   @Input() allChannelUsers: User[] = [];

  currentUser: User | null = null;

  showProfileOverlay = false;
  currentUserIndex = -1;

  constructor(@Inject(DIALOG_DATA) public data: { user: User }
  ) {
      this.currentUser = data.user;
  }

  showProfile() {
    this.showProfileOverlay = true;
  }

}
