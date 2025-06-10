import { Timestamp } from 'firebase/firestore';

export interface ChannelData {
    name: string;
    description?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    userIDs?: string[];
}


export interface Channel extends ChannelData {
    id: string;
}

