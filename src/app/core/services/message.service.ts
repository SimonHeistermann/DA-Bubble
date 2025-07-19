import {inject, Injectable, OnDestroy } from "@angular/core";
import { collection, CollectionReference, doc, DocumentReference, onSnapshot, orderBy, query, QueryConstraint, QuerySnapshot, Timestamp, where } from "firebase/firestore";
import { Firestore } from "@angular/fire/firestore";
import { Channel, ChannelData } from "../models/channel.interface";
import { DataService } from "./data-service/data.service";
import { catchError, from, Observable, switchMap, map, of } from "rxjs";
import { Message, MessageData } from "../models/message.interface";

@Injectable({
    providedIn: 'root'
})
export class MessageService{
    private readonly COL_NAME = 'messages';
    firestore = inject(Firestore);
    dataService = inject(DataService);

    addOneMessage(data: Partial<MessageData>): Observable<string> {
        return from(
            this.dataService.addDocument(this.COL_NAME, data)
        ).pipe(
            catchError(e => {
                console.log('Error when adding one message:', e);
                throw e;
            })
        );
    }

    updateMessage(docId: string, data: MessageData): Observable<void> {
        return from(
            this.dataService.updateDocument(this.COL_NAME, docId, data)
        ).pipe(
            catchError(e => {
                console.log('Error when updating message:', e);
                throw e;
            })
        );
    }

    getMessages(callback: (data: Message[]) => void){
        return this.dataService.subscribeToCollection(this.COL_NAME, callback); 
    }

    getChannelMessageOrderByCreatedAt(currentChannelID: string, callback: (data: Message[]) => void){
        return this.dataService.subscribeToCollection(
            this.COL_NAME, callback, 
            orderBy('createdAt', 'asc'),
            where('channelID', '==', currentChannelID),
            where('type',  '==',  'channel')
        ); 
    }

    getPrivateMessageOrderByCreatedAt(conversationID: string, callback: (data: Message[]) => void){
        return this.dataService.subscribeToCollection(
            this.COL_NAME, callback, 
            orderBy('createdAt', 'asc'),
            where('conversationID', '==', conversationID),
            where('type',  '==',  'private'),
        ); 
    }

    buildConversationID(userID1: string, userID2: string): string {
        return [userID1, userID2].sort().join('_');
    }

    deleteMessagesByUser(userId: string): Observable<void> {
        return from(this.dataService.getCollectionOncePromise(this.COL_NAME)).pipe(
          switchMap((messages: Message[]) => {
            const toDelete = messages.filter(m =>
              m.authorID === userId || m.recipientID === userId
            );
            const deletes = toDelete.map(msg => this.dataService.deleteDocument(this.COL_NAME, msg.id));
            return from(Promise.all(deletes)).pipe(map(() => void 0));
          }),
          catchError(error => {
            console.error('Error deleting messages by user:', error);
            return of(void 0);
          })
        );
      }      

}