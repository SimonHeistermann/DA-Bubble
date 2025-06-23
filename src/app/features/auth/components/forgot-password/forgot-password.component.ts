import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, switchMap } from 'rxjs';
import { AuthService } from '../../../../core/services/auth-service/auth.service';
import { AuthValidators } from '../../../../core/validators/auth.validators';
import { CommonModule, Location } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  forgotPasswordForm!: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';
  showSuccessOverlay = false;
  showErrorOverlay = false;
  private destroy$ = new Subject<void>();
  private submissionAttempts = 0;
  private readonly MAX_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 60000; 
  private lastSubmissionTime = 0;
  private successTimeoutId?: number;
  private errorTimeoutId?: number;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private location: Location
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    this.subscribeToLoadingState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.successTimeoutId) {
      clearTimeout(this.successTimeoutId);
    }
    if (this.errorTimeoutId) {
      clearTimeout(this.errorTimeoutId);
    }
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
      console.warn('Honeypot triggered - potential bot detected');
      this.simulateSubmission();
      return;
    }
    if (!this.canSubmit()) {
      this.errorMessage = `Zu viele Versuche. Bitte warten Sie ${Math.ceil((this.RETRY_DELAY - (Date.now() - this.lastSubmissionTime)) / 1000)} Sekunden.`;
      this.showErrorNotification();
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
      this.successMessage = 'Eine E-Mail zum Zurücksetzen des Passworts wurde an Ihre E-Mail-Adresse gesendet.';
      this.showSuccessNotification();
    }, 2000);
  }

  private canSubmit(): boolean {
    const now = Date.now();
    if (this.submissionAttempts === 0 || (now - this.lastSubmissionTime) > this.RETRY_DELAY) {
      return true;
    }
    if (this.submissionAttempts >= this.MAX_ATTEMPTS) {
      return false;
    }
    return true;
  }

  private performPasswordReset(): void {
    this.errorMessage = '';
    this.successMessage = '';
    const email = this.forgotPasswordForm.get('email')?.value.trim();
    this.submissionAttempts++;
    this.lastSubmissionTime = Date.now();
    this.authService.checkEmailExists(email).pipe(
      switchMap(exists => {
        if (!exists) {
          throw new Error('email-not-found');
        }
        return this.authService.resetPassword(email);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => this.handlePasswordResetSuccess(),
      error: (error) => this.handlePasswordResetError(error)
    });
  }

  private handlePasswordResetSuccess(): void {
    this.successMessage = 'Eine E-Mail zum Zurücksetzen des Passworts wurde an Ihre E-Mail-Adresse gesendet. Bitte überprüfen Sie auch Ihren Spam-Ordner.';
    this.showSuccessNotification();
    this.forgotPasswordForm.get('email')?.setValue('');
  }

  private handlePasswordResetError(error: any): void {
    console.error('Password reset error:', error);
    if (error.message.includes('email-not-found')) {
      this.errorMessage = 'Diese E-Mail-Adresse ist nicht registriert. Bitte überprüfen Sie Ihre Eingabe oder registrieren Sie sich.';
      this.submissionAttempts--;
    } else if (error.message.includes('too-many-requests')) {
      this.errorMessage = 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.';
      this.submissionAttempts = this.MAX_ATTEMPTS;
    } else {
      this.errorMessage = 'Ein Fehler beim Zurücksetzen des Passworts ist aufgetreten. Bitte versuchen Sie es erneut.';
    }
    this.showErrorNotification();
  }

  private showSuccessNotification(): void {
    this.hideErrorNotification(); // Error ausblenden falls aktiv
    this.showSuccessOverlay = true;
    
    // Automatisch nach 4 Sekunden ausblenden
    this.successTimeoutId = window.setTimeout(() => {
      this.hideSuccessNotification();
    }, 4000);
  }

  private showErrorNotification(): void {
    this.hideSuccessNotification(); // Success ausblenden falls aktiv
    this.showErrorOverlay = true;
    
    // Automatisch nach 5 Sekunden ausblenden (etwas länger als Success)
    this.errorTimeoutId = window.setTimeout(() => {
      this.hideErrorNotification();
    }, 5000);
  }

  hideSuccessNotification(): void {
    this.showSuccessOverlay = false;
    if (this.successTimeoutId) {
      clearTimeout(this.successTimeoutId);
      this.successTimeoutId = undefined;
    }
  }

  hideErrorNotification(): void {
    this.showErrorOverlay = false;
    if (this.errorTimeoutId) {
      clearTimeout(this.errorTimeoutId);
      this.errorTimeoutId = undefined;
    }
  }

  hideAllNotifications(): void {
    this.hideSuccessNotification();
    this.hideErrorNotification();
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