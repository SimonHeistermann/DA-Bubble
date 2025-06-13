import {inject, Injectable, OnDestroy } from "@angular/core";
import { collection, CollectionReference, doc, DocumentReference, onSnapshot, orderBy, query, QueryConstraint, QuerySnapshot, Timestamp, where } from "firebase/firestore";
import { Firestore } from "@angular/fire/firestore";
import { Channel, ChannelData } from "../models/channel.interface";
import { DataService } from "./data-service/data.service";
import { catchError, from, Observable } from "rxjs";
import { Message } from "../models/message.interface";

@Injectable({
    providedIn: 'root'
})
export class MessageService{
    private readonly CHANNEL_COL_NAME = 'messages';
    firestore = inject(Firestore);
    dataService = inject(DataService);


    getMessages(callback: (data: Message[]) => void){
        return this.dataService.subscribeToCollection(this.CHANNEL_COL_NAME, callback); 
    }

    getChannelMessageOrderByCreatedAt(currentChannelID: string, callback: (data: Message[]) => void){
        return this.dataService.subscribeToCollection(
            this.CHANNEL_COL_NAME, callback, 
            orderBy('createdAt', 'asc'),
            where('channelID', '==', currentChannelID),
        ); 
    }

   

}