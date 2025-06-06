import {inject, Injectable, OnDestroy } from "@angular/core";
import { collection, CollectionReference, doc, DocumentReference, onSnapshot, query, QueryConstraint, QuerySnapshot, Timestamp } from "firebase/firestore";
import { Firestore } from "@angular/fire/firestore";
import { Channel } from "../models/channel.interface";

@Injectable({
    providedIn: 'root'
})
export class ChannelService implements OnDestroy{
    firestore = inject(Firestore);
    getUsersUnsub?: () => void;

    constructor() {

    }

    fromAnyToChannel(id: string, obj: any): Channel {
        return {
            cID: id,
            name: obj['name'],
            description: obj['description'],
            createdAt: obj['createdAt'],
            updatedAt: obj['updatedAt'],
            userIDs: obj['userIDs'],
        }
    }

    getChannels(callback: (data: Channel[]) => void){
        try {
            const colRef = this.getCollectionRef('channels');
            this.getUsersUnsub = onSnapshot(colRef, (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    cID: doc.id,
                    ...doc.data()
                }));

                callback(data.map(d => this.fromAnyToChannel(d['cID'], d)));
            }, (error) => {
                console.error(`Error subscribing to channels:`, error);
            });
        } catch (error) {
            console.error(`Error setting up subscription for channels:`, error);
        }
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