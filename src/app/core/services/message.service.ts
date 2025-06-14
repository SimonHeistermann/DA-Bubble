import {inject, Injectable, OnDestroy } from "@angular/core";
import { collection, CollectionReference, doc, DocumentReference, onSnapshot, orderBy, query, QueryConstraint, QuerySnapshot, Timestamp, where } from "firebase/firestore";
import { Firestore } from "@angular/fire/firestore";
import { Channel, ChannelData } from "../models/channel.interface";
import { DataService } from "./data-service/data.service";
import { catchError, from, Observable } from "rxjs";
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


    getMessages(callback: (data: Message[]) => void){
        return this.dataService.subscribeToCollection(this.COL_NAME, callback); 
    }

    getChannelMessageOrderByCreatedAt(currentChannelID: string, callback: (data: Message[]) => void){
        return this.dataService.subscribeToCollection(
            this.COL_NAME, callback, 
            orderBy('createdAt', 'asc'),
            where('channelID', '==', currentChannelID),
        ); 
    }

   

}