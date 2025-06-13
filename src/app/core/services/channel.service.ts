import {inject, Injectable, OnDestroy } from "@angular/core";
import { collection, CollectionReference, doc, DocumentReference, onSnapshot, orderBy, query, QueryConstraint, QuerySnapshot, Timestamp, where } from "firebase/firestore";
import { Firestore } from "@angular/fire/firestore";
import { Channel, ChannelData } from "../models/channel.interface";
import { DataService } from "./data-service/data.service";
import { catchError, from, Observable } from "rxjs";
import { Unsubscribe } from "firebase/auth";

@Injectable({
    providedIn: 'root'
})
export class ChannelService{
    private readonly CHANNEL_COL_NAME = 'channels';
    firestore = inject(Firestore);
    dataService = inject(DataService);

    updateChannel(docId: string, data: ChannelData): Observable<void> {
        return from(
            this.dataService.updateDocument(this.CHANNEL_COL_NAME, docId, data)
        ).pipe(
            catchError(e => {
                console.log('Error when updating channel:', e);
                throw e;
            })
        );
    }

    addOneChannel(data: Partial<ChannelData>): Observable<string> {
        return from(
            this.dataService.addDocument(this.CHANNEL_COL_NAME, data)
        ).pipe(
            catchError(e => {
                console.log('Error when adding one channel:', e);
                throw e;
            })
        );
    }

    getChannels(callback: (data: Channel[]) => void){
        return this.dataService.subscribeToCollection(this.CHANNEL_COL_NAME, callback); 
    }

    getChannelsOrderByCreatedAt(currentUserID: string, callback: (data: Channel[]) => void){
        return this.dataService.subscribeToCollection(
            this.CHANNEL_COL_NAME, callback, 
            orderBy('createdAt', 'asc'),
            where('userIDs', 'array-contains', currentUserID),
        ); 
    }

    getChannelByName(name: string, callback: (data: Channel[]) => void){
        return this.dataService.subscribeToCollection(this.CHANNEL_COL_NAME, callback, where('name', '==',  name)); 
    }

}