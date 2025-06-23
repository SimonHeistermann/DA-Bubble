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

  private readonly availableAvatars = [
    '/icons/avatars/avatar_1.png',
    '/icons/avatars/avatar_2.png',
    '/icons/avatars/avatar_3.png',
    '/icons/avatars/avatar_4.png',
    '/icons/avatars/avatar_5.png',
    '/icons/avatars/avatar_6.png'
  ];

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
      if (this.isGoogleSignIn(firebaseUser)) {
        this.router.navigate(['/auth/choose-avatar']);
      }
    }
  }

  private isGoogleSignIn(firebaseUser: FirebaseUser): boolean {
    return firebaseUser.providerData.some(provider => provider.providerId === 'google.com');
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

  // ========== ZUFÄLLIGER AVATAR ==========

  private getRandomAvatar(): string {
    const randomIndex = Math.floor(Math.random() * this.availableAvatars.length);
    return this.availableAvatars[randomIndex];
  }

  // ========== FIRESTORE SYNC ==========

  private async syncUserToFirestore(firebaseUser: FirebaseUser, registerData?: RegisterData): Promise<boolean> {
    try {
      const existingUser = await this.getExistingUser(firebaseUser.uid);
      const now = Timestamp.now();
      
      return await this.handleUserSync(firebaseUser, existingUser, now, registerData);
    } catch (error) {
      console.error('Error syncing user to Firestore:', error);
      return false;
    }
  }

  private async handleUserSync(firebaseUser: FirebaseUser, existingUser: any, now: Timestamp, registerData?: RegisterData): Promise<boolean> {
    if (!existingUser) {
      await this.createNewUserInFirestore(firebaseUser, now, registerData);
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

  private async createNewUserInFirestore(firebaseUser: FirebaseUser, timestamp: Timestamp, registerData?: RegisterData): Promise<void> {
    const newUser: Omit<User, 'id'> = this.buildNewUserData(firebaseUser, timestamp, registerData);
    await this.firebaseService.setDocument(
      APP_CONSTANTS.COLLECTIONS.USERS,
      firebaseUser.uid,
      newUser
    );
  }

  private buildNewUserData(firebaseUser: FirebaseUser, timestamp: Timestamp, registerData?: RegisterData): Omit<User, 'id'> {
    if (registerData) {
      return this.createUserDataFromRegistration(firebaseUser, timestamp, registerData);
    } else {
      const nameParts = this.splitDisplayName(firebaseUser.displayName);
      const randomAvatar = this.getRandomAvatar();
      return this.createUserDataObject(firebaseUser, timestamp, nameParts, randomAvatar);
    }
  }
  
  private createUserDataFromRegistration(
    firebaseUser: FirebaseUser,
    timestamp: Timestamp,
    registerData: RegisterData
  ): Omit<User, 'id'> {
    const displayName = `${registerData.firstName} ${registerData.lastName}`.trim();
    const userData = {
      email: registerData.email,
      displayName: displayName,
      photoURL: registerData.photoURL ?? this.getRandomAvatar(),
      lastSeen: timestamp,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      profile: {
        firstName: registerData.firstName,
        lastName: registerData.lastName
      }
    };    
    return userData;
  }

  private createUserDataObject(firebaseUser: FirebaseUser, timestamp: Timestamp, nameParts: {firstName: string, lastName: string}, randomAvatar: string): Omit<User, 'id'> {
    return {
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || '',
      photoURL: randomAvatar,
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

  // ========== REGISTRIERUNG ==========

  registerWithEmail(registerData: Omit<RegisterData, 'photoURL'>): Observable<AuthUser> {
    this.setLoading(true);
    const completeData: RegisterData = {
      ...registerData,
      photoURL: this.getRandomAvatar() 
    };
    const wasListening = !!this.authStateSubscription;
    if (wasListening) {
      this.authStateSubscription?.();
      this.authStateSubscription = null;
    }
    return from(
      this.firebaseService.createUserWithEmail(completeData.email, completeData.password)
    ).pipe(
      switchMap(firebaseUser => {
        if (!firebaseUser) {
          throw new Error('Registration failed');
        }
        const displayName = `${completeData.firstName} ${completeData.lastName}`.trim();
        return from(
          this.firebaseService.updateUserProfile(displayName, completeData.photoURL)
        ).pipe(
          switchMap(() => {
            const updatedFirebaseUser = this.firebaseService.currentUser;
            if (!updatedFirebaseUser) {
              throw new Error('Failed to get updated user');
            }
            return from(this.syncUserToFirestore(updatedFirebaseUser, completeData));
          }),
          switchMap(() => {
            return from(this.addUserToAllgemeinChannel(firebaseUser.uid)).pipe(
              map(() => {
                if (wasListening) {
                  this.initializeAuthStateListener();
                }
                const authUser = this.mapFirebaseUserToAuthUser(this.firebaseService.currentUser!);
                this.currentUserSubject.next(authUser);
                return authUser;
              })
            );
          })
        );
      }),
      map(authUser => {
        this.setLoading(false);
        return authUser;
      }),
      catchError(error => {
        if (wasListening) {
          this.initializeAuthStateListener();
        }
        return this.handleRegistrationError(error);
      })
    );
  }

  // ========== AVATAR UPDATE ==========

  updateUserAvatar(avatarPath: string): Observable<void> {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) {
      throw new Error('No user logged in');
    }
    this.setLoading(true);
    return from(
      this.firebaseService.updateUserProfile(currentUser.displayName, avatarPath)
    ).pipe(
      switchMap(() => {
        return from(this.firebaseService.updateDocument(
          APP_CONSTANTS.COLLECTIONS.USERS,
          currentUser.uid,
          {
            photoURL: avatarPath,
            updatedAt: Timestamp.now()
          }
        ));
      }),
      map(() => {
        const updatedUser = { ...currentUser, photoURL: avatarPath };
        this.currentUserSubject.next(updatedUser);
        this.setLoading(false);
      }),
      catchError(error => {
        console.error('Error updating avatar:', error);
        this.setLoading(false);
        throw error;
      })
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
  
  resetPasswordSecure(email: string): Observable<void> {
    return this.resetPasswordWithValidation(email);
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
    if (error.message.includes('email-not-found')) {
      throw new Error('email-not-found');
    }
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
      'auth/popup-closed-by-user': 'Anmeldung wurde abgebrochen',
      'email-not-found': 'Diese E-Mail-Adresse ist nicht registriert'
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

  checkEmailExists(email: string): Observable<boolean> {
    return this.userService.getUserByEmail(email).pipe(
      map(user => user !== null),
      catchError(error => {
        console.error('Error checking email existence:', error);
        return of(false);
      })
    );
  }
  
  resetPasswordWithValidation(email: string): Observable<void> {
    this.setLoading(true);
    return this.checkEmailExists(email).pipe(
      switchMap(exists => {
        if (!exists) {
          throw new Error('email-not-found');
        }
        return this.sendPasswordResetEmail(email);
      }),
      map(() => this.setLoading(false)),
      catchError(error => this.handlePasswordResetError(error))
    );
  }
}