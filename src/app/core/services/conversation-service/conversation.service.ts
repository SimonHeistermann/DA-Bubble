import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  deleteDoc, 
  getFirestore 
} from 'firebase/firestore';
import { Conversation } from './../../models/conversation.interface';

@Injectable({ providedIn: 'root' })
export class ConversationService {
  private db = getFirestore();
  private collectionName = 'conversations';

  getConversationsByUser(userId: string): Observable<Conversation[]> {
    if (!this.isGuestUser(userId)) {
      return of([]);
    }
    const conversationsRef = collection(this.db, this.collectionName);
    const q = query(conversationsRef, where('createdBy', '==', userId)); 
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({
        coversationID: doc.id,
        ...doc.data()
      } as Conversation))),
      catchError(() => of([]))
    );
  }

  deleteConversation(conversationId: string): Observable<void> {
    const docRef = doc(this.db, this.collectionName, conversationId);
    return from(deleteDoc(docRef)).pipe(
      map(() => void 0),
      catchError(() => of(void 0))
    );
  }

  private isGuestUser(userId: string): boolean {
    return userId.startsWith('guest_');
  }
}