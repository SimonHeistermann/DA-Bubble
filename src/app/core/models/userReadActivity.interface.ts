import { Timestamp } from "firebase/firestore";

export interface UserReadActivityData {
    activityID: string;
    userID: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface UserReadActivity extends UserReadActivityData {
    id: string;
}