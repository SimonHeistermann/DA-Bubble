import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthErrorHandlerService {

  // ========== ERROR HANDLERS ==========

  handleSignInError(error: any, logMessage: string = 'Email sign in error:'): Observable<never> {
    throw this.handleAuthError(error);
  }

  handleRegistrationError(error: any): Observable<never> {
    throw this.handleAuthError(error);
  }

  handleSignOutError(error: any): Observable<never> {
    throw error;
  }

  handlePasswordResetError(error: any, logMessage: string = 'Password reset error:'): Observable<never> {
    if (error.message && error.message.includes('email-not-found')) {
      throw new Error('email-not-found');
    }
    throw this.handleAuthError(error);
  }

  handleVerificationError(error: any): Observable<never> {
    throw this.handleAuthError(error);
  }

  private handleAuthError(error: any): Error {
    const errorMessages = this.getErrorMessages();
    const message = this.getLocalizedErrorMessage(error, errorMessages);
    return new Error(message);
  }

  private getLocalizedErrorMessage(error: any, errorMessages: {[key: string]: string}): string {
    return errorMessages[error.code] || error.message || 'Ein unbekannter Fehler ist aufgetreten';
  }

  private getErrorMessages(): {[key: string]: string} {
    return {
      'auth/user-not-found': 'Benutzer nicht gefunden',
      'auth/wrong-password': 'Falsches Passwort',
      'auth/email-already-in-use': 'E-Mail-Adresse wird bereits verwendet',
      'auth/weak-password': 'Passwort ist zu schwach',
      'auth/invalid-email': 'Ungültige E-Mail-Adresse',
      'auth/too-many-requests': 'Zu viele Anfragen. Bitte versuchen Sie es später erneut',
      'auth/network-request-failed': 'Netzwerkfehler. Prüfen Sie Ihre Internetverbindung',
      'auth/popup-closed-by-user': 'Anmeldung wurde abgebrochen',
      'email-not-found': 'Diese E-Mail-Adresse ist nicht registriert'
    };
  }
}