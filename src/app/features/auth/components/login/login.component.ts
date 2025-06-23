import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../../core/services/auth-service/auth.service';
import { AuthValidators } from '../../../../core/validators/auth.validators';
import { LoginCredentials } from '../../../../core/models/auth.interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  loading = false;
  errorMessage = '';
  showPassword = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    this.subscribeToAuthenticationState();
    this.subscribeToLoadingState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToAuthenticationState(): void {
    // this.authService.isAuthenticated$.pipe(
    //   takeUntil(this.destroy$)
    // ).subscribe(isAuth => {
    //   if (isAuth) {
    //     this.router.navigate(['/dashboard']);
    //   }
    // });
  }

  private subscribeToLoadingState(): void {
    this.authService.loading$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(loading => {
      this.loading = loading;
    });
  }

  private createForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [
        Validators.required,
        AuthValidators.email
      ]],
      password: ['', [
        Validators.required,
        AuthValidators.simplePassword
      ]],
      honeypot: ['']
    });
  }

  onSubmit(): void {
    if (this.loginForm.get('honeypot')?.value) {
      console.warn('Honeypot field filled. Possible bot.');
      return;
    }
    if (this.loginForm.valid && !this.loading) {
      this.performEmailLogin();
    } else {
      this.markFormGroupTouched();
    }
  }
  

  private performEmailLogin(): void {
    this.errorMessage = '';
    const credentials = this.extractLoginCredentials();
    
    this.authService.signInWithEmail(credentials).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (user) => this.handleEmailLoginSuccess(user),
      error: (error) => this.handleEmailLoginError(error)
    });
  }

  private extractLoginCredentials(): LoginCredentials {
    return {
      email: this.loginForm.get('email')?.value.trim(),
      password: this.loginForm.get('password')?.value
    };
  }

  private handleEmailLoginSuccess(user: any): void {
    console.log('Email login successful:', user);
    this.router.navigate(['/dashboard']);
  }

  private handleEmailLoginError(error: any): void {
    console.error('Email login error:', error);
    this.errorMessage = error.message || 'Ein Fehler bei der Anmeldung ist aufgetreten.';
  }

  onGoogleSignIn(): void {
    if (this.loading) return;
    this.errorMessage = '';
    this.authService.signInWithGoogle().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => this.handleGoogleLoginSuccess(result),
      error: (error) => this.handleGoogleLoginError(error)
    });
  }

  private handleGoogleLoginSuccess(result: any): void {
    console.log('Google login successful:', result);
  }

  private handleGoogleLoginError(error: any): void {
    console.error('Google login error:', error);
    this.errorMessage = error.message || 'Ein Fehler bei der Google-Anmeldung ist aufgetreten.';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  navigateToRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  navigateToForgotPassword(): void {
    this.router.navigate(['/auth/forgot-password']);
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
      const element = document.getElementById(`${key}-group`);
      if (element) {
        element.classList.add('error__state');
        setTimeout(() => element.classList.remove('error__state'), 300);
      }
    }
  }

  getFieldError(fieldName: string): string | null {
    const field = this.loginForm.get(fieldName);
    if (field?.touched && field.invalid) {
      return this.getControlErrorMessage(fieldName, field.errors);
    }
    return null;
  }

  private getControlErrorMessage(fieldName: string, errors: any): string | null {
    if (errors?.['required']) return this.getRequiredErrorMessage(fieldName);
    if (errors?.['email']) return '*Diese E-Mail-Adresse ist leider ungültig.';
    if (errors?.['simplePassword']) return '*Passwort muss mindestens 6 Zeichen haben.';
    return null;
  }

  private getRequiredErrorMessage(fieldName: string): string {
    const errorMessages: { [key: string]: string } = {
      email: '*E-Mail-Adresse ist erforderlich.',
      password: '*Passwort ist erforderlich.'
    };
    return errorMessages[fieldName] || '*Dieses Feld ist erforderlich.';
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
    return !!(field?.value && field.value.toString().length > 0);
  }

  get canSubmit(): boolean {
    return this.loginForm.valid && !this.loading;
  }
}