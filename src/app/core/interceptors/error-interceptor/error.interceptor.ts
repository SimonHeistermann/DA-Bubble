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
      
      switch (error.status) {
        case 401:
          handleUnauthorized(authService, router);
          break;
      }
      
      return throwError(() => error);
    })
  );
};

function handleUnauthorized(authService: AuthService, router: Router): void {
  authService.signOut().subscribe({
    next: () => router.navigate(['/auth/login']),
    error: (error) => {
      router.navigate(['/auth/login']);
    }
  });
}
