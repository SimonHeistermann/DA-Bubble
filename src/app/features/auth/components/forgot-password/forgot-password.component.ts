import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, switchMap } from 'rxjs';
import { AuthService } from '../../../../core/services/auth-service/auth.service';
import { AuthValidators } from '../../../../core/validators/auth.validators';
import { CommonModule, Location } from '@angular/common';
import { ErrorNotificationComponent } from '../notifications/error-notification/error-notification.component';
import { OverlayComponent } from '../notifications/overlay/overlay.component';
import { SuccessNotificationComponent } from '../notifications/success-notification/success-notification.component';
import { NotificationService } from '../../../../core/services/notification-service/notification.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, ErrorNotificationComponent,
    OverlayComponent, SuccessNotificationComponent
  ],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  forgotPasswordForm!: FormGroup;
  loading = false;
  private destroy$ = new Subject<void>();
  private submissionAttempts = 0;
  private readonly MAX_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 60000;
  private lastSubmissionTime = 0;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private location: Location,
    public notificationService: NotificationService
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    this.subscribeToLoadingState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToLoadingState(): void {
    this.authService.loading$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(loading => {
      this.loading = loading;
    });
  }

  private createForm(): void {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [
        Validators.required,
        AuthValidators.email
      ]],
      website: ['']
    });
  }

  onSubmit(): void {
    if (this.isHoneypotFilled()) {
      this.simulateSubmission();
      return;
    }
    if (!this.canSubmit()) {
      const secondsRemaining = this.remainingTime;
      this.notificationService.showError(
        `Zu viele Versuche. Bitte warten Sie ${secondsRemaining} Sekunden.`
      );
      return;
    }
    if (this.forgotPasswordForm.valid && !this.loading) {
      this.performPasswordReset();
    } else {
      this.markFormGroupTouched();
    }
  }

  private isHoneypotFilled(): boolean {
    const honeypotValue = this.forgotPasswordForm.get('website')?.value;
    return honeypotValue && honeypotValue.trim().length > 0;
  }

  private simulateSubmission(): void {
    this.loading = true;
    setTimeout(() => {
      this.loading = false;
      this.notificationService.showSuccess('E-Mail gesendet!');
    }, 2000);
  }

  private canSubmit(): boolean {
    const now = Date.now();
    if ((now - this.lastSubmissionTime) > this.RETRY_DELAY) {
      this.submissionAttempts = 0;
      return true;
    }

    return this.submissionAttempts < this.MAX_ATTEMPTS;
  }

  private performPasswordReset(): void {
    const email = this.forgotPasswordForm.get('email')?.value.trim();
    this.submissionAttempts++;
    this.lastSubmissionTime = Date.now();
    this.authService.resetPasswordSecure(email).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => this.handlePasswordResetSuccess(),
      error: (error) => this.handlePasswordResetError(error)
    });
  }

  private handlePasswordResetSuccess(): void {
    this.notificationService.showSuccess('E-Mail gesendet!');
    this.forgotPasswordForm.get('email')?.setValue('');
  }

  private handlePasswordResetError(error: any): void {
    if (error.message?.includes('too-many-requests')) {
      this.submissionAttempts = this.MAX_ATTEMPTS;
      this.lastSubmissionTime = Date.now();
      this.notificationService.showError(
        `Zu viele Anfragen. Bitte versuchen Sie es in ${this.remainingTime} Sekunden erneut.`
      );
    } else if (error.message?.includes('email-not-found')) {
      this.submissionAttempts = Math.max(0, this.submissionAttempts - 1);
      this.notificationService.showError('E-Mail-Adresse wurde nicht gefunden.');
    } else {
      this.notificationService.showError('Fehler beim Zurücksetzen des Passworts.');
    }
  }

  hideAllNotifications(): void {
    this.notificationService.clearAll();
  }

  goBack(): void {
    this.location.back();
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.forgotPasswordForm.controls).forEach(key => {
      if (key !== 'website') {
        this.touchAndAnimateInvalidField(key);
      }
    });
  }

  private touchAndAnimateInvalidField(key: string): void {
    const control = this.forgotPasswordForm.get(key);
    control?.markAsTouched();

    if (control?.invalid) {
      const element = document.getElementById(`${key}-group`);
      if (element) {
        element.classList.add('error__state');
        setTimeout(() => element.classList.remove('error__state'), 300);
      }
    }
  }

  getFieldError(fieldName: string): string | null {
    const field = this.forgotPasswordForm.get(fieldName);
    if (field?.touched && field.invalid) {
      return this.getControlErrorMessage(fieldName, field.errors);
    }
    return null;
  }

  private getControlErrorMessage(fieldName: string, errors: any): string | null {
    if (errors?.['required']) return this.getRequiredErrorMessage(fieldName);
    if (errors?.['email']) return '*Diese E-Mail-Adresse ist leider ungültig.';
    return null;
  }

  private getRequiredErrorMessage(fieldName: string): string {
    const errorMessages: { [key: string]: string } = {
      email: '*E-Mail-Adresse ist erforderlich.'
    };
    return errorMessages[fieldName] || '*Dieses Feld ist erforderlich.';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.forgotPasswordForm.get(fieldName);
    return !!(field?.touched && field?.invalid);
  }

  isFieldValid(fieldName: string): boolean {
    const field = this.forgotPasswordForm.get(fieldName);
    return !!(field?.valid && field?.dirty);
  }

  hasFieldContent(fieldName: string): boolean {
    const field = this.forgotPasswordForm.get(fieldName);
    return !!(field?.value && field.value.toString().length > 0);
  }

  get canSubmitForm(): boolean {
    return this.forgotPasswordForm.valid && !this.loading && this.canSubmit();
  }

  get remainingTime(): number {
    if (this.submissionAttempts < this.MAX_ATTEMPTS) return 0;
    const elapsed = Date.now() - this.lastSubmissionTime;
    return Math.max(0, Math.ceil((this.RETRY_DELAY - elapsed) / 1000));
  }
}
