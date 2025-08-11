import { Injectable, inject } from '@angular/core';
import { 
    GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword,
    signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile,
    User as FirebaseUser, onAuthStateChanged, Unsubscribe, confirmPasswordReset, verifyPasswordResetCode
} from 'firebase/auth';
import { 
    doc, setDoc, getDoc, collection, query, where,
    orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, Timestamp,
    DocumentReference, CollectionReference, QueryConstraint,
    getDocs
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
    }

    // ==================== AUTH METHODS ====================
    
    async signInWithGoogle(): Promise<FirebaseUser | null> {
        try {
            const result = await signInWithPopup(this.auth, this.googleProvider);
            return result.user;
        } catch (error) {
            throw error;
        }
    }

    async createUserWithEmail(email: string, password: string): Promise<FirebaseUser | null> {
        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            return userCredential.user;
        } catch (error) {
            throw error;
        }
    }

    async signInWithEmail(email: string, password: string): Promise<FirebaseUser | null> {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            return userCredential.user;
        } catch (error) {
            throw error;
        }
    }

    async signOut(): Promise<void> {
        try {
            await signOut(this.auth);
        } catch (error) {
            throw error;
        }
    }

    async sendPasswordReset(email: string): Promise<void> {
        try {
            await sendPasswordResetEmail(this.auth, email);
        } catch (error) {
            throw error;
        }
    }

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
            throw error;
        }
    }

    async confirmPasswordReset(oobCode: string, newPassword: string): Promise<void> {
        try {
            await confirmPasswordReset(this.auth, oobCode, newPassword);
        } catch (error) {
            throw error;
        }
    }

    async verifyPasswordResetCode(oobCode: string): Promise<string> {
        try {
            const email = await verifyPasswordResetCode(this.auth, oobCode);
            return email;
        } catch (error) {
            throw error;
        }   
    }

    onAuthStateChanged(callback: (user: FirebaseUser | null) => void): Unsubscribe {
        return onAuthStateChanged(this.auth, callback);
    }

    get currentUser(): FirebaseUser | null {
        return this.auth.currentUser;
    }

    // ==================== FIRESTORE METHODS ====================

    async setDocument(collectionName: string, docId: string, data: any): Promise<void> {
        try {
            const docRef = doc(this.firestore, collectionName, docId);
            await setDoc(docRef, data);
        } catch (error) {
            throw error;
        }
    }

    async addDocument(collectionName: string, data: any): Promise<string> {
        try {
            const colRef = collection(this.firestore, collectionName);
            const docRef = await addDoc(colRef, data);
            return docRef.id;
        } catch (error) {
            throw error;
        }
    }

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
            throw error;
        }
    }

    async updateDocument(collectionName: string, docId: string, data: any): Promise<void> {
        try {
            const docRef = doc(this.firestore, collectionName, docId);
            await updateDoc(docRef, data);
        } catch (error) {
            throw error;
        }
    }

    async updateDocumentWithReturnedID(collectionName: string, docId: string, data: any): Promise<string> {
        try {
            const docRef = doc(this.firestore, collectionName, docId);
            await updateDoc(docRef, data);
            return docId;
        } catch (error) {
            throw error;
        }
    }

    async deleteDocument(collectionName: string, docId: string): Promise<void> {
        try {
            const docRef = doc(this.firestore, collectionName, docId);
            await deleteDoc(docRef);
        } catch (error) {
            throw error;
        }
    }

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
            });
        } catch (error) {
            throw error;
        }
    }

    async getCollectionOnce(
        collectionName: string,
        callback: (data: any[]) => void,
        ...queryConstraints: QueryConstraint[]
    ): Promise<void> {
        try {
            const colRef = collection(this.firestore, collectionName);
            const q = query(colRef, ...queryConstraints);

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            callback(data);
        } catch (error) {
            throw error;
        }
    }

    async getCollectionOncePromise(
        collectionName: string,
        ...queryConstraints: QueryConstraint[]
      ): Promise<any[]> {
        try {
          const colRef = collection(this.firestore, collectionName);
          const q = query(colRef, ...queryConstraints);
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        } catch (error) {
          throw error;
        }
      }      

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
            });
        } catch (error) {
            throw error;
        }
    }

    // ==================== UTILITY METHODS ====================

    createTimestamp(): Timestamp {
        return Timestamp.now();
    }

    getCollectionRef(collectionName: string): CollectionReference {
        return collection(this.firestore, collectionName);
    }

    getDocRef(collectionName: string, docId: string): DocumentReference {
        return doc(this.firestore, collectionName, docId);
    }

    createQuery(collectionName: string, ...constraints: QueryConstraint[]) {
        const colRef = collection(this.firestore, collectionName);
        return query(colRef, ...constraints);
    }
    
}