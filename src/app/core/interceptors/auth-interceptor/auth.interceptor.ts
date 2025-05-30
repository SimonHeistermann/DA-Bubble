import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from './../../services/auth-service/auth.service';
import { FirebaseService } from './../../services/firebase-service/firebase.service';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const firebaseService = inject(FirebaseService);

  if (isFirebaseRequest(req.url)) {
    return next(req);
  }

  const currentUser = firebaseService.currentUser;
  if (currentUser) {
    return from(currentUser.getIdToken()).pipe(
      switchMap(token => {
        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
        return next(authReq);
      })
    );
  }
  return next(req);
};

function isFirebaseRequest(url: string): boolean {
  return url.includes('firebaseapp.com') || 
         url.includes('googleapis.com') ||
         url.includes('firebase.google.com');
}