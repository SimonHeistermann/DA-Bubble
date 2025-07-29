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
  updateDoc, 
  getFirestore 
} from 'firebase/firestore';
import { ThreadMessage } from './../../models/message.interface';

@Injectable({ providedIn: 'root' })
export class ThreadMessageService {
  private db = getFirestore();
  private collectionName = 'threadMessages';

  getThreadMessagesByAuthor(authorId: string): Observable<ThreadMessage[]> {
    if (!this.isGuestUser(authorId)) {
      return of([]);
    }
    const threadMessagesRef = collection(this.db, this.collectionName);
    const q = query(threadMessagesRef, where('authorId', '==', authorId));
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ThreadMessage))),
      catchError(() => of([]))
    );
  }

  deleteThreadMessage(threadMessageId: string): Observable<void> {
    const docRef = doc(this.db, this.collectionName, threadMessageId);
    return from(deleteDoc(docRef)).pipe(
      map(() => void 0),
      catchError(() => of(void 0))
    );
  }

  updateThreadMessage(id: string, updates: Partial<ThreadMessage>): Observable<void> {
    const docRef = doc(this.db, this.collectionName, id);
    return from(updateDoc(docRef, updates)).pipe(
      map(() => void 0),
      catchError(() => of(void 0))
    );
  }

  getAllThreadMessages(): Observable<ThreadMessage[]> {
    const threadMessagesRef = collection(this.db, this.collectionName);
    return from(getDocs(threadMessagesRef)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ThreadMessage))),
      catchError(() => of([]))
    );
  }

  private isGuestUser(userId: string): boolean {
    return userId.startsWith('guest_');
  }
}