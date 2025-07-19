import { Component, Input, Inject } from '@angular/core';
import { User } from '../../../../../core/models/user.interface';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { ActualProfileComponent } from "./actual-profile/actual-profile.component";
import { routes } from '../../../../../app.routes';
import { NoAuthGuard } from '../../../../../core/guards/no-auth-guard/no-auth.guard';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth-service/auth.service';

@Component({
  selector: 'app-toggle',
  imports: [ActualProfileComponent],
  templateUrl: './toggle.component.html',
  styleUrl: './toggle.component.scss',
})
export class ToggleComponent {


  @Input() allChannelUsers: User[] = [];
  @Input() routes = routes;

  currentUser: User | null = null;

  showProfileOverlay = false;
  currentUserIndex = -1;

  constructor( private router: Router, private authService: AuthService, @Inject(DIALOG_DATA) public data: { user: User }
  ) {
    this.currentUser = data.user;
  }

  showProfile() {
    this.showProfileOverlay = true;
  }

  logOut() {
    this.authService.signOut().subscribe();
  }  


}
