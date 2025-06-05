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
    this.authService.isAuthenticated$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(isAuth => {
      if (isAuth) {
        this.router.navigate(['/dashboard']);
      }
    });
    this.authService.loading$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(loading => {
      this.loading = loading;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
      ]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid && !this.loading) {
      this.errorMessage = '';
      const credentials: LoginCredentials = {
        email: this.loginForm.get('email')?.value.trim(),
        password: this.loginForm.get('password')?.value
      };

      this.authService.signInWithEmail(credentials).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (user) => {
          console.log('Login successful:', user);
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          console.error('Login error:', error);
          this.errorMessage = error.message || 'Falsches Passwort oder Email. Bitte versuchen Sie es erneut.';
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  onGoogleSignIn(): void {
    if (!this.loading) {
      this.errorMessage = '';
      this.authService.signInWithGoogle().pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (user) => {
          console.log('Google login successful:', user);
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          console.error('Google login error:', error);
          this.errorMessage = error.message || 'Google-Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.';
        }
      });
    }
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
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string | null {
    const field = this.loginForm.get(fieldName);
    if (field?.touched && field?.invalid) {
      const errors = field.errors;
      if (errors?.['required']) {
        return fieldName === 'email' ? '*Email ist erforderlich.' : '*Passwort ist erforderlich.';
      }
      if (errors?.['email']) {
        return '*Diese Email ist leider ungültig.';
      }
      if (errors?.['simplePassword']) {
        return '*Passwort muss mindestens 6 Zeichen lang sein';
      }
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
    return !!(field?.value && field.value.length > 0);
  }
}