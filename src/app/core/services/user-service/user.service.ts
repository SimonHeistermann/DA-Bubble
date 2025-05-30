import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Unsubscribe, Timestamp } from 'firebase/firestore';

import { FirebaseService } from './../firebase-service/firebase.service';
import { User, UserProfile } from '../../models/user.interface';
import { APP_CONSTANTS } from '../../constants/app.constants';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private allUsersSubject = new BehaviorSubject<User[]>([]);
  public allUsers$ = this.allUsersSubject.asObservable();
  private onlineUsersSubject = new BehaviorSubject<User[]>([]);
  public onlineUsers$ = this.onlineUsersSubject.asObservable();
  private currentUserSubscription: Unsubscribe | null = null;
  private allUsersSubscription: Unsubscribe | null = null;

  constructor(private firebaseService: FirebaseService) {
    this.initializeAllUsersListener();
  }

  /**
   * Listener für alle Benutzer initialisieren
   */
  private initializeAllUsersListener(): void {
    this.allUsersSubscription = this.firebaseService.subscribeToCollection(
      APP_CONSTANTS.COLLECTIONS.USERS,
      (users: User[]) => {
        this.allUsersSubject.next(users);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const onlineUsers = users.filter(user => 
          user.isActive && 
          user.lastSeen.toDate() > fiveMinutesAgo
        );
        this.onlineUsersSubject.next(onlineUsers);
      }
    );
  }

  /**
   * Aktuellen Benutzer laden
   */
  loadCurrentUser(uid: string): void {
    if (this.currentUserSubscription) {
      this.currentUserSubscription();
    }
    this.currentUserSubscription = this.firebaseService.subscribeToDocument(
      APP_CONSTANTS.COLLECTIONS.USERS,
      uid,
      (user: User | null) => {
        this.currentUserSubject.next(user);
      }
    );
  }

  /**
   * Benutzer nach UID laden
   */
  getUserById(uid: string): Observable<User | null> {
    return from(
      this.firebaseService.getDocument(APP_CONSTANTS.COLLECTIONS.USERS, uid)
    ).pipe(
      catchError(error => {
        console.error('Error loading user by ID:', error);
        return of(null);
      })
    );
  }

  /**
   * Benutzer nach E-Mail suchen
   */
  getUserByEmail(email: string): Observable<User | null> {
    return new Observable<User | null>(observer => {
      const unsubscribe = this.firebaseService.subscribeToCollection(
        APP_CONSTANTS.COLLECTIONS.USERS,
        (users: User[]) => {
          const user = users.find(u => u.email === email);
          observer.next(user || null);
        },
      );
      return () => unsubscribe();
    }).pipe(
      map(users => Array.isArray(users) ? users.find(u => u.email === email) || null : users),
      catchError(error => {
        console.error('Error loading user by email:', error);
        return of(null);
      })
    );
  }

  /**
   * Mehrere Benutzer nach UIDs laden
   */
  getUsersByIds(uids: string[]): Observable<User[]> {
    if (uids.length === 0) {
      return of([]);
    }
    return this.allUsers$.pipe(
      map(allUsers => allUsers.filter(user => uids.includes(user.uid))),
      catchError(error => {
        console.error('Error loading users by IDs:', error);
        return of([]);
      })
    );
  }

  /**
   * Benutzer nach Namen suchen
   */
  searchUsersByName(searchTerm: string): Observable<User[]> {
    if (!searchTerm.trim()) {
      return of([]);
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return this.allUsers$.pipe(
      map(users => users.filter(user => 
        user.displayName.toLowerCase().includes(lowerSearchTerm) ||
        user.profile.firstName.toLowerCase().includes(lowerSearchTerm) ||
        user.profile.lastName.toLowerCase().includes(lowerSearchTerm) ||
        user.email.toLowerCase().includes(lowerSearchTerm)
      )),
      catchError(error => {
        console.error('Error searching users:', error);
        return of([]);
      })
    );
  }

  /**
   * Benutzerprofil aktualisieren
   */
  updateUserProfile(uid: string, profileData: Partial<UserProfile>): Observable<void> {
    return from(
      this.firebaseService.updateDocument(
        APP_CONSTANTS.COLLECTIONS.USERS,
        uid,
        { profile: profileData }
      )
    ).pipe(
      catchError(error => {
        console.error('Error updating user profile:', error);
        throw error;
      })
    );
  }

  /**
   * Display Name aktualisieren
   */
  updateDisplayName(uid: string, displayName: string): Observable<void> {
    return from(
      this.firebaseService.updateDocument(
        APP_CONSTANTS.COLLECTIONS.USERS,
        uid,
        { displayName }
      )
    ).pipe(
      catchError(error => {
        console.error('Error updating display name:', error);
        throw error;
      })
    );
  }

  /**
   * Benutzer als online markieren
   */
  setUserOnline(uid: string): Observable<void> {
    return from(
      this.firebaseService.updateDocument(
        APP_CONSTANTS.COLLECTIONS.USERS,
        uid,
        {
          isActive: true,
          lastSeen: Timestamp.now()
        }
      )
    ).pipe(
      catchError(error => {
        console.error('Error setting user online:', error);
        throw error;
      })
    );
  }

  /**
   * Benutzer als offline markieren
   */
  setUserOffline(uid: string): Observable<void> {
    return from(
      this.firebaseService.updateDocument(
        APP_CONSTANTS.COLLECTIONS.USERS,
        uid,
        {
          isActive: false,
          lastSeen: Timestamp.now()
        }
      )
    ).pipe(
      catchError(error => {
        console.error('Error setting user offline:', error);
        throw error;
      })
    );
  }

  /**
   * Benutzer-Status aktualisieren (Heartbeat)
   */
  updateUserHeartbeat(uid: string): Observable<void> {
    return from(
      this.firebaseService.updateDocument(
        APP_CONSTANTS.COLLECTIONS.USERS,
        uid,
        {
          lastSeen: Timestamp.now(),
          isActive: true
        }
      )
    ).pipe(
      catchError(error => {
        console.error('Error updating user heartbeat:', error);
        return of(void 0);
      })
    );
  }

  /**
   * Prüfen ob Benutzer online ist
   */
  isUserOnline(user: User): boolean {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return user.isActive && user.lastSeen.toDate() > fiveMinutesAgo;
  }

  /**
   * Benutzer-Status als String
   */
  getUserStatus(user: User): 'online' | 'offline' | 'away' {
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    if (user.isActive && user.lastSeen.toDate() > oneMinuteAgo) {
      return 'online';
    } else if (user.isActive && user.lastSeen.toDate() > fiveMinutesAgo) {
      return 'away';
    } else {
      return 'offline';
    }
  }

  /**
   * Vollständigen Namen erstellen
   */
  getFullName(user: User): string {
    return `${user.profile.firstName} ${user.profile.lastName}`.trim() || user.displayName;
  }

  /**
   * Benutzer-Initialen erstellen
   */
  getUserInitials(user: User): string {
    const firstName = user.profile.firstName || user.displayName.split(' ')[0] || '';
    const lastName = user.profile.lastName || user.displayName.split(' ')[1] || '';
    
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  /**
   * Aktueller Benutzer (synchron)
   */
  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Alle Benutzer (synchron)
   */
  get allUsers(): User[] {
    return this.allUsersSubject.value;
  }

  /**
   * Online-Benutzer (synchron)
   */
  get onlineUsers(): User[] {
    return this.onlineUsersSubject.value;
  }

  /**
   * Anzahl Online-Benutzer
   */
  get onlineUserCount(): number {
    return this.onlineUsersSubject.value.length;
  }

  /**
   * Aktuellen Benutzer-Listener stoppen
   */
  stopCurrentUserListener(): void {
    if (this.currentUserSubscription) {
      this.currentUserSubscription();
      this.currentUserSubscription = null;
    }
    this.currentUserSubject.next(null);
  }

  /**
   * Service aufräumen
   */
  ngOnDestroy(): void {
    if (this.currentUserSubscription) {
      this.currentUserSubscription();
    }
    if (this.allUsersSubscription) {
      this.allUsersSubscription();
    }
  }
}