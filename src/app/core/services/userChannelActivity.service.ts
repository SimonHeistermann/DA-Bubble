import {inject, Injectable, OnDestroy } from "@angular/core";
import { collection, CollectionReference, doc, DocumentReference, onSnapshot, orderBy, query, QueryConstraint, QuerySnapshot, Timestamp, where } from "firebase/firestore";
import { Firestore } from "@angular/fire/firestore";
import { DataService } from "./data-service/data.service";
import { catchError, from, Observable } from "rxjs";
import { userChannelActivityData } from "../models/userChannelActivity.interface";

@Injectable({
    providedIn: 'root'
})
export class userChannelActivityService{
    private readonly COL_NAME = 'userChannelActivities';
    firestore = inject(Firestore);
    dataService = inject(DataService);

    addOneUserChannelActivity(data: userChannelActivityData): Observable<string> {
        return from(
            this.dataService.addDocument(this.COL_NAME, data)
        ).pipe(
            catchError(e => {
                console.log('Error when adding one userChannelActivity:', e);
                throw e;
            })
        );
    }

    updateUserChannelActivity(docId: string, data: userChannelActivityData): Observable<void> {
        return from(
            this.dataService.updateDocument(this.COL_NAME, docId, data)
        ).pipe(
            catchError(e => {
                console.log('Error when updating userChannelActivity:', e);
                throw e;
            })
        );
    }


   

}