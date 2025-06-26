import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { User as FirebaseUser, Unsubscribe } from 'firebase/auth';
import { FirebaseService } from './../firebase-service/firebase.service';
import { UserService } from './../user-service/user.service';
import { UserProfileService } from './../user-profile-service/user-profile.service';
import { FirestoreSyncService } from './../firestore-sync-service/firestore-sync.service';
import { ChannelService } from '../channel.service';
import { AuthErrorHandlerService } from './../auth-error-handler-service/auth-error-handler.service';
import { LoginCredentials, RegisterData, AuthUser } from './../../models/auth.interface';
import { Channel } from '../../models/channel.interface';

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
    private userProfileService: UserProfileService,
    private firestoreSyncService: FirestoreSyncService,
    private channelService: ChannelService,
    private authErrorHandler: AuthErrorHandlerService,
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
    const isNewUser = await this.firestoreSyncService.syncUserToFirestore(firebaseUser);
    
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

  // ========== CHANNEL MANAGEMENT ==========

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

  private async updateChannelWithNewUser(
    channel: Channel, 
    userId: string, 
    currentUserIDs: string[]
  ): Promise<void> {
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
      catchError(error => {
        this.setLoading(false);
        return this.authErrorHandler.handleSignInError(error);
      })
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
      catchError(error => {
        this.setLoading(false);
        return this.authErrorHandler.handleSignInError(error, 'Google sign in error:');
      })
    );
  }

  private performGoogleSignIn(): Observable<AuthUser> {
    return from(this.firebaseService.signInWithGoogle()).pipe(
      map(firebaseUser => this.validateAndMapUser(firebaseUser, 'Google sign in failed'))
    );
  }

  // ========== REGISTRATION ==========

  registerWithEmail(registerData: Omit<RegisterData, 'photoURL'>): Observable<AuthUser> {
    this.setLoading(true);
    const completeData: RegisterData = {
      ...registerData,
      photoURL: this.userProfileService.getRandomAvatar() 
    };

    const wasListening = !!this.authStateSubscription;
    if (wasListening) {
      this.authStateSubscription?.();
      this.authStateSubscription = null;
    }

    return from(
      this.firebaseService.createUserWithEmail(completeData.email, completeData.password)
    ).pipe(
      switchMap(firebaseUser => this.processRegistration(firebaseUser, completeData, wasListening)),
      map(authUser => {
        this.setLoading(false);
        return authUser;
      }),
      catchError(error => {
        if (wasListening) {
          this.initializeAuthStateListener();
        }
        this.setLoading(false);
        return this.authErrorHandler.handleRegistrationError(error);
      })
    );
  }

  private processRegistration(
    firebaseUser: FirebaseUser | null, 
    completeData: RegisterData, 
    wasListening: boolean
  ): Observable<AuthUser> {
    if (!firebaseUser) {
      throw new Error('Registration failed');
    }

    const displayName = `${completeData.firstName} ${completeData.lastName}`.trim();
    
    return from(
      this.firebaseService.updateUserProfile(displayName, completeData.photoURL)
    ).pipe(
      switchMap(() => this.finalizeRegistration(firebaseUser, completeData, wasListening))
    );
  }

  private finalizeRegistration(
    firebaseUser: FirebaseUser,
    completeData: RegisterData,
    wasListening: boolean
  ): Observable<AuthUser> {
    const updatedFirebaseUser = this.firebaseService.currentUser;
    if (!updatedFirebaseUser) {
      throw new Error('Failed to get updated user');
    }

    return from(this.firestoreSyncService.syncUserToFirestore(updatedFirebaseUser, completeData)).pipe(
      switchMap(() => from(this.addUserToAllgemeinChannel(firebaseUser.uid))),
      map(() => {
        if (wasListening) {
          this.initializeAuthStateListener();
        }
        const authUser = this.mapFirebaseUserToAuthUser(this.firebaseService.currentUser!);
        this.currentUserSubject.next(authUser);
        return authUser;
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
    return this.userProfileService.updateUserAvatar(currentUser, avatarPath).pipe(
      map(updatedUser => {
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
      catchError(error => {
        this.setLoading(false);
        return this.authErrorHandler.handleSignOutError(error);
      })
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
      await this.userProfileService.setUserOfflineStatus(currentUser.uid);
    }
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
      catchError(error => {
        this.setLoading(false);
        return this.authErrorHandler.handlePasswordResetError(error);
      })
    );
  }
  
  resetPasswordSecure(email: string): Observable<void> {
    this.setLoading(true);
    return this.resetPasswordWithValidation(email);
  }

  private sendPasswordResetEmail(email: string): Observable<void> {
    return from(this.firebaseService.sendPasswordReset(email));
  }

  confirmPasswordReset(oobCode: string, newPassword: string): Observable<void> {
    this.setLoading(true);
    return this.executePasswordReset(oobCode, newPassword).pipe(
      map(() => this.setLoading(false)),
      catchError(error => {
        this.setLoading(false);
        return this.authErrorHandler.handlePasswordResetError(error, 'Confirm password reset error:');
      })
    );
  }

  private executePasswordReset(oobCode: string, newPassword: string): Observable<void> {
    return from(this.firebaseService.confirmPasswordReset(oobCode, newPassword));
  }

  verifyPasswordResetCode(oobCode: string): Observable<string> {
    return from(this.firebaseService.verifyPasswordResetCode(oobCode)).pipe(
      catchError(error => this.authErrorHandler.handleVerificationError(error))
    );
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
  
  private resetPasswordWithValidation(email: string): Observable<void> {
    return this.checkEmailExists(email).pipe(
      switchMap(exists => {
        if (!exists) {
          throw new Error('email-not-found');
        }
        return this.sendPasswordResetEmail(email);
      }),
      map(() => this.setLoading(false)),
      catchError(error => {
        this.setLoading(false);
        return this.authErrorHandler.handlePasswordResetError(error);
      })
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
    if (this.authStateSubscription) {
      this.authStateSubscription();
    }
  }
}