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
export class ChannelService implements OnDestroy{
    private readonly CHANNEL_COL_NAME = 'channels';
    firestore = inject(Firestore);
    dataService = inject(DataService);
    getUsersUnsub?: () => void;

    constructor() {

    }

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

    getChannelsOrderByCreatedAt(callback: (data: Channel[]) => void){
        return this.dataService.subscribeToCollection(this.CHANNEL_COL_NAME, callback, orderBy('createdAt', 'asc')); 
    }

    getChannelByName(name: string, callback: (data: Channel[]) => void){
        return this.dataService.subscribeToCollection(this.CHANNEL_COL_NAME, callback, where('name', '==',  name)); 
    }

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

    ngOnDestroy(): void {
        this.getUsersUnsub?.();
    }
}