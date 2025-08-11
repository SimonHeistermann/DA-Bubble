import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../../core/services/auth-service/auth.service';
import { AuthValidators } from '../../../../core/validators/auth.validators';
import { LoginCredentials } from '../../../../core/models/auth.interface';
import { CommonModule } from '@angular/common';
import { OverlayComponent } from '../notifications/overlay/overlay.component';
import { ErrorNotificationComponent } from '../notifications/error-notification/error-notification.component';
import { SuccessNotificationComponent } from '../notifications/success-notification/success-notification.component';
import { NotificationService } from '../../../../core/services/notification-service/notification.service';
import { IntroAnimationComponent } from '../intro-animation/intro-animation.component';

interface LoginErrorMessages {
  email: { [key: string]: string };
  password: { [key: string]: string };
  honeypot: { [key: string]: string };
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, OverlayComponent, 
    ErrorNotificationComponent, SuccessNotificationComponent,
    IntroAnimationComponent, RouterModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  showIntro = false;
  loginForm!: FormGroup;
  loading = false;
  guestLoading = false;
  private destroy$ = new Subject<void>();
  private redirectTimeoutId?: number;

  private readonly errorMessages: LoginErrorMessages = {
    email: {
      required: '*E-Mail-Adresse ist erforderlich.',
      email: '*Diese E-Mail-Adresse ist leider ungültig.'
    },
    password: {
      required: '*Passwort ist erforderlich.',
      simplePassword: '*Passwort muss mindestens 6 Zeichen haben.'
    },
    honeypot: {
      honeypot: '*Verdächtige Aktivität erkannt.'
    }
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    public notificationService: NotificationService
  ) {
    this.createForm();
  }  

