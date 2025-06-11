import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { User as FirebaseUser, Unsubscribe } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { FirebaseService } from './../firebase-service/firebase.service';
import { UserService } from './../user-service/user.service';
import { ChannelService } from '../channel.service';
import { LoginCredentials, RegisterData, AuthUser } from './../../models/auth.interface';
import { User } from '../../models/user.interface';
import { Channel } from '../../models/channel.interface';
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
    private channelService: ChannelService,
    private router: Router
  ) {
    this.initializeAuthStateListener();
  }

  // ========== AUTH STATE MANAGEMENT ==========

  private initializeAuthStateListener(): void {
    this.authStateSubscription = this.firebaseService.onAuthStateChanged(
      async (firebaseUser: FirebaseUser | null) => {
        await this.handleAuthStateChange(firebaseUser);
      }
    );
  }

  private async handleAuthStateChange(firebaseUser: FirebaseUser | null): Promise<void> {
    if (firebaseUser) {
      await this.processAuthenticatedUser(firebaseUser);
    } else {
      this.currentUserSubject.next(null);
    }
  }

  private async processAuthenticatedUser(firebaseUser: FirebaseUser): Promise<void> {
    const authUser = this.mapFirebaseUserToAuthUser(firebaseUser);
    this.currentUserSubject.next(authUser);
    const isNewUser = await this.syncUserToFirestore(firebaseUser);
    
    if (isNewUser) {
      await this.addUserToAllgemeinChannel(firebaseUser.uid);
    }
  }

  private mapFirebaseUserToAuthUser(firebaseUser: FirebaseUser): AuthUser {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || '',
      photoURL: firebaseUser.photoURL || '',
      emailVerified: firebaseUser.emailVerified
    };
  }

  // ========== FIRESTORE SYNC ==========

  private async syncUserToFirestore(firebaseUser: FirebaseUser): Promise<boolean> {
    try {
      const existingUser = await this.getExistingUser(firebaseUser.uid);
      const now = Timestamp.now();
      
      return await this.handleUserSync(firebaseUser, existingUser, now);
    } catch (error) {
      console.error('Error syncing user to Firestore:', error);
      return false;
    }
  }

  private async handleUserSync(firebaseUser: FirebaseUser, existingUser: any, now: Timestamp): Promise<boolean> {
    if (!existingUser) {
      await this.createNewUserInFirestore(firebaseUser, now);
      return true;
    } else {
      await this.updateUserLastSeen(firebaseUser.uid, now);
      return false;
    }
  }

  private async getExistingUser(uid: string): Promise<any> {
    return await this.firebaseService.getDocument(
      APP_CONSTANTS.COLLECTIONS.USERS, 
      uid
    );
  }

  private async createNewUserInFirestore(firebaseUser: FirebaseUser, timestamp: Timestamp): Promise<void> {
    const newUser: Omit<User, 'id'> = this.buildNewUserData(firebaseUser, timestamp);
    await this.firebaseService.setDocument(
      APP_CONSTANTS.COLLECTIONS.USERS,
      firebaseUser.uid,
      newUser
    );
  }

  private buildNewUserData(firebaseUser: FirebaseUser, timestamp: Timestamp): Omit<User, 'id'> {
    const nameParts = this.splitDisplayName(firebaseUser.displayName);
    return this.createUserDataObject(firebaseUser, timestamp, nameParts);
  }

  private createUserDataObject(firebaseUser: FirebaseUser, timestamp: Timestamp, nameParts: {firstName: string, lastName: string}): Omit<User, 'id'> {
    return {
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || '',
      photoURL: firebaseUser.photoURL || '',
      lastSeen: timestamp,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      profile: {
        firstName: nameParts.firstName,
        lastName: nameParts.lastName
      }
    };
  }

  private splitDisplayName(displayName: string | null): {firstName: string, lastName: string} {
    const parts = displayName?.split(' ') || ['', ''];
    return {
      firstName: parts[0] || '',
      lastName: parts[1] || ''
    };
  }

  private async updateUserLastSeen(uid: string, timestamp: Timestamp): Promise<void> {
    await this.firebaseService.updateDocument(
      APP_CONSTANTS.COLLECTIONS.USERS,
      uid,
      {
        lastSeen: timestamp,
        isActive: true
      }
    );
  }

  // ========== CHANNEL ASSIGNMENT ==========

  private async addUserToAllgemeinChannel(userId: string): Promise<void> {
    try {
      const allgemeinChannel = await this.findAllgemeinChannel();
      
      if (allgemeinChannel) {
        await this.addUserToChannelIfNotExists(allgemeinChannel, userId);
      } else {
        console.warn('Allgemein channel not found');
      }
    } catch (error) {
      console.error('Error adding user to Allgemein channel:', error);
    }
  }

  private async addUserToChannelIfNotExists(channel: Channel, userId: string): Promise<void> {
    const currentUserIDs = channel.userIDs || [];
    
    if (!currentUserIDs.includes(userId)) {
      await this.updateChannelWithNewUser(channel, userId, currentUserIDs);
    }
  }

  private async updateChannelWithNewUser(channel: Channel, userId: string, currentUserIDs: string[]): Promise<void> {
    const updatedUserIDs = [...currentUserIDs, userId];
    await this.channelService.updateChannel(channel.id, {
      ...channel,
      userIDs: updatedUserIDs
    }).toPromise();
    console.log(`User ${userId} added to Allgemein channel`);
  }

  private async findAllgemeinChannel(): Promise<Channel | null> {
    return new Promise((resolve) => {
      const unsubscribe = this.channelService.getChannelByName('Allgemein', (channels: Channel[]) => {
        unsubscribe();
        resolve(channels.length > 0 ? channels[0] : null);
      });
    });
  }

  // ========== AUTHENTICATION METHODS ==========

  signInWithEmail(credentials: LoginCredentials): Observable<AuthUser> {
    this.setLoading(true);
    return this.performEmailSignIn(credentials).pipe(
      switchMap(() => this.waitForCurrentUser()),
      catchError(error => this.handleSignInError(error))
    );
  }

  private performEmailSignIn(credentials: LoginCredentials): Observable<AuthUser> {
    return from(
      this.firebaseService.signInWithEmail(credentials.email, credentials.password)
    ).pipe(
      map(firebaseUser => this.validateAndMapUser(firebaseUser, 'Sign in failed'))
    );
  }

  signInWithGoogle(): Observable<AuthUser> {
    this.setLoading(true);
    return this.performGoogleSignIn().pipe(
      switchMap(() => this.waitForCurrentUser()),
      catchError(error => this.handleSignInError(error, 'Google sign in error:'))
    );
  }

  private performGoogleSignIn(): Observable<AuthUser> {
    return from(this.firebaseService.signInWithGoogle()).pipe(
      map(firebaseUser => this.validateAndMapUser(firebaseUser, 'Google sign in failed'))
    );
  }

  registerWithEmail(registerData: RegisterData): Observable<AuthUser> {
    this.setLoading(true);
    return this.performEmailRegistration(registerData).pipe(
      switchMap(() => this.waitForCurrentUser()),
      catchError(error => this.handleRegistrationError(error))
    );
  }

  private performEmailRegistration(registerData: RegisterData): Observable<AuthUser> {
    return from(
      this.firebaseService.createUserWithEmail(registerData.email, registerData.password)
    ).pipe(
      switchMap(firebaseUser => this.updateUserProfileAfterRegistration(firebaseUser, registerData)),
      map(firebaseUser => this.mapFirebaseUserToAuthUser(firebaseUser))
    );
  }

  private updateUserProfileAfterRegistration(firebaseUser: FirebaseUser | null, registerData: RegisterData): Observable<FirebaseUser> {
    if (!firebaseUser) {
      throw new Error('Registration failed');
    }
    
    const displayName = this.buildDisplayName(registerData);
    return this.updateProfileAndReturnUser(firebaseUser, displayName, registerData.photoURL);
  }

  private buildDisplayName(registerData: RegisterData): string {
    return `${registerData.firstName} ${registerData.lastName}`;
  }

  private updateProfileAndReturnUser(firebaseUser: FirebaseUser, displayName: string, photoURL?: string): Observable<FirebaseUser> {
    return from(
      this.firebaseService.updateUserProfile(displayName, photoURL)
    ).pipe(
      map(() => firebaseUser)
    );
  }

  // ========== SIGN OUT ==========

  signOut(): Observable<void> {
    this.setLoading(true);
    return this.performSignOut().pipe(
      map(() => this.navigateToLogin()),
      catchError(error => this.handleSignOutError(error))
    );
  }

  private performSignOut(): Observable<void> {
    return from(this.updateUserOfflineStatus()).pipe(
      switchMap(() => from(this.firebaseService.signOut()))
    );
  }

  private async updateUserOfflineStatus(): Promise<void> {
    const currentUser = this.currentUserSubject.value;
    if (currentUser) {
      await this.setUserOfflineStatus(currentUser.uid);
    }
  }

  private async setUserOfflineStatus(uid: string): Promise<void> {
    try {
      await this.firebaseService.updateDocument(
        APP_CONSTANTS.COLLECTIONS.USERS,
        uid,
        this.buildOfflineStatusUpdate()
      );
    } catch (error) {
      console.error('Error updating offline status:', error);
    }
  }

  private buildOfflineStatusUpdate(): {isActive: boolean, lastSeen: Timestamp} {
    return {
      isActive: false,
      lastSeen: Timestamp.now()
    };
  }

  private navigateToLogin(): void {
    this.setLoading(false);
    this.router.navigate(['/auth/login']);
  }

  // ========== PASSWORD RESET ==========

  resetPassword(email: string): Observable<void> {
    this.setLoading(true);
    return this.sendPasswordResetEmail(email).pipe(
      map(() => this.setLoading(false)),
      catchError(error => this.handlePasswordResetError(error))
    );
  }

  private sendPasswordResetEmail(email: string): Observable<void> {
    return from(this.firebaseService.sendPasswordReset(email));
  }

  confirmPasswordReset(oobCode: string, newPassword: string): Observable<void> {
    this.setLoading(true);
    return this.executePasswordReset(oobCode, newPassword).pipe(
      map(() => this.setLoading(false)),
      catchError(error => this.handlePasswordResetError(error, 'Confirm password reset error:'))
    );
  }

  private executePasswordReset(oobCode: string, newPassword: string): Observable<void> {
    return from(this.firebaseService.confirmPasswordReset(oobCode, newPassword));
  }

  verifyPasswordResetCode(oobCode: string): Observable<string> {
    return from(this.firebaseService.verifyPasswordResetCode(oobCode)).pipe(
      catchError(error => this.handleVerificationError(error))
    );
  }

  // ========== UTILITY METHODS ==========

  private validateAndMapUser(firebaseUser: FirebaseUser | null, errorMessage: string): AuthUser {
    if (!firebaseUser) {
      throw new Error(errorMessage);
    }
    return this.mapFirebaseUserToAuthUser(firebaseUser);
  }

  private waitForCurrentUser(): Observable<AuthUser> {
    this.setLoading(false);
    return this.currentUser$.pipe(
      map(user => this.validateCurrentUser(user))
    );
  }

  private validateCurrentUser(user: AuthUser | null): AuthUser {
    if (!user) {
      throw new Error('User not found after authentication');
    }
    return user;
  }

  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  // ========== ERROR HANDLERS ==========

  private handleSignInError(error: any, logMessage: string = 'Email sign in error:'): Observable<never> {
    console.error(logMessage, error);
    this.setLoading(false);
    throw this.handleAuthError(error);
  }

  private handleRegistrationError(error: any): Observable<never> {
    console.error('Email registration error:', error);
    this.setLoading(false);
    throw this.handleAuthError(error);
  }

  private handleSignOutError(error: any): Observable<never> {
    console.error('Sign out error:', error);
    this.setLoading(false);
    throw error;
  }

  private handlePasswordResetError(error: any, logMessage: string = 'Password reset error:'): Observable<never> {
    console.error(logMessage, error);
    this.setLoading(false);
    throw this.handleAuthError(error);
  }

  private handleVerificationError(error: any): Observable<never> {
    console.error('Verify password reset code error:', error);
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
      'auth/popup-closed-by-user': 'Anmeldung wurde abgebrochen'
    };
  }

  // ========== GETTERS ==========

  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  get isAuthenticated$(): Observable<boolean> {
    return this.currentUser$.pipe(
      map(user => user !== null)
    );
  }

  // ========== CLEANUP ==========

  ngOnDestroy(): void {
    this.cleanupAuthStateSubscription();
  }

  private cleanupAuthStateSubscription(): void {
    if (this.authStateSubscription) {
      this.authStateSubscription();
    }
  }
}