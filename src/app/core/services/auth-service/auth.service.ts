import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of, merge } from 'rxjs';
import { map, switchMap, catchError, distinctUntilChanged } from 'rxjs/operators';
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
import { GuestLoginService, GuestUser } from './../guest-login-service/guest-login.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
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
    private guestLoginService: GuestLoginService,
    private router: Router
  ) {
    this.initializeAuthStateListener();
  }

  // ========== UNIFIED GETTERS ==========

  get currentUser(): AuthUser | null {
    const firebaseUser = this.currentUserSubject.value;
    if (firebaseUser) {
      return firebaseUser;
    }
    const guestUser = this.guestLoginService.currentGuest;
    return guestUser ? this.mapGuestToAuthUser(guestUser) : null;
  }

  get isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  get isAuthenticated$(): Observable<boolean> {
    return this.currentUser$.pipe(
      map(user => user !== null)
    );
  }

  get currentUser$(): Observable<AuthUser | null> {
    return merge(
      this.currentUserSubject.asObservable(),
      this.guestLoginService.currentGuest$.pipe(
        map(guest => guest ? this.mapGuestToAuthUser(guest) : null)
      )
    ).pipe(
      map(() => this.currentUser),
      distinctUntilChanged((a, b) => a?.uid === b?.uid)
    );
  }

  get isAuthenticatedExtended$(): Observable<boolean> {
    return this.currentUser$.pipe(
      map(user => user !== null)
    );
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

  signInAsGuest(): Observable<AuthUser> {
    this.setLoading(true);
    return this.guestLoginService.signInAsGuest().pipe(
      switchMap(guestUser => {
        const authUser = this.mapGuestToAuthUser(guestUser);
        this.userService.loadCurrentUser(authUser.uid);
        this.setLoading(false);
        return of(authUser);
      }),
      catchError(error => {
        this.setLoading(false);
        throw error;
      })
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

  // ========== SIGN OUT ==========

  signOut(): Observable<void> {
    this.setLoading(true);
    if (this.guestLoginService.isCurrentUserGuest()) {
      return this.guestLoginService.signOutGuest().pipe(
        switchMap(() => {
          this.userService.stopCurrentUserListener();
          this.setLoading(false);
          this.router.navigate(['/auth/login']);
          return of(void 0);
        }),    
        catchError(error => {
          this.setLoading(false);
          throw error;
        })
      );
    }
    return this.performSignOut().pipe(
      map(() => {
        this.userService.stopCurrentUserListener();
        this.navigateToLogin();
      }),
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
        return of(false);
      })
    );
  }

  // ========== AVATAR UPDATE ==========

  updateUserAvatar(avatarPath: string): Observable<void> {
    const currentUser = this.currentUser;
    if (!currentUser) {
      throw new Error('No user logged in');
    }
    if (this.isCurrentUserGuest()) {
      throw new Error('Guest users cannot update avatars');
    }
    this.setLoading(true);
    return this.userProfileService.updateUserAvatar(currentUser, avatarPath).pipe(
      map(updatedUser => {
        this.currentUserSubject.next(updatedUser);
        this.setLoading(false);
      }),
      catchError(error => {
        this.setLoading(false);
        throw error;
      })
    );
  }

  // ========== GUEST MANAGEMENT ==========

  isCurrentUserGuest(): boolean {
    return this.guestLoginService.isCurrentUserGuest();
  }

  getCurrentGuestUser(): GuestUser | null {
    return this.guestLoginService.currentGuest;
  }

  extendGuestSession(): Observable<void> {
    if (!this.guestLoginService.isCurrentUserGuest()) {
      throw new Error('No guest session to extend');
    }
    return this.guestLoginService.extendGuestSession().pipe(
      map(() => void 0)
    );
  }

  cleanupExpiredGuests(): Observable<void> {
    return this.guestLoginService.cleanupExpiredGuests();
  }

  convertGuestToRegularUser(registerData: Omit<RegisterData, 'photoURL'>): Observable<AuthUser> {
    const currentGuest = this.guestLoginService.currentGuest;
    if (!currentGuest) {
      throw new Error('No guest user to convert');
    }
    this.guestLoginService.signOutGuest();
    const completeRegisterData: RegisterData = {
      ...registerData,
      photoURL: currentGuest.photoURL
    };
    return this.registerWithEmail(completeRegisterData).pipe(
      switchMap(authUser => {
        return this.userService.deleteUser(currentGuest.uid).pipe(
          map(() => authUser)
        );
      })
    );
  }

  // ========== CHANNEL MANAGEMENT ==========

  private async addUserToAllgemeinChannel(userId: string): Promise<void> {
    try {
      const allgemeinChannel = await this.findAllgemeinChannel();
      if (allgemeinChannel) {
        await this.addUserToChannelIfNotExists(allgemeinChannel, userId);
      }
    } catch (error) {
      throw new Error('Failed to add user to Allgemein channel');
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

  // ========== AUTH STATE MANAGEMENT ==========

  private initializeAuthStateListener(): void {
    this.authStateSubscription = this.firebaseService.onAuthStateChanged(
      async (firebaseUser: FirebaseUser | null) => {
        await this.handleAuthStateChange(firebaseUser);
      }
    );
    this.scheduleGuestCleanup();
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
    this.userService.loadCurrentUser(firebaseUser.uid);
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

  private scheduleGuestCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredGuests().subscribe({
      });
    }, 24 * 60 * 60 * 1000);
  }

  // ========== UTILITY METHODS ==========

  private mapFirebaseUserToAuthUser(firebaseUser: FirebaseUser): AuthUser {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || '',
      photoURL: firebaseUser.photoURL || '',
      emailVerified: firebaseUser.emailVerified
    };
  }

  private mapGuestToAuthUser(guestUser: GuestUser): AuthUser {
    return {
      uid: guestUser.uid,
      email: guestUser.email,
      displayName: guestUser.displayName,
      photoURL: guestUser.photoURL,
      emailVerified: guestUser.emailVerified
    };
  }

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

  private async updateUserOfflineStatus(): Promise<void> {
    const currentUser = this.currentUser;
    if (currentUser && !this.isCurrentUserGuest()) {
      await this.userProfileService.setUserOfflineStatus(currentUser.uid);
    }
  }

  private navigateToLogin(): void {
    this.setLoading(false);
    this.router.navigate(['/auth/login']);
  }

  // ========== HELPER METHODS ==========

  isGuestUserId(userId: string): boolean {
    return userId.startsWith('guest_');
  }

  getUserRole(): 'regular' | 'guest' | null {
    if (this.currentUser && !this.isCurrentUserGuest()) return 'regular';
    if (this.isCurrentUserGuest()) return 'guest';
    return null;
  }

  isFeatureAvailable(feature: string): boolean {
    const userRole = this.getUserRole();
    const guestRestrictedFeatures = [
      'profile-edit',
      'password-change',
      'account-deletion',
      'premium-features'
    ];
    if (userRole === 'guest' && guestRestrictedFeatures.includes(feature)) {
      return false;
    }
    return true;
  }

  // ========== CLEANUP ==========

  ngOnDestroy(): void {
    if (this.authStateSubscription) {
      this.authStateSubscription();
    }
  }
}