import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { User as FirebaseUser, Unsubscribe } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';

import { FirebaseService } from './../firebase-service/firebase.service';
import { UserService } from './../user-service/user.service';
import { LoginCredentials, RegisterData, AuthUser } from './../../models/auth.interface';
import { User } from '../../models/user.interface';
import { APP_CONSTANTS } from '../../constants/app.constants';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();
  private authStateSubscription: Unsubscribe | null = null;

  constructor(
    private firebaseService: FirebaseService,
    private userService: UserService,
    private router: Router
  ) {
    this.initializeAuthStateListener();
  }

  /**
   * Auth State Listener initialisieren
   */
  private initializeAuthStateListener(): void {
    this.authStateSubscription = this.firebaseService.onAuthStateChanged(
      async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          const authUser = this.mapFirebaseUserToAuthUser(firebaseUser);
          this.currentUserSubject.next(authUser);
          await this.syncUserToFirestore(firebaseUser);
        } else {
          this.currentUserSubject.next(null);
        }
      }
    );
  }

  /**
   * Firebase User zu AuthUser konvertieren
   */
  private mapFirebaseUserToAuthUser(firebaseUser: FirebaseUser): AuthUser {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || '',
      photoURL: firebaseUser.photoURL || '',
      emailVerified: firebaseUser.emailVerified
    };
  }

  /**
   * Benutzer-Daten in Firestore synchronisieren
   */
  private async syncUserToFirestore(firebaseUser: FirebaseUser): Promise<void> {
    try {
      const existingUser = await this.firebaseService.getDocument(
        APP_CONSTANTS.COLLECTIONS.USERS, 
        firebaseUser.uid
      );
      const now = Timestamp.now();
      if (!existingUser) {
        const newUser: Omit<User, 'uid'> = {
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || '',
          lastSeen: now,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          profile: {
            firstName: firebaseUser.displayName?.split(' ')[0] || '',
            lastName: firebaseUser.displayName?.split(' ')[1] || ''
          }
        };
        await this.firebaseService.setDocument(
          APP_CONSTANTS.COLLECTIONS.USERS,
          firebaseUser.uid,
          newUser
        );
      } else {
        await this.firebaseService.updateDocument(
          APP_CONSTANTS.COLLECTIONS.USERS,
          firebaseUser.uid,
          {
            lastSeen: now,
            isActive: true
          }
        );
      }
    } catch (error) {
      console.error('Error syncing user to Firestore:', error);
    }
  }

  /**
   * Anmeldung mit E-Mail und Passwort
   */
  signInWithEmail(credentials: LoginCredentials): Observable<AuthUser> {
    this.loadingSubject.next(true);
    return from(
      this.firebaseService.signInWithEmail(credentials.email, credentials.password)
    ).pipe(
      map(firebaseUser => {
        if (!firebaseUser) {
          throw new Error('Sign in failed');
        }
        return this.mapFirebaseUserToAuthUser(firebaseUser);
      }),
      catchError(error => {
        console.error('Email sign in error:', error);
        throw this.handleAuthError(error);
      }),
      switchMap(() => {
        this.loadingSubject.next(false);
        return this.currentUser$;
      }),
      map(user => {
        if (!user) throw new Error('User not found after sign in');
        return user;
      })
    );
  }

  /**
   * Anmeldung mit Google
   */
  signInWithGoogle(): Observable<AuthUser> {
    this.loadingSubject.next(true);
    return from(this.firebaseService.signInWithGoogle()).pipe(
      map(firebaseUser => {
        if (!firebaseUser) {
          throw new Error('Google sign in failed');
        }
        return this.mapFirebaseUserToAuthUser(firebaseUser);
      }),
      catchError(error => {
        console.error('Google sign in error:', error);
        throw this.handleAuthError(error);
      }),
      switchMap(() => {
        this.loadingSubject.next(false);
        return this.currentUser$;
      }),
      map(user => {
        if (!user) throw new Error('User not found after sign in');
        return user;
      })
    );
  }

  /**
   * Registrierung mit E-Mail und Passwort
   */
  registerWithEmail(registerData: RegisterData): Observable<AuthUser> {
    this.loadingSubject.next(true);
    return from(
      this.firebaseService.createUserWithEmail(registerData.email, registerData.password)
    ).pipe(
      switchMap(firebaseUser => {
        if (!firebaseUser) {
          throw new Error('Registration failed');
        }
        const displayName = `${registerData.firstName} ${registerData.lastName}`;
        return from(
          this.firebaseService.updateUserProfile(displayName, registerData.photoURL)
        ).pipe(
          map(() => firebaseUser)
        );
      }),
      map(firebaseUser => this.mapFirebaseUserToAuthUser(firebaseUser)),
      catchError(error => {
        console.error('Email registration error:', error);
        throw this.handleAuthError(error);
      }),
      switchMap(() => {
        this.loadingSubject.next(false);
        return this.currentUser$;
      }),
      map(user => {
        if (!user) throw new Error('User not found after registration');
        return user;
      })
    );
  }

  /**
   * Benutzer abmelden
   */
  signOut(): Observable<void> {
    this.loadingSubject.next(true);
    return from(this.updateUserOfflineStatus()).pipe(
      switchMap(() => from(this.firebaseService.signOut())),
      map(() => {
        this.loadingSubject.next(false);
        this.router.navigate(['/auth/login']);
      }),
      catchError(error => {
        console.error('Sign out error:', error);
        this.loadingSubject.next(false);
        throw error;
      })
    );
  }

  /**
   * Benutzer als offline markieren
   */
  private async updateUserOfflineStatus(): Promise<void> {
    const currentUser = this.currentUserSubject.value;
    if (currentUser) {
      try {
        await this.firebaseService.updateDocument(
          APP_CONSTANTS.COLLECTIONS.USERS,
          currentUser.uid,
          {
            isActive: false,
            lastSeen: Timestamp.now()
          }
        );
      } catch (error) {
        console.error('Error updating offline status:', error);
      }
    }
  }

  /**
   * Passwort zurücksetzen E-Mail senden
   */
  resetPassword(email: string): Observable<void> {
    this.loadingSubject.next(true);
    return from(this.firebaseService.sendPasswordReset(email)).pipe(
      map(() => {
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Password reset error:', error);
        this.loadingSubject.next(false);
        throw this.handleAuthError(error);
      })
    );
  }

  /**
   * Aktueller Benutzer (synchron)
   */
  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  /**
   * Ist Benutzer angemeldet?
   */
  get isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  /**
   * Ist Benutzer angemeldet? (Observable)
   */
  get isAuthenticated$(): Observable<boolean> {
    return this.currentUser$.pipe(
      map(user => user !== null)
    );
  }

  /**
   * Firebase Auth Fehler behandeln
   */
  private handleAuthError(error: any): Error {
    let message = 'Ein unbekannter Fehler ist aufgetreten';
    
    switch (error.code) {
      case 'auth/user-not-found':
        message = 'Benutzer nicht gefunden';
        break;
      case 'auth/wrong-password':
        message = 'Falsches Passwort';
        break;
      case 'auth/email-already-in-use':
        message = 'E-Mail-Adresse wird bereits verwendet';
        break;
      case 'auth/weak-password':
        message = 'Passwort ist zu schwach';
        break;
      case 'auth/invalid-email':
        message = 'Ungültige E-Mail-Adresse';
        break;
      case 'auth/too-many-requests':
        message = 'Zu viele Anfragen. Bitte versuchen Sie es später erneut';
        break;
      case 'auth/network-request-failed':
        message = 'Netzwerkfehler. Prüfen Sie Ihre Internetverbindung';
        break;
      case 'auth/popup-closed-by-user':
        message = 'Anmeldung wurde abgebrochen';
        break;
      default:
        message = error.message || message;
    }
    
    return new Error(message);
  }

  /**
   * Service aufräumen
   */
  ngOnDestroy(): void {
    if (this.authStateSubscription) {
      this.authStateSubscription();
    }
  }

  /**
  * Passwort mit Reset-Code zurücksetzen
  */
  confirmPasswordReset(oobCode: string, newPassword: string): Observable<void> {
    this.loadingSubject.next(true);
    return from(this.firebaseService.confirmPasswordReset(oobCode, newPassword)).pipe(
      map(() => {
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Confirm password reset error:', error);
        this.loadingSubject.next(false);
        throw this.handleAuthError(error);
      })
    );
  }

  /**
   * Reset-Code validieren (optional)
   */
  verifyPasswordResetCode(oobCode: string): Observable<string> {
    return from(this.firebaseService.verifyPasswordResetCode(oobCode)).pipe(
      catchError(error => {
        console.error('Verify password reset code error:', error);
        throw this.handleAuthError(error);
      })
    );
  }
}