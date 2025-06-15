import { Timestamp } from "firebase/firestore";

export interface userChannelActivityData {
    channelID: string;
    userID: string;
    lastSeenAt: Timestamp
}

export interface userChannelActivity extends userChannelActivityData {
    id: string;
}