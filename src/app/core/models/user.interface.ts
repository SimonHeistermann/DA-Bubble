import { Timestamp } from 'firebase/firestore';

export interface User {
    id: string;
    email: string;
    displayName: string;
    photoURL: string;
    lastSeen: Timestamp;
    isActive: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    profile: UserProfile;
}

export interface UserProfile {
    firstName: string;
    lastName: string;
}