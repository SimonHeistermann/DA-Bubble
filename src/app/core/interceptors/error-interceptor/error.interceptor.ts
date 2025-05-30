import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './../../services/auth-service/auth.service';

export const ErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('HTTP Error:', error);
      
      switch (error.status) {
        case 401:
          handleUnauthorized(authService, router);
          break;
        case 403:
          handleForbidden();
          break;
        case 404:
          handleNotFound();
          break;
        case 500:
          handleServerError();
          break;
        case 0:
          handleNetworkError();
          break;
        default:
          handleUnknownError(error);
      }
      
      return throwError(() => error);
    })
  );
};

function handleUnauthorized(authService: AuthService, router: Router): void {
  console.warn('401 Unauthorized - Benutzer wird abgemeldet');
  authService.signOut().subscribe({
    next: () => router.navigate(['/auth/login']),
    error: (error) => {
      console.error('Error during automatic sign out:', error);
      router.navigate(['/auth/login']);
    }
  });
}


/**
* 403 Forbidden - Keine Berechtigung
*/
function handleForbidden(): void {
  console.warn('403 Forbidden - Keine Berechtigung');
    // Hier könntest du eine Snackbar oder Benachrichtigung anzeigen
    // this.snackBar.open('Sie haben keine Berechtigung für diese Aktion', 'OK');
}

/**
* 404 Not Found
*/
function handleNotFound(): void {
  console.warn('404 Not Found - Ressource nicht gefunden');
    // Optional: Zur 404-Seite weiterleiten
    // this.router.navigate(['/404']);
}

function handleServerError(): void {
  console.error('500 Server Error - Serverfehler');
    // Hier könntest du eine Fehlermeldung anzeigen
    // this.snackBar.open('Ein Serverfehler ist aufgetreten', 'OK');
}


function handleNetworkError(): void {
  console.error('Network Error - Keine Internetverbindung');
    // Hier könntest du eine Offline-Benachrichtigung anzeigen
    // this.snackBar.open('Keine Internetverbindung', 'OK');
}


function handleUnknownError(error: HttpErrorResponse): void {
  console.error('Unknown Error:', error);
    // Allgemeine Fehlermeldung
    // this.snackBar.open('Ein unbekannter Fehler ist aufgetreten', 'OK');
}
