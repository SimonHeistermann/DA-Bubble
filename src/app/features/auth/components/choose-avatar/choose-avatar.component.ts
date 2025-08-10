import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../../core/services/auth-service/auth.service';
import { AuthUser } from '../../../../core/models/auth.interface';
import { Avatar } from '../../../../core/models/avatar.interface';
import { OverlayComponent } from '../notifications/overlay/overlay.component';
import { ReactiveFormsModule } from '@angular/forms';
import { SuccessNotificationComponent } from '../notifications/success-notification/success-notification.component';
import { ErrorNotificationComponent } from '../notifications/error-notification/error-notification.component';
import { NotificationService } from '../../../../core/services/notification-service/notification.service';


@Component({
  selector: 'app-choose-avatar',
  standalone: true,
  imports: [
    CommonModule, OverlayComponent, ReactiveFormsModule, 
    SuccessNotificationComponent, ErrorNotificationComponent
  ],
  templateUrl: './choose-avatar.component.html',
  styleUrls: ['./choose-avatar.component.scss']
})
export class ChooseAvatarComponent implements OnInit, OnDestroy {
  selectedAvatarId: string | null = null;
  loading = false;
  currentUser: AuthUser | null = null;
  userName = '';
  
  private destroy$ = new Subject<void>();

  avatars: Avatar[] = [
    { id: 'avatar_1', path: '/angular-projects/dabubble/images/icons/avatars/avatar_1.png', alt: 'Avatar 1' },
    { id: 'avatar_2', path: '/angular-projects/dabubble/images/icons/avatars/avatar_2.png', alt: 'Avatar 2' },
    { id: 'avatar_3', path: '/angular-projects/dabubble/images/icons/avatars/avatar_3.png', alt: 'Avatar 3' },
    { id: 'avatar_4', path: '/angular-projects/dabubble/images/icons/avatars/avatar_4.png', alt: 'Avatar 4' },
    { id: 'avatar_5', path: '/angular-projects/dabubble/images/icons/avatars/avatar_5.png', alt: 'Avatar 5' },
    { id: 'avatar_6', path: '/angular-projects/dabubble/images/icons/avatars/avatar_6.png', alt: 'Avatar 6' }
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    public notificationService: NotificationService,
    private location: Location,
  ) {}  

  ngOnInit(): void {
    this.loadCurrentUser();
    this.trackLoadingState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private trackLoadingState(): void {
    this.authService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loading = loading);
  }

  private loadCurrentUser(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.currentUser = user;
          this.userName = user.displayName || user.email || 'Benutzer';
        } else {
          this.router.navigate(['/auth/login']);
        }
      });
  }

  selectAvatar(avatarId: string): void {
    this.selectedAvatarId = avatarId;
  }

  isAvatarSelected(avatarId: string): boolean {
    return this.selectedAvatarId === avatarId;
  }

  get selectedAvatarPath(): string {
    if (!this.selectedAvatarId) return '';
    const avatar = this.avatars.find(a => a.id === this.selectedAvatarId);
    return avatar?.path || '';
  }

  get selectedAvatarAlt(): string {
    if (!this.selectedAvatarId) return '';
    const avatar = this.avatars.find(a => a.id === this.selectedAvatarId);
    return avatar?.alt || '';
  }

  onContinue(): void {
    if (!this.selectedAvatarId || this.loading || !this.currentUser) {
      return;
    }
    const selectedAvatar = this.avatars.find(avatar => avatar.id === this.selectedAvatarId);
    const photoURL = selectedAvatar?.path || '';
    this.updateUserAvatar(photoURL);
  }

  private updateUserAvatar(photoURL: string): void {
    this.authService.updateUserAvatar(photoURL)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Konto erfolgreich erstellt!');
          setTimeout(() => this.router.navigate(['/dashboard']), 1000);
        },
        error: (error) => {
          console.error('Error updating avatar:', error);
          const message = error.message || 'Fehler beim Aktualisieren des Avatars. Bitte versuchen Sie es erneut.';
          this.notificationService.showError('Error!');
        }
      });
  } 
  
  hideAllNotifications(): void {
    this.notificationService.clearAll();
  }  

  skipAvatarSelection(): void {
    this.router.navigate(['/dashboard']);
  }

  goBack(): void {
    this.location.back();
  }

  get canContinue(): boolean {
    return !!this.selectedAvatarId && !this.loading && !!this.currentUser;
  }

  get currentUserPhotoURL(): string {
    return this.currentUser?.photoURL || '';
  }

  get hasCurrentAvatar(): boolean {
    return !!this.currentUser?.photoURL;
  }
}