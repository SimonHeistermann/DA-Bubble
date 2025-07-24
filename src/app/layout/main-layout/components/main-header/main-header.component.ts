import { Component, inject, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../../core/models/user.interface';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth-service/auth.service';
import { UserService } from '../../../../core/services/user-service/user.service';
import { DashboardResponsiveService } from '../../../../core/services/dashboard-responsive/dashboard-responsive.service'
import { ToggleComponent } from "./toggle/toggle.component";
import { MainLayoutContentComponent } from '../../main-layout-content/main-layout-content.component';
import { Dialog} from '@angular/cdk/dialog';
import { Router } from '@angular/router';


@Component({
  selector: 'app-main-header',
  standalone: true,
  imports: [ CommonModule ],
  templateUrl: './main-header.component.html',
  styleUrl: './main-header.component.scss'
})
export class MainHeaderComponent implements OnDestroy {

  @Input() allChannelUsers: User[] = [];
  router = inject(Router);

  currentUser: User | null = null;
  private subscriptions = new Subscription();
  showProfileOverlay = false;
  currentUserIndex = -1;
  selectedUser: User | null = null;
  authService = inject(AuthService);
  userService = inject(UserService);
  dialog = inject(Dialog);
  mainLayoutContentComponent = inject(MainLayoutContentComponent);

  isMobile = false;
  isTablet = false;

  constructor(public dashboardResponsive: DashboardResponsiveService) {
     this.dashboardResponsive.isTablet$.subscribe(isTablet => {
      this.isTablet = isTablet;
    })
    this.dashboardResponsive.isMobile$.subscribe(isMobile => {
      this.isMobile = isMobile;
    })

  }

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
  this.dialog.open(ToggleComponent, {
    data: { user },
    panelClass: 'profile-dialog',
  });
    this.showProfileOverlay = true;
  }

  navigateToMain(){
    this.dashboardResponsive.setOpenSidebar(true);
  }


}
