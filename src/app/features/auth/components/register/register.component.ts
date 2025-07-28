import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, distinctUntilChanged, debounceTime } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth-service/auth.service';
import { AuthValidators } from '../../../../core/validators/auth.validators';
import { RegisterData } from '../../../../core/models/auth.interface';

interface FormErrorMessages {
  firstName: { [key: string]: string };
  lastName: { [key: string]: string };
  email: { [key: string]: string };
  password: { [key: string]: string };
  confirmPassword: { [key: string]: string };
  privacyPolicy: { [key: string]: string };
  website: { [key: string]: string };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit, OnDestroy {
  registerForm!: FormGroup;
  loading = false;
  errorMessage = '';
  private destroy$ = new Subject<void>();

  private readonly errorMessages: FormErrorMessages = {
    firstName: {
      required: '*Vorname ist erforderlich.',
      minlength: '*Mindestens 2 Zeichen erforderlich.',
      maxlength: '*Maximal 50 Zeichen erlaubt.',
      invalidCharacters: '*Nur Buchstaben, Leerzeichen und Bindestrich sind erlaubt.',
      onlySpecialChars: '*Name darf nicht nur aus Sonderzeichen bestehen.'
    },
    lastName: {
      required: '*Nachname ist erforderlich.',
      minlength: '*Mindestens 2 Zeichen erforderlich.',
      maxlength: '*Maximal 50 Zeichen erlaubt.',
      invalidCharacters: '*Nur Buchstaben, Leerzeichen und Bindestrich sind erlaubt.',
      onlySpecialChars: '*Name darf nicht nur aus Sonderzeichen bestehen.'
    },
    email: {
      required: '*E-Mail-Adresse ist erforderlich.',
      email: '*Bitte geben Sie eine gültige E-Mail-Adresse ein.'
    },
    password: {
      required: '*Passwort ist erforderlich.',
      password: '*Passwort muss mindestens 8 Zeichen enthalten und mindestens einen Großbuchstaben, einen Kleinbuchstaben, eine Zahl und ein Sonderzeichen haben.'
    },
    confirmPassword: {
      required: '*Passwort bestätigen ist erforderlich.',
      passwordMismatch: '*Passwörter stimmen nicht überein.'
    },
    privacyPolicy: {
      required: '*Sie müssen der Datenschutzerklärung zustimmen.'
    },
    website: {
      honeypot: '*Verdächtige Aktivität erkannt.'
    }
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.subscribeToLoadingState();
    this.setupPasswordMatchValidation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    this.errorMessage = '';
    if (this.registerForm.get('website')?.value) {
      this.errorMessage = 'Verdächtige Aktivität erkannt.';
      return;
    }
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
      website: ['', [AuthValidators.honeypot]],
      firstName: ['', [AuthValidators.name]],
      lastName: ['', [AuthValidators.name]],
      email: ['', [AuthValidators.required, AuthValidators.email]],
      password: ['', [AuthValidators.required, AuthValidators.password]],
      confirmPassword: ['', [AuthValidators.required]],
      privacyPolicy: [false, [AuthValidators.requiredTrue]]
    }, {
      validators: [AuthValidators.passwordMatch('password', 'confirmPassword')],
      updateOn: 'change'
    });
  }

  private setupPasswordMatchValidation(): void {
    const passwordControl = this.registerForm.get('password');
    const confirmPasswordControl = this.registerForm.get('confirmPassword');
    if (passwordControl && confirmPasswordControl) {
      passwordControl.valueChanges
        .pipe(
          takeUntil(this.destroy$),
          debounceTime(300),
          distinctUntilChanged()
        )
        .subscribe(() => {
          if (confirmPasswordControl.value) {
            confirmPasswordControl.updateValueAndValidity();
          }
        });
      confirmPasswordControl.valueChanges
        .pipe(
          takeUntil(this.destroy$),
          debounceTime(300),
          distinctUntilChanged()
        )
        .subscribe(() => {
          this.registerForm.updateValueAndValidity();
        });
    }
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
      firstName: formValues.firstName?.trim() || '',
      lastName: formValues.lastName?.trim() || '',
      email: formValues.email?.trim().toLowerCase() || '',
      password: formValues.password || ''
    };
  }

  private handleRegistrationError(error: any): void {
    console.error('Registration error:', error);
    if (error.code === 'auth/email-already-in-use') {
      this.errorMessage = 'Diese E-Mail-Adresse wird bereits verwendet.';
    } else if (error.code === 'auth/weak-password') {
      this.errorMessage = 'Das Passwort ist zu schwach.';
    } else if (error.code === 'auth/invalid-email') {
      this.errorMessage = 'Die E-Mail-Adresse ist ungültig.';
    } else {
      this.errorMessage = error.message || 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
    }
  }

  private showValidationErrors(): void {
    this.markAllFieldsAsTouched();
    this.errorMessage = 'Bitte korrigieren Sie die markierten Fehler.';
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      if (control) {
        control.markAsTouched();
        if (control.invalid) {
          this.triggerErrorAnimation(key);
        }
      }
    });
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
    const control = this.registerForm.get(fieldName);
    if (!control || (!control.touched && !control.dirty)) {
      return null;
    }
    if (fieldName === 'confirmPassword' && this.registerForm.errors?.['passwordMismatch']) {
      return this.errorMessages['confirmPassword']['passwordMismatch'];
    }
    if (control.errors) {
      const firstErrorKey = Object.keys(control.errors)[0];
      const fieldErrors = this.errorMessages[fieldName as keyof FormErrorMessages];
      
      if (fieldErrors && fieldErrors[firstErrorKey]) {
        return fieldErrors[firstErrorKey];
      }
      if (firstErrorKey === 'password' && control.errors['password']) {
        return this.getPasswordErrorMessage(control.errors['password']);
      }
      return `*${firstErrorKey} error`;
    }
    return null;
  }

  private getPasswordErrorMessage(passwordErrors: any): string {
    const errors = [];
    if (passwordErrors.minLength) {
      errors.push('mindestens 8 Zeichen');
    }
    if (passwordErrors.uppercase) {
      errors.push('einen Großbuchstaben');
    }
    if (passwordErrors.lowercase) {
      errors.push('einen Kleinbuchstaben');
    }
    if (passwordErrors.number) {
      errors.push('eine Zahl');
    }
    if (passwordErrors.specialChar) {
      errors.push('ein Sonderzeichen');
    }
    return `*Passwort muss ${errors.join(', ')} enthalten.`;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    const hasControlError = !!(control?.touched && control.invalid);
    const hasFormError = fieldName === 'confirmPassword' && 
                        this.registerForm.errors?.['passwordMismatch'];
    
    return hasControlError || hasFormError;
  }

  isFieldValid(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    const isControlValid = !!(control?.valid && control.touched);
    const noFormError = !(fieldName === 'confirmPassword' && 
                         this.registerForm.errors?.['passwordMismatch']);
    return isControlValid && noFormError;
  }

  hasFieldContent(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    return !!(control?.value && control.value.toString().trim().length > 0);
  }

  get canProceed(): boolean {
    return this.registerForm.valid && !this.loading;
  }
}