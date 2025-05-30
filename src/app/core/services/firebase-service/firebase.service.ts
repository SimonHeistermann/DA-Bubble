import { Injectable, inject } from '@angular/core';
import { 
    GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword,
    signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile,
    User as FirebaseUser, onAuthStateChanged, Unsubscribe, confirmPasswordReset, verifyPasswordResetCode
} from 'firebase/auth';
import { 
    doc, setDoc, getDoc, collection, query, where,
    orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, Timestamp,
    DocumentReference, CollectionReference, QueryConstraint
} from 'firebase/firestore';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
    private auth = inject(Auth);           
    private firestore = inject(Firestore);
    private googleProvider = new GoogleAuthProvider();
  
    constructor() {
      this.googleProvider.setCustomParameters({
        prompt: 'select_account'
      });
      console.log('🔥 Firebase Service initialized');
    }

    /**
    * Google Sign-In
    */
    async signInWithGoogle(): Promise<FirebaseUser | null> {
        try {
            const result = await signInWithPopup(this.auth, this.googleProvider);
            return result.user;
        } catch (error) {
            console.error('Google Sign-In Error:', error);
            throw error;
        }
    }

    async createUserWithEmail(email: string, password: string): Promise<FirebaseUser | null> {
        try {
        const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
        return userCredential.user;
        } catch (error) {
        console.error('Email Registration Error:', error);
        throw error;
        }
    }

    /**
    * E-Mail/Passwort Anmeldung
    */
    async signInWithEmail(email: string, password: string): Promise<FirebaseUser | null> {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            return userCredential.user;
        } catch (error) {
            console.error('Email Sign-In Error:', error);
            throw error;
        }
    }

    /**
    * Benutzer abmelden
    */
    async signOut(): Promise<void> {
        try {
            await signOut(this.auth);
        } catch (error) {
            console.error('Sign Out Error:', error);
            throw error;
        }
    }

    /**
    * Passwort zurücksetzen
    */
    async sendPasswordReset(email: string): Promise<void> {
        try {
            await sendPasswordResetEmail(this.auth, email);
        } catch (error) {
            console.error('Password Reset Error:', error);
            throw error;
        }
    }

    /**
    * Profil aktualisieren
    */
    async updateUserProfile(displayName?: string, photoURL?: string): Promise<void> {
        if (!this.auth.currentUser) {
            throw new Error('No authenticated user');
        }
        try {
            await updateProfile(this.auth.currentUser, {
                displayName: displayName || undefined,
                photoURL: photoURL || undefined
        });
        } catch (error) {
            console.error('Update Profile Error:', error);
            throw error;
        }
    }

    /**
    * Auth State Observer - Überwacht Anmeldestatus
    */
    onAuthStateChanged(callback: (user: FirebaseUser | null) => void): Unsubscribe {
        return onAuthStateChanged(this.auth, callback);
    }

    /**
    * Aktueller Benutzer
    */
    get currentUser(): FirebaseUser | null {
        return this.auth.currentUser;
    }

    /**
    * Dokument erstellen/überschreiben
    */
    async setDocument(collectionName: string, docId: string, data: any): Promise<void> {
        try {
        const docRef = doc(this.firestore, collectionName, docId);
        await setDoc(docRef, {
            ...data,
            updatedAt: Timestamp.now()
        });
        } catch (error) {
            console.error(`Error setting document in ${collectionName}:`, error);
            throw error;
        }
    }

    /**
    * Dokument hinzufügen (Auto-ID)
    */
    async addDocument(collectionName: string, data: any): Promise<string> {
        try {
            const colRef = collection(this.firestore, collectionName);
            const docRef = await addDoc(colRef, {
                ...data,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            return docRef.id;
        } catch (error) {
            console.error(`Error adding document to ${collectionName}:`, error);
            throw error;
        }
    }

    /**
    * Dokument lesen
    */
    async getDocument(collectionName: string, docId: string): Promise<any | null> {
        try {
            const docRef = doc(this.firestore, collectionName, docId);
            const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            return null;
        }
        } catch (error) {
            console.error(`Error getting document from ${collectionName}:`, error);
            throw error;
        }
    }

    /**
    * Dokument aktualisieren
    */
    async updateDocument(collectionName: string, docId: string, data: any): Promise<void> {
        try {
            const docRef = doc(this.firestore, collectionName, docId);
            await updateDoc(docRef, {
                ...data,
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            console.error(`Error updating document in ${collectionName}:`, error);
            throw error;
        }
    }

    /**
    * Dokument löschen
    */
    async deleteDocument(collectionName: string, docId: string): Promise<void> {
        try {
            const docRef = doc(this.firestore, collectionName, docId);
            await deleteDoc(docRef);
        } catch (error) {
            console.error(`Error deleting document from ${collectionName}:`, error);
            throw error;
        }
    }

    /**
    * Collection mit Query überwachen
    */
    subscribeToCollection(
        collectionName: string,
        callback: (data: any[]) => void,
        ...queryConstraints: QueryConstraint[]
        ): Unsubscribe {
        try {
            const colRef = collection(this.firestore, collectionName);
            const q = query(colRef, ...queryConstraints);
      
            return onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
                }));
                callback(data);
            }, (error) => {
                console.error(`Error subscribing to ${collectionName}:`, error);
            });
        } catch (error) {
            console.error(`Error setting up subscription for ${collectionName}:`, error);
            throw error;
        }
    }

    /**
    * Einzelnes Dokument überwachen
    */
    subscribeToDocument(
        collectionName: string,
        docId: string,
        callback: (data: any | null) => void
    ): Unsubscribe {
        try {
            const docRef = doc(this.firestore, collectionName, docId);
            return onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    callback({ id: docSnap.id, ...docSnap.data() });
                } else {
                    callback(null);
                }
            }, (error) => {
                console.error(`Error subscribing to document ${docId} in ${collectionName}:`, error);
            });
        } catch (error) {
            console.error(`Error setting up document subscription:`, error);
            throw error;
        }
    }

    /**
    * Timestamp erstellen
    */
    createTimestamp(): Timestamp {
        return Timestamp.now();
    }

    /**
     * Collection Reference erstellen
    */
    getCollectionRef(collectionName: string): CollectionReference {
        return collection(this.firestore, collectionName);
    }

    /**
    * Document Reference erstellen
    */
    getDocRef(collectionName: string, docId: string): DocumentReference {
        return doc(this.firestore, collectionName, docId);
    }

    /**
    * Firestore Query Constraints Helper
    */
    createQuery(collectionName: string, ...constraints: QueryConstraint[]) {
        const colRef = collection(this.firestore, collectionName);
        return query(colRef, ...constraints);
    }

    /**
    * Passwort mit Reset-Code zurücksetzen
    */
    async confirmPasswordReset(oobCode: string, newPassword: string): Promise<void> {
        try {
            await confirmPasswordReset(this.auth, oobCode, newPassword);
        } catch (error) {
            console.error('Confirm Password Reset Error:', error);
            throw error;
        }
    }

    /**
     * Reset-Code validieren und E-Mail zurückgeben
    */
    async verifyPasswordResetCode(oobCode: string): Promise<string> {
        try {
            const email = await verifyPasswordResetCode(this.auth, oobCode);
            return email;
        } catch (error) {
            console.error('Verify Password Reset Code Error:', error);
            throw error;
        }   
    }
}