import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class AuthValidators {
  
  static email(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const valid = emailRegex.test(control.value);
    
    return valid ? null : { email: { value: control.value } };
  }

  static password(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const password = control.value;
    const errors: any = {};
    if (password.length < 8) {
      errors.minLength = true;
    }
    if (!/[A-Z]/.test(password)) {
      errors.uppercase = true;
    }
    if (!/[a-z]/.test(password)) {
      errors.lowercase = true;
    }
    if (!/\d/.test(password)) {
      errors.number = true;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.specialChar = true;
    }
    return Object.keys(errors).length > 0 ? { password: errors } : null;
  }

  static simplePassword(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    return control.value.length >= 6 ? null : { simplePassword: true };
  }

  static passwordMatch(passwordField: string, confirmPasswordField: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get(passwordField);
      const confirmPassword = control.get(confirmPasswordField);
      if (!password || !confirmPassword) {
        return null;
      }
      return password.value === confirmPassword.value ? null : { passwordMatch: true };
    };
  }

  static name(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const nameRegex = /^[a-zA-ZäöüÄÖÜß\s]+$/;
    const valid = nameRegex.test(control.value);
    return valid ? null : { name: { value: control.value } };
  }

  static noWhitespace(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const isWhitespace = (control.value || '').trim().length === 0;
    return isWhitespace ? { whitespace: true } : null;
  }
}