import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth-service/auth.service';
import { AuthValidators } from '../../../../core/validators/auth.validators';
import { RegisterData } from '../../../../core/models/auth.interface';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit, OnDestroy {
  registerForm!: FormGroup;
  loading = false;
  errorMessage = '';
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.subscribeToLoadingState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.formIsValidAndReady()) {
      this.registerUser();
    } else {
      this.showValidationErrors();
    }
  }

  goBack(): void {
    this.router.navigate(['/auth/login']);
  }

  private initForm(): void {
    this.registerForm = this.fb.group({
      firstName: ['', this.getNameValidators()],
      lastName: ['', this.getNameValidators()],
      email: ['', [Validators.required, AuthValidators.email]],
      password: ['', [Validators.required, AuthValidators.password]],
      confirmPassword: ['', [Validators.required]],
      privacyPolicy: [false, [Validators.requiredTrue]]
    }, {
      validators: AuthValidators.passwordMatch('password', 'confirmPassword')
    });
  }

  private getNameValidators() {
    return [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(50),
      AuthValidators.noSpecialCharacters
    ];
  }

  private subscribeToLoadingState(): void {
    this.authService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loading = loading);
  }

  private formIsValidAndReady(): boolean {
    return this.registerForm.valid && !this.loading;
  }

  private registerUser(): void {
    this.errorMessage = '';
    const registrationData = this.mapFormToRegisterData();

    this.authService.registerWithEmail(registrationData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.router.navigate(['/auth/choose-avatar']),
        error: (error) => this.handleRegistrationError(error)
      });
  }

  private mapFormToRegisterData(): Omit<RegisterData, 'photoURL'> {
    const formValues = this.registerForm.value;
    return {
      firstName: formValues.firstName.trim(),
      lastName: formValues.lastName.trim(),
      email: formValues.email.trim().toLowerCase(),
      password: formValues.password
    };
  }

  private handleRegistrationError(error: any): void {
    console.error('Registration error:', error);
    this.errorMessage = error.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
  }

  private showValidationErrors(): void {
    this.markFormGroupTouched();
    this.errorMessage = 'Bitte füllen Sie alle Felder korrekt aus.';
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach(this.touchAndAnimateIfInvalid.bind(this));
  }

  private touchAndAnimateIfInvalid(key: string): void {
    const control = this.registerForm.get(key);
    control?.markAsTouched();
    if (control?.invalid) this.triggerErrorAnimation(key);
  }

  private triggerErrorAnimation(key: string): void {
    const element = document.getElementById(`${key}-group`);
    if (!element) return;
    element.classList.add('error__state');
    setTimeout(() => element.classList.remove('error__state'), 300);
  }

  private getControlErrorMessage(fieldName: string, errors: any): string | null {
    if (errors?.['required']) return this.getRequiredMessage(fieldName);
    if (errors?.['email']) return '*Diese E-Mail-Adresse ist leider ungültig.';
    if (errors?.['password']) return '*Passwort muss mindestens 6 Zeichen, einen Großbuchstaben und eine Zahl enthalten.';
    if (errors?.['minlength']) return `*Mindestens ${errors['minlength'].requiredLength} Zeichen erforderlich.`;
    if (errors?.['maxlength']) return `*Maximal ${errors['maxlength'].requiredLength} Zeichen erlaubt.`;
    if (errors?.['noSpecialCharacters']) return '*Nur Buchstaben und Leerzeichen sind erlaubt.';
    if (errors?.['passwordMismatch']) return '*Passwörter stimmen nicht überein.';
    return null;
  }

  private getRequiredMessage(fieldName: string): string {
    const messages: Record<string, string> = {
      firstName: '*Vorname ist erforderlich.',
      lastName: '*Nachname ist erforderlich.',
      email: '*E-Mail-Adresse ist erforderlich.',
      password: '*Passwort ist erforderlich.',
      confirmPassword: '*Passwort bestätigen ist erforderlich.',
      privacyPolicy: '*Sie müssen der Datenschutzerklärung zustimmen.'
    };
    return messages[fieldName] || '*Dieses Feld ist erforderlich.';
  }

  getFieldError(fieldName: string): string | null {
    const field = this.registerForm.get(fieldName);
    if (field?.touched && field.invalid)
      return this.getControlErrorMessage(fieldName, field.errors);
    if (fieldName === 'confirmPassword' && this.registerForm.errors?.['passwordMismatch']) {
      return '*Passwörter stimmen nicht überein.';
    }
    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field?.touched && field.invalid) ||
           (fieldName === 'confirmPassword' && this.registerForm.errors?.['passwordMismatch']);
  }

  isFieldValid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field?.valid && field.dirty);
  }

  hasFieldContent(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field?.value && field.value.toString().length > 0);
  }

  get canProceed(): boolean {
    return this.registerForm.valid && !this.loading;
  }
}