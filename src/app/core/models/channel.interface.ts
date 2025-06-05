import { Timestamp } from 'firebase/firestore';

export interface Channel {
    cID: string;
    name: string;
    description?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    userIDs?: string[];
}
