import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../../core/services/auth-service/auth.service';
import { NotificationService } from '../../../../core/services/notification-service/notification.service';
import { AuthValidators } from '../../../../core/validators/auth.validators';
import { CommonModule } from '@angular/common';
import { SuccessNotificationComponent } from '../notifications/success-notification/success-notification.component';
import { ErrorNotificationComponent } from '../notifications/error-notification/error-notification.component';
import { OverlayComponent } from '../notifications/overlay/overlay.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule, CommonModule, SuccessNotificationComponent, 
    ErrorNotificationComponent, OverlayComponent
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  resetPasswordForm!: FormGroup;
  loading = false;
  oobCode = '';
  userEmail = '';
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    public notificationService: NotificationService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // this.extractResetCode();
    // this.verifyResetCode();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canSubmitForm(): boolean {
    return this.resetPasswordForm.valid && !this.loading;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.resetPasswordForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  hasFieldContent(fieldName: string): boolean {
    const field = this.resetPasswordForm.get(fieldName);
    return !!(field && field.value && field.value.length > 0);
  }

  getFieldError(fieldName: string): string {
    const field = this.resetPasswordForm.get(fieldName);
    if (!field || !field.errors) return '';
    if (fieldName === 'newPassword') {
      return this.getNewPasswordError(field.errors);
    }
    if (fieldName === 'confirmPassword') {
      return this.getConfirmPasswordError(field.errors);
    }
    return '';
  }

  onSubmit(): void {
    if (!this.canSubmitForm) return;
    this.loading = true;
    const newPassword = this.resetPasswordForm.get('newPassword')?.value;
    this.authService.confirmPasswordReset(this.oobCode, newPassword)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.handleResetSuccess(),
        error: () => this.handleResetError()
      });
  }

  goBack(): void {
    this.router.navigate(['/auth/forgot-password']);
  }

  hideAllNotifications(): void {
    this.notificationService.clearAll();
  }

  private initializeForm(): void {
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [AuthValidators.required, AuthValidators.password]],
      confirmPassword: ['', [AuthValidators.required]]
    }, {
      validators: AuthValidators.passwordMatch('newPassword', 'confirmPassword')
    });
  }

  private extractResetCode(): void {
    this.oobCode = this.route.snapshot.queryParamMap.get('oobCode') || '';
    if (!this.oobCode) {
      this.handleInvalidResetLink();
    }
  }

  private verifyResetCode(): void {
    if (!this.oobCode) return;
    
    this.loading = true;
    this.authService.verifyPasswordResetCode(this.oobCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (email: string) => this.handleVerificationSuccess(email),
        error: () => this.handleVerificationError()
      });
  }

  private handleInvalidResetLink(): void {
    this.notificationService.showError('Ungültiger Reset-Link!');
    this.router.navigate(['/auth/forgot-password']);
  }

  private handleVerificationSuccess(email: string): void {
    this.userEmail = email;
    this.loading = false;
  }

  private handleVerificationError(): void {
    this.loading = false;
    this.notificationService.showError('Der Reset-Link ist ungültig oder abgelaufen.');
    this.router.navigate(['/auth/forgot-password']);
  }

  private handleResetSuccess(): void {
    this.loading = false;
    this.notificationService.showSuccess('Passwort zurückgesetzt!');
    this.router.navigate(['/auth/login']);
  }

  private handleResetError(): void {
    this.loading = false;
    this.notificationService.showError('Error!');
  }

  private getNewPasswordError(errors: any): string {
    if (errors['required']) return '*Passwort ist erforderlich';
    
    if (errors['password']) {
      return this.buildPasswordStrengthMessage(errors['password']);
    }
    return '';
  }

  private getConfirmPasswordError(errors: any): string {
    if (errors['required']) return '*Passwort bestätigen ist erforderlich';
    if (errors['passwordMismatch']) return '*Passwörter stimmen nicht überein';
    return '';
  }

  private buildPasswordStrengthMessage(passwordErrors: any): string {
    const missing = [];
    if (passwordErrors.minLength) missing.push('mindestens 8 Zeichen');
    if (passwordErrors.uppercase) missing.push('einen Großbuchstaben');
    if (passwordErrors.lowercase) missing.push('einen Kleinbuchstaben');
    if (passwordErrors.number) missing.push('eine Zahl');
    if (passwordErrors.specialChar) missing.push('ein Sonderzeichen');
    return `*Passwort muss enthalten: ${missing.join(', ')}`;
  }
}