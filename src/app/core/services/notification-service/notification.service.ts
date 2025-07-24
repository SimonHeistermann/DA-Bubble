import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private successMessageSubject = new BehaviorSubject<string>('');
  private errorMessageSubject = new BehaviorSubject<string>('');
  private showSuccessSubject = new BehaviorSubject<boolean>(false);
  private showErrorSubject = new BehaviorSubject<boolean>(false);
  successMessage$ = this.successMessageSubject.asObservable();
  errorMessage$ = this.errorMessageSubject.asObservable();
  showSuccess$ = this.showSuccessSubject.asObservable();
  showError$ = this.showErrorSubject.asObservable();
  private successTimeoutId?: number;
  private errorTimeoutId?: number;

  showSuccess(message: string, duration = 4000): void {
    this.clearError();
    this.successMessageSubject.next(message);
    this.showSuccessSubject.next(true);
    this.successTimeoutId = window.setTimeout(() => this.clearSuccess(), duration);
  }

  showError(message: string, duration = 5000): void {
    this.clearSuccess();
    this.errorMessageSubject.next(message);
    this.showErrorSubject.next(true);

    this.errorTimeoutId = window.setTimeout(() => this.clearError(), duration);
  }

  clearSuccess(): void {
    this.showSuccessSubject.next(false);
    this.successMessageSubject.next('');
    if (this.successTimeoutId) {
      clearTimeout(this.successTimeoutId);
      this.successTimeoutId = undefined;
    }
  }

  clearError(): void {
    this.showErrorSubject.next(false);
    this.errorMessageSubject.next('');
    if (this.errorTimeoutId) {
      clearTimeout(this.errorTimeoutId);
      this.errorTimeoutId = undefined;
    }
  }

  clearAll(): void {
    this.clearSuccess();
    this.clearError();
  }
}