  ngOnInit(): void {
    this.subscribeToAuthenticationState();
    this.subscribeToLoadingState();
    this.getIntroSeen();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.redirectTimeoutId) {
      clearTimeout(this.redirectTimeoutId);
    }
  }

  // ========== GETTER ==========

  get isAnyLoginInProgress(): boolean {
    return this.loading || this.guestLoading;
  }

  get canSubmit(): boolean {
    return this.loginForm.valid && !this.isAnyLoginInProgress;
  }

  get canGuestLogin(): boolean {
    return !this.isAnyLoginInProgress;
  }

  // ========== FORM SETUP ==========

  private createForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [
        AuthValidators.required,
        AuthValidators.email
      ]],
      password: ['', [
        AuthValidators.required,
        AuthValidators.simplePassword
      ]],
      honeypot: ['', [AuthValidators.honeypot]]
    });
  }

  // ========== AUTHENTICATION METHODS ==========

  onSubmit(): void {
    if (this.loginForm.get('honeypot')?.value) {
      this.notificationService.showError('Verdächtige Aktivität erkannt.');
      return;
    }
    if (this.loginForm.valid && !this.loading) {
      this.performEmailLogin();
    } else {
      this.markFormGroupTouched();
    }
  }

  private performEmailLogin(): void {
    this.notificationService.clearAll();
    const credentials = this.extractLoginCredentials();
    this.authService.signInWithEmail(credentials).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => this.handleEmailLoginSuccess(),
      error: (error) => this.handleEmailLoginError(error)
    });
  }

  onGoogleSignIn(): void {
    if (this.loading) return;
    this.notificationService.clearAll();
    this.authService.signInWithGoogle().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => this.handleGoogleLoginSuccess(),
      error: (error) => this.handleGoogleLoginError(error)
    });
  }

  onGuestLogin(): void {
    if (this.guestLoading || this.loading) return;
    this.guestLoading = true;
    this.notificationService.clearAll();
    this.authService.signInAsGuest().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (guestUser) => {
        this.handleGuestLoginSuccess();
      },
      error: (error) => this.handleGuestLoginError(error)
    });
  }

  // ========== LOGIN SUCCESS/ERROR HANDLERS ==========

  private handleEmailLoginSuccess(): void {
    this.notificationService.showSuccess('Angemeldet!');
    this.redirectTimeoutId = window.setTimeout(() => {
      this.router.navigate(['/dashboard']);
    }, 2000);
  }
  
  private handleEmailLoginError(error: any): void {
    let errorMessage = 'Fehler beim Anmelden.';
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'Benutzer nicht gefunden.';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Falsches Passwort.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Ungültige E-Mail-Adresse.';
    } else if (error.code === 'auth/user-disabled') {
      errorMessage = 'Ihr Konto wurde deaktiviert.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Zu viele Anmeldeversuche. Bitte versuchen Sie es später erneut.';
    }
    this.notificationService.showError(errorMessage);
  }

  private handleGoogleLoginSuccess(): void {
    this.notificationService.showSuccess('Angemeldet!');
    this.redirectTimeoutId = window.setTimeout(() => {
      this.router.navigate(['/dashboard']);
    }, 2000);
  }  

  private handleGoogleLoginError(error: any): void {
    let errorMessage = 'Fehler bei der Google-Anmeldung.';
    if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Anmeldung abgebrochen.';
    } else if (error.code === 'auth/popup-blocked') {
      errorMessage = 'Popup wurde blockiert. Bitte erlauben Sie Popups für diese Seite.';
    }
    this.notificationService.showError(errorMessage);
  }

  private handleGuestLoginSuccess(): void {
    this.guestLoading = false;
    this.notificationService.showSuccess('Als Gast angemeldet!');
    this.router.navigate(['/dashboard']).then(success => {
      if (!success) {
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 100);
      }
    });
  }

  private handleGuestLoginError(error: any): void {
    this.guestLoading = false;
    this.notificationService.showError('Fehler beim Gast-Login!');
  }

  // ========== FORM VALIDATION & FIELD HELPERS ==========

  private extractLoginCredentials(): LoginCredentials {
    return {
      email: this.loginForm.get('email')?.value?.trim() || '',
      password: this.loginForm.get('password')?.value || ''
    };
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      this.touchAndAnimateInvalidField(key);
    });
  }

  private touchAndAnimateInvalidField(key: string): void {
    const control = this.loginForm.get(key);
    control?.markAsTouched();
    
    if (control?.invalid) {
      this.triggerErrorAnimation(key);
    }
  }

  private triggerErrorAnimation(fieldName: string): void {
    const element = document.getElementById(`${fieldName}-group`);
    if (element) {
      element.classList.remove('error__state');
      element.offsetHeight;
      element.classList.add('error__state');
      setTimeout(() => {
        element.classList.remove('error__state');
      }, 300);
    }
  }

  getFieldError(fieldName: string): string | null {
    const control = this.loginForm.get(fieldName);
    if (!control || (!control.touched && !control.dirty)) {
      return null;
    }
    if (control.errors) {
      const firstErrorKey = Object.keys(control.errors)[0];
      const fieldErrors = this.errorMessages[fieldName as keyof LoginErrorMessages];
      if (fieldErrors && fieldErrors[firstErrorKey]) {
        return fieldErrors[firstErrorKey];
      }
      return `*${firstErrorKey} error`;
    }
    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field?.touched && field?.invalid);
  }

  isFieldValid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field?.valid && field?.dirty);
  }

  hasFieldContent(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field?.value && field.value.toString().trim().length > 0);
  }

  // ========== UI INTERACTION METHODS ==========

  hideAllNotifications(): void {
    this.notificationService.clearAll();
  }

  // ========== INTRO ANIMATION ==========

  onIntroComplete(): void {
    this.showIntro = false;
    sessionStorage.setItem('hasSeenIntro', 'true');
    this.createForm();
  }

  private getIntroSeen(): void {
    const hasSeenIntro = sessionStorage.getItem('hasSeenIntro');
    this.showIntro = !hasSeenIntro;
    if (!this.showIntro) {
      this.createForm();
    }
  }

  // ========== SUBSCRIPTIONS ==========

  private subscribeToAuthenticationState(): void {
    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      if (user) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  private subscribeToLoadingState(): void {
    this.authService.loading$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(loading => {
      this.loading = loading;
    });
  }
}