import { AbstractControl, ValidationErrors, ValidatorFn, FormGroup } from '@angular/forms';

export class AuthValidators {
  
  /** Custom required validator */
  static required(control: AbstractControl): ValidationErrors | null {
    return control.value && control.value.toString().trim().length > 0 ? null : { required: true };
  }

  /** Validates that the input doesn't contain only whitespace */
  static noWhitespaceOnly(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }

    const isWhitespace = control.value.toString().trim().length === 0;
    return isWhitespace ? { whitespace: true } : null;
  }

  /** Email validator */
  static email(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isValid = emailRegex.test(control.value);

    return isValid ? null : { email: true };
  }

  /** Simple password validator (for login) */
  static simplePassword(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }

    return control.value.length >= 6 ? null : { simplePassword: true };
  }

  /** Strong password validator (for registration) */
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

  /** Validator to ensure passwords match */
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
      if (password.value !== confirmPassword.value) {
        confirmPassword.setErrors({ passwordMismatch: true });
        return { passwordMismatch: true };
      } else {
        if (confirmPassword.errors) {
          delete confirmPassword.errors['passwordMismatch'];
          if (Object.keys(confirmPassword.errors).length === 0) {
            confirmPassword.setErrors(null);
          }
        }
      }
      return null;
    };
  }

  /** Prevents special characters in names */
  static noSpecialCharacters(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const nameRegex = /^[a-zA-ZäöüÄÖÜß\s\-']+$/;
    return nameRegex.test(control.value) ? null : { noSpecialCharacters: true };
  }

  /** Combined name validator: required, no whitespace, no special chars */
  static name(control: AbstractControl): ValidationErrors | null {
    const requiredError = this.required(control);
    if (requiredError) return requiredError;
    const whitespaceError = this.noWhitespaceOnly(control);
    if (whitespaceError) return whitespaceError;
    const specialCharsError = this.noSpecialCharacters(control);
    if (specialCharsError) return specialCharsError;
    return null;
  }

  /** German phone number validator */
  static phoneNumber(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const phoneRegex = /^(\+49|0)[1-9]\d{1,14}$/;
    return phoneRegex.test(control.value.replace(/\s/g, '')) ? null : { phoneNumber: true };
  }

  /** Validates that a checkbox is checked */
  static requiredTrue(control: AbstractControl): ValidationErrors | null {
    return control.value === true ? null : { required: true };
  }

  /** Minimum age validator */
  static minimumAge(minAge: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const birthDate = new Date(control.value);
      const today = new Date();
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

  /** Validates proper URL format */
  static url(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    try {
      new URL(control.value);
      return null;
    } catch {
      return { url: true };
    }
  }
}