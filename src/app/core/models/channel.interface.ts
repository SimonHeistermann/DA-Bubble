import { Timestamp } from 'firebase/firestore';

export interface ChannelData {
    name: string;
    description?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
    userIDs: string[];
}


export interface Channel extends ChannelData {
    id: string;
}

