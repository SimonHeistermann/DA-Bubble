import { InjectionToken } from '@angular/core';
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

export const CHANNEL_TOKEN = new InjectionToken<Channel>('CHANNEL_TOKEN');

