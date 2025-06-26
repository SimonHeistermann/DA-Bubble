import { Injectable } from '@angular/core';
import { User as FirebaseUser } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { FirebaseService } from '../firebase-service/firebase.service';
import { UserProfileService } from './../user-profile-service/user-profile.service';
import { RegisterData } from '../../models/auth.interface';
import { User } from '../../models/user.interface';
import { APP_CONSTANTS } from '../../constants/app.constants';

@Injectable({
  providedIn: 'root'
})
export class FirestoreSyncService {

  constructor(
    private firebaseService: FirebaseService,
    private userProfileService: UserProfileService
  ) {}

  // ========== USER SYNC METHODS ==========

  async syncUserToFirestore(firebaseUser: FirebaseUser, registerData?: RegisterData): Promise<boolean> {
    try {
      const existingUser = await this.getExistingUser(firebaseUser.uid);
      const now = Timestamp.now();
      
      return await this.handleUserSync(firebaseUser, existingUser, now, registerData);
    } catch (error) {
      console.error('Error syncing user to Firestore:', error);
      return false;
    }
  }

  private async handleUserSync(
    firebaseUser: FirebaseUser, 
    existingUser: any, 
    now: Timestamp, 
    registerData?: RegisterData
  ): Promise<boolean> {
    if (!existingUser) {
      await this.createNewUserInFirestore(firebaseUser, now, registerData);
      return true;
    } else {
      await this.userProfileService.updateUserLastSeen(firebaseUser.uid);
      return false;
    }
  }

  private async getExistingUser(uid: string): Promise<any> {
    return await this.firebaseService.getDocument(
      APP_CONSTANTS.COLLECTIONS.USERS, 
      uid
    );
  }

  private async createNewUserInFirestore(
    firebaseUser: FirebaseUser, 
    timestamp: Timestamp, 
    registerData?: RegisterData
  ): Promise<void> {
    const newUser: Omit<User, 'id'> = this.userProfileService.buildNewUserData(
      firebaseUser, 
      timestamp, 
      registerData
    );
    
    await this.firebaseService.setDocument(
      APP_CONSTANTS.COLLECTIONS.USERS,
      firebaseUser.uid,
      newUser
    );
  }
}