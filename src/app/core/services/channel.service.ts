import {inject, Injectable, OnDestroy } from "@angular/core";
import { collection, CollectionReference, doc, DocumentReference, onSnapshot, orderBy, query, QueryConstraint, QuerySnapshot, Timestamp, where } from "firebase/firestore";
import { Firestore } from "@angular/fire/firestore";
import { Channel, ChannelData } from "../models/channel.interface";
import { DataService } from "./data-service/data.service";
import { catchError, from, Observable, of } from "rxjs";
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
                throw e;
            })
        );
    }

    addOneChannel(data: Partial<ChannelData>): Observable<string> {
        return from(
            this.dataService.addDocument(this.CHANNEL_COL_NAME, data)
        ).pipe(
            catchError(e => {
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

    getChannelByNameOnce(name: string): Observable<Channel[]> {
        return from(
          this.dataService.getCollectionOncePromise(
            'channels',
            where('name', '==', name)
          )
        ).pipe(
          catchError(error => {
            return of([]);
          })
        );
    }      

    getChannelById(id: string): Observable<Channel>{
        return from(
            this.dataService.getDocument(this.CHANNEL_COL_NAME, id)
        ).pipe(
            catchError(e => {
                throw e;
            })
        );
    }

    getAllChannelsOnce(): Observable<Channel[]> {
        return from(this.dataService.getCollectionOncePromise(this.CHANNEL_COL_NAME)).pipe(
          catchError(error => {
            return of([]);
          })
        );
      }      

}