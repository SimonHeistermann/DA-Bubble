import {inject, Injectable } from "@angular/core";
import { where } from "firebase/firestore";
import { DataService } from "./data-service/data.service";
import { catchError, from, Observable, switchMap, of, map, Subject } from "rxjs";
import { UserReadActivity, UserReadActivityData } from "../models/userReadActivity.interface";

@Injectable({
    providedIn: 'root'
})
export class UserChannelActivityService{
    private readonly COL_NAME = 'userReadActivities';
    private focusCallBack: (() => void) | null = null;

    private _clearFocus = new Subject<void>();
    clearOldFocus$ = this._clearFocus.asObservable();


    dataService = inject(DataService);

    registerFocusHandler(callback: () => void) : void {
        this.focusCallBack = callback;
    }

    focus(): void {
        if (this.focusCallBack){
            this.focusCallBack()
        }
    }

    clear(): void {
        this.focusCallBack = null;
    }

    clearOldFocus(): void {
        this._clearFocus.next();
    }


    markMessageAsReadByCurrentUser(currentUserId: string, activityID: string) {
        this.getUserReadActivityByIDsOnce(currentUserId, activityID, (data: UserReadActivity[]) => {
        const activities = [...data];
        if(activities.length === 1) {
            const userChannelActivity = activities[0];
            this.markAsSeenForExistedActivity({userID: currentUserId, activityID: activityID}, userChannelActivity.id);
        } else if(activities.length === 0) {
            this.markAsSeenForNewActivity({userID: currentUserId, activityID: activityID});
        }
        })
        this.focus();
    }
    

    markAsSeenForExistedActivity(data: Partial<UserReadActivityData>, id:string): Observable<void> {
        return from(
            this.dataService.updateDocument(this.COL_NAME, id, data)
        ).pipe(
            catchError(e => {
                throw e;
            })
        );
    }

    markAsSeenForNewActivity(data: Partial<UserReadActivityData>): Observable<string> {
        return from(
            this.dataService.addDocument(this.COL_NAME, data)
        ).pipe(
            catchError(e => {
                throw e;
            })
        );
    }

    getUserReadActivities(callback: (data: any) => void) {
        return this.dataService.subscribeToCollection(
                this.COL_NAME, callback, 
        ); 
    }

    getUserReadActivityByIDs(userID: string, activityID: string, callback: (data: any) => void) {
        return this.dataService.subscribeToCollection(
                this.COL_NAME, callback, 
                where('activityID', '==', activityID),
                where('userID', '==', userID),
        ); 
    }

    getUserReadActivityByIDsOnce(userID: string, activityID: string, callback: (data: any) => void) {
        return this.dataService.subscribeToCollectionOnce(
                this.COL_NAME, callback, 
                where('activityID', '==', activityID),
                where('userID', '==', userID),
        ); 
    }

    deleteActivitiesByUser(userId: string): Observable<void> {
        return from(this.dataService.getCollectionOncePromise(this.COL_NAME)).pipe(
          switchMap((activities: UserReadActivity[]) => {
            const toDelete = activities.filter(a => a.userID === userId);
            const deletes = toDelete.map(act => this.dataService.deleteDocument(this.COL_NAME, act.id));
            return from(Promise.all(deletes)).pipe(map(() => void 0));
          }),
          catchError(error => {
            return of(void 0);
          })
        );
      }      
}