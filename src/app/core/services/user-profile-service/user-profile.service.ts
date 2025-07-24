import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { User as FirebaseUser } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { FirebaseService } from '../firebase-service/firebase.service';
import { RegisterData, AuthUser } from '../../models/auth.interface';
import { User } from '../../models/user.interface';
import { APP_CONSTANTS } from '../../constants/app.constants';

@Injectable({
  providedIn: 'root'
})
export class UserProfileService {
  private readonly availableAvatars = [
    '/icons/avatars/avatar_1.png',
    '/icons/avatars/avatar_2.png',
    '/icons/avatars/avatar_3.png',
    '/icons/avatars/avatar_4.png',
    '/icons/avatars/avatar_5.png',
    '/icons/avatars/avatar_6.png'
  ];

  constructor(private firebaseService: FirebaseService) {}

  // ========== AVATAR MANAGEMENT ==========

  getRandomAvatar(): string {
    const randomIndex = Math.floor(Math.random() * this.availableAvatars.length);
    return this.availableAvatars[randomIndex];
  }

  updateUserAvatar(currentUser: AuthUser, avatarPath: string): Observable<AuthUser> {
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
      map(() => ({ ...currentUser, photoURL: avatarPath }))
    );
  }

  // ========== USER DATA CREATION ==========

  buildNewUserData(firebaseUser: FirebaseUser, timestamp: Timestamp, registerData?: RegisterData): Omit<User, 'id'> {
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
    return {
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
  }

  private createUserDataObject(
    firebaseUser: FirebaseUser, 
    timestamp: Timestamp, 
    nameParts: {firstName: string, lastName: string}, 
    randomAvatar: string
  ): Omit<User, 'id'> {
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

  // ========== USER STATUS MANAGEMENT ==========

  async updateUserLastSeen(uid: string): Promise<void> {
    const timestamp = Timestamp.now();
    await this.firebaseService.updateDocument(
      APP_CONSTANTS.COLLECTIONS.USERS,
      uid,
      {
        lastSeen: timestamp,
        isActive: true
      }
    );
  }

  async setUserOfflineStatus(uid: string): Promise<void> {
    try {
      await this.firebaseService.updateDocument(
        APP_CONSTANTS.COLLECTIONS.USERS,
        uid,
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