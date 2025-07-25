import { Component, Input, Inject, ViewChild, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../../../core/models/user.interface';
import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ActualProfileComponent } from "./actual-profile/actual-profile.component";
import { routes } from '../../../../../app.routes';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth-service/auth.service';
import { DashboardResponsiveService } from '../../../../../core/services/dashboard-responsive/dashboard-responsive.service';

@Component({
  selector: 'app-toggle',
  imports: [ActualProfileComponent, CommonModule],
  templateUrl: './toggle.component.html',
  styleUrl: './toggle.component.scss',
})
export class ToggleComponent {


  @Input() allChannelUsers: User[] = [];
  @Input() routes = routes;
  @ViewChild(ActualProfileComponent) actualProfileComp!: ActualProfileComponent;
  
  // @Output() closeOverlayEmitter = new EventEmitter<void>();

  currentUser: User | null = null;

  showProfileOverlay = false;
  isTablet = false;
  isMobile = false;
  currentUserIndex = -1;

  constructor( private router: Router, 
               private authService: AuthService, 
              @Inject(DIALOG_DATA) public data: { user: User },
              public dashboardResponsive: DashboardResponsiveService,
              private dialogRef: DialogRef<{ action: string }>
  ) {
    this.currentUser = data.user;
    this.dashboardResponsive.isTablet$.subscribe(isTablet => {
      this.isTablet = isTablet;
    })
     this.dashboardResponsive.isMobile$.subscribe(isMobile => {
      this.isMobile = isMobile;
    })
  }

  showProfile() {
    this.showProfileOverlay = true;
  }

  logOut() {
    this.dialogRef.close({action: 'logout'});
    this.authService.signOut().subscribe();
  }  


}
