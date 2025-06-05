import { Injectable, inject } from '@angular/core';
import { Timestamp, where } from 'firebase/firestore';
import { FirebaseService } from './../firebase-service/firebase.service';

@Injectable({
  providedIn: 'root'
})
export class DataService {
    private firebaseCore = inject(FirebaseService);

    constructor() {
        console.log('📊 Data Service initialized');
    }

    // ==================== ENHANCED DOCUMENT OPERATIONS ====================

    /**
     * Dokument erstellen/überschreiben mit automatischen Timestamps
     */
    async setDocument(collectionName: string, docId: string, data: any): Promise<void> {
        const documentData = {
            ...data,
            updatedAt: this.firebaseCore.createTimestamp()
        };
        return this.firebaseCore.setDocument(collectionName, docId, documentData);
    }

    /**
     * Dokument hinzufügen mit automatischen Timestamps
     */
    async addDocument(collectionName: string, data: any): Promise<string> {
        const documentData = {
            ...data,
            createdAt: this.firebaseCore.createTimestamp(),
            updatedAt: this.firebaseCore.createTimestamp()
        };
        return this.firebaseCore.addDocument(collectionName, documentData);
    }

    /**
     * Dokument aktualisieren mit automatischem Timestamp
     */
    async updateDocument(collectionName: string, docId: string, data: any): Promise<void> {
        const updateData = {
            ...data,
            updatedAt: this.firebaseCore.createTimestamp()
        };
        return this.firebaseCore.updateDocument(collectionName, docId, updateData);
    }

    // ==================== DELEGATED METHODS ====================

    /**
     * Dokument lesen
     */
    async getDocument(collectionName: string, docId: string): Promise<any | null> {
        return this.firebaseCore.getDocument(collectionName, docId);
    }

    /**
     * Dokument löschen
     */
    async deleteDocument(collectionName: string, docId: string): Promise<void> {
        return this.firebaseCore.deleteDocument(collectionName, docId);
    }

    /**
     * Collection mit Query überwachen
     */
    subscribeToCollection(collectionName: string, callback: (data: any[]) => void, ...queryConstraints: any[]) {
        return this.firebaseCore.subscribeToCollection(collectionName, callback, ...queryConstraints);
    }

    /**
     * Einzelnes Dokument überwachen
     */
    subscribeToDocument(collectionName: string, docId: string, callback: (data: any | null) => void) {
        return this.firebaseCore.subscribeToDocument(collectionName, docId, callback);
    }

    // ==================== CONVENIENCE METHODS ====================

    /**
     * Benutzer-spezifisches Dokument erstellen
     */
    async setUserDocument(userId: string, data: any): Promise<void> {
        return this.setDocument('users', userId, data);
    }

    /**
     * Benutzer-spezifisches Dokument laden
     */
    async getUserDocument(userId: string): Promise<any | null> {
        return this.getDocument('users', userId);
    }

    /**
     * Collection nach Benutzer filtern
     */
    subscribeToUserCollection(collectionName: string, userId: string, callback: (data: any[]) => void) {
        const whereConstraint = where('userId', '==', userId);
        return this.firebaseCore.subscribeToCollection(collectionName, callback, whereConstraint);
    }

    /**
     * Batch-Operation für mehrere Dokumente
     */
    async batchUpdateDocuments(collectionName: string, updates: { docId: string, data: any }[]): Promise<void> {
        const promises = updates.map(update => 
            this.updateDocument(collectionName, update.docId, update.data)
        );
        await Promise.all(promises);
    }

    /**
     * Existiert Dokument?
     */
    async documentExists(collectionName: string, docId: string): Promise<boolean> {
        const doc = await this.getDocument(collectionName, docId);
        return doc !== null;
    }

    /**
     * Timestamp-Hilfsmethoden
     */
    createTimestamp(): Timestamp {
        return this.firebaseCore.createTimestamp();
    }

    timestampToDate(timestamp: Timestamp): Date {
        return timestamp.toDate();
    }

    dateToTimestamp(date: Date): Timestamp {
        return Timestamp.fromDate(date);
    }
}
