import { AbstractControl, ValidationErrors, ValidatorFn, FormGroup } from '@angular/forms';

export class AuthValidators {
  
  /** Custom required validator that handles whitespace properly */
  static required(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return { required: true };
    }
    const value = control.value.toString().trim();
    return value.length > 0 ? null : { required: true };
  }

  /** Validates that the input doesn't contain only whitespace */
  static noWhitespaceOnly(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const isWhitespace = control.value.toString().trim().length === 0;
    return isWhitespace ? { whitespace: true } : null;
  }

  /** Email validator with better regex */
  static email(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const value = control.value.toString().trim();
    if (!value) {
      return null;
    }
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    const isValid = emailRegex.test(value);
    return isValid ? null : { email: true };
  }

  /** Simple password validator (for login) - less strict than registration */
  static simplePassword(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const password = control.value.toString();
    return password.length >= 6 ? null : { simplePassword: true };
  }

  /** Strong password validator with detailed error feedback */
  static password(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const password = control.value.toString();
    const errors: any = {};
    if (password.length < 8) {
      errors.minLength = { requiredLength: 8, actualLength: password.length };
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
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
      errors.specialChar = true;
    }
    return Object.keys(errors).length > 0 ? { password: errors } : null;
  }

  /** Password match validator */
  static passwordMatch(passwordField: string, confirmPasswordField: string): ValidatorFn {
    return (form: AbstractControl): ValidationErrors | null => {
      if (!(form instanceof FormGroup)) {
        return null;
      }
      const password = form.get(passwordField);
      const confirmPassword = form.get(confirmPasswordField);
      if (!password || !confirmPassword) {
        return null;
      }
      if (!password.value || !confirmPassword.value) {
        return null;
      }
      if (password.value !== confirmPassword.value) {
        return { passwordMismatch: true };
      }
      return null;
    };
  }

  /** Name validator with German characters support */
  static name(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return { required: true };
    }
    const value = control.value.toString().trim();
    if (value.length === 0) {
      return { required: true };
    }
    if (value.length < 2) {
      return { minlength: { requiredLength: 2, actualLength: value.length } };
    }
    if (value.length > 50) {
      return { maxlength: { requiredLength: 50, actualLength: value.length } };
    }
    const nameRegex = /^[a-zA-ZäöüÄÖÜßÀ-ÿ\s\-'\.]+$/;
    if (!nameRegex.test(value)) {
      return { invalidCharacters: true };
    }
    if (/^[\s\-'\.]+$/.test(value)) {
      return { onlySpecialChars: true };
    }
    return null;
  }

  /** Validates that a checkbox is checked */
  static requiredTrue(control: AbstractControl): ValidationErrors | null {
    return control.value === true ? null : { required: true };
  }

  /** Honeypot validator - should be empty */
  static honeypot(control: AbstractControl): ValidationErrors | null {
    return control.value ? { honeypot: true } : null;
  }

  /** German phone number validator */
  static phoneNumber(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const cleanedValue = control.value.toString().replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^(\+49|0049|0)[1-9]\d{1,14}$/;
    return phoneRegex.test(cleanedValue) ? null : { phoneNumber: true };
  }

  /** Minimum age validator */
  static minimumAge(minAge: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const birthDate = new Date(control.value);
      const today = new Date();
      if (isNaN(birthDate.getTime())) {
        return { invalidDate: true };
      }
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= minAge
        ? null
        : { minimumAge: { requiredAge: minAge, actualAge: age } };
    };
  }

  /** URL validator */
  static url(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    try {
      const url = new URL(control.value.toString());
      return ['http:', 'https:'].includes(url.protocol) ? null : { url: true };
    } catch {
      return { url: true };
    }
  }
}