import { Timestamp } from 'firebase/firestore';

export interface Conversation {
    coversationID: string;                        
    type: 'channel' | 'direct';                
    // createdAt: Timestamp;
    // updatedAt: Timestamp;
    channelID?: string;
    participants?: {                  
      [userUID: string]: ParticipantInfo;
    };
    messageIDs?: [];
    messageCount: number;
}

export interface ParticipantInfo {
    joinedAt: Timestamp;
    isActive: boolean;
    lastRead?: Timestamp;
}

export interface LastMessage {
    text: string;
    authorId: string;
    timestamp: Timestamp;
}