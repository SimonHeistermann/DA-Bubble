import { Timestamp } from "firebase/firestore";

export interface UserChannelActivityData {
    channelID: string;
    userID: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface UserChannelActivity extends UserChannelActivityData {
    id: string;
}