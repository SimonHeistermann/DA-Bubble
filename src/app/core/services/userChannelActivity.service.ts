import {inject, Injectable } from "@angular/core";
import { where } from "firebase/firestore";
import { DataService } from "./data-service/data.service";
import { catchError, from, Observable } from "rxjs";
import { UserChannelActivity, UserChannelActivityData } from "../models/userChannelActivity.interface";

@Injectable({
    providedIn: 'root'
})
export class UserChannelActivityService{
    private readonly COL_NAME = 'userChannelActivities';
    dataService = inject(DataService);

    markChannelMessageAsReadByCurrentUser(currentUserId: string, channelID: string) {
        this.getUserChannelActivityByIDsOnce(currentUserId, channelID, (data: any) => {
        const activities = [...data];
        if(activities.length === 1) {
            const userChannelActivity = activities[0];
            this.markAsSeenForExistedActivity({userID: currentUserId, channelID: channelID}, userChannelActivity.id);
        } else if(activities.length === 0) {
            this.markAsSeenForNewActivity({userID: currentUserId, channelID: channelID});
        }
        })
    }
    

    markAsSeenForExistedActivity(data: Partial<UserChannelActivityData>, id:string): Observable<void> {
        return from(
            this.dataService.updateDocument(this.COL_NAME, id, data)
        ).pipe(
            catchError(e => {
                console.log('Error when updading userChannelActivity:', e);
                throw e;
            })
        );
    }

    markAsSeenForNewActivity(data: Partial<UserChannelActivityData>): Observable<string> {
        return from(
            this.dataService.addDocument(this.COL_NAME, data)
        ).pipe(
            catchError(e => {
                console.log('Error when adding one userChannelActivity:', e);
                throw e;
            })
        );
    }

    getUserChannelActivities(callback: (data: any) => void) {
        return this.dataService.subscribeToCollection(
                this.COL_NAME, callback, 
        ); 
    }

    getUserChannelActivityByIDs(userID: string, channelID: string, callback: (data: any) => void) {
        return this.dataService.subscribeToCollection(
                this.COL_NAME, callback, 
                where('channelID', '==', channelID),
                where('userID', '==', userID),
        ); 
    }

    getUserChannelActivityByIDsOnce(userID: string, channelID: string, callback: (data: any) => void) {
        return this.dataService.subscribeToCollectionOnce(
                this.COL_NAME, callback, 
                where('channelID', '==', channelID),
                where('userID', '==', userID),
        ); 
    }
}