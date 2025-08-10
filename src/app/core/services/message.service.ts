import { inject, Injectable } from "@angular/core";
import { collection, doc, orderBy, query, where, getDoc, getDocs, updateDoc } from "firebase/firestore";
import { Firestore } from "@angular/fire/firestore";
import { DataService } from "./data-service/data.service";
import { catchError, from, Observable, switchMap, map, of } from "rxjs";
import { Message, MessageData } from "../models/message.interface";

@Injectable({
    providedIn: 'root'
})
export class MessageService {
    private readonly COL_NAME = 'messages';
    firestore = inject(Firestore);
    dataService = inject(DataService);

    // ========== EXISTING METHODS (UNCHANGED) ==========

    addOneMessage(data: Partial<MessageData>): Observable<string> {
        return from(
            this.dataService.addDocument(this.COL_NAME, data)
        ).pipe(
            catchError(e => {
                throw e;
            })
        );
    }

    updateMessage(docId: string, data: MessageData): Observable<void>;
    updateMessage(docId: string, data: Partial<Message>): Observable<void>;
    updateMessage(docId: string, data: MessageData | Partial<Message>): Observable<void> {
        return from(
            this.dataService.updateDocument(this.COL_NAME, docId, data)
        ).pipe(
            catchError(e => {
                throw e;
            })
        );
    }

    getMessages(callback: (data: Message[]) => void) {
        return this.dataService.subscribeToCollection(this.COL_NAME, callback); 
    }

    getChannelMessageOrderByCreatedAt(currentChannelID: string, callback: (data: Message[]) => void) {
        return this.dataService.subscribeToCollection(
            this.COL_NAME, callback, 
            orderBy('createdAt', 'asc'),
            where('channelID', '==', currentChannelID),
            where('type', '==', 'channel')
        ); 
    }

    getPrivateMessageOrderByCreatedAt(conversationID: string, callback: (data: Message[]) => void) {
        return this.dataService.subscribeToCollection(
            this.COL_NAME, callback, 
            orderBy('createdAt', 'asc'),
            where('conversationID', '==', conversationID),
            where('type', '==', 'private'),
        ); 
    }

    buildConversationID(userID1: string, userID2: string): string {
        return [userID1, userID2].sort().join('_');
    }

    // ========== NEW GUEST-CLEANUP METHODS ==========

    getMessageById(messageId: string): Observable<Message | null> {
        const docRef = doc(this.firestore, this.COL_NAME, messageId);
        return from(getDoc(docRef)).pipe(
            map(docSnap => docSnap.exists() ? {
                id: docSnap.id,
                ...docSnap.data()
            } as Message : null),
            catchError(error => {
                console.error('Error getting message by ID:', error);
                return of(null);
            })
        );
    }

    getAllMessages(): Observable<Message[]> {
        const messagesRef = collection(this.firestore, this.COL_NAME);
        return from(getDocs(messagesRef)).pipe(
            map(snapshot => snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Message))),
            catchError(error => {
                console.error('Error getting all messages:', error);
                return of([]);
            })
        );
    }

    deleteMessagesByUser(userId: string): Observable<void> {
        if (!this.isGuestUser(userId)) {
            console.warn('Attempted to delete messages for non-guest user:', userId);
            return of(void 0);
        }
        return from(this.dataService.getCollectionOncePromise(this.COL_NAME)).pipe(
            switchMap((messages: Message[]) => {
                const toDelete = messages.filter(m => 
                    this.shouldDeleteMessage(m, userId)
                );
                if (toDelete.length === 0) {
                    return of(void 0);
                }
                const deletePromises = toDelete.map(msg => 
                    this.dataService.deleteDocument(this.COL_NAME, msg.id)
                );
                return from(Promise.all(deletePromises)).pipe(
                    map(() => void 0)
                );
            }),
            catchError(error => {
                console.error('Error deleting messages by user:', error);
                return of(void 0);
            })
        );
    }

    // ========== PRIVATE HELPER METHODS ==========

    private shouldDeleteMessage(message: Message, userId: string): boolean {
        return message.authorID === userId || 
               (message.recipientID === userId && this.isGuestUser(userId));
    }

    private isSensitiveUpdate(data: MessageData | Partial<Message>): boolean {
        return 'reactions' in data || 'threadCount' in data;
    }

    private isGuestUser(userId: string): boolean {
        return userId.startsWith('guest_');
    }
}