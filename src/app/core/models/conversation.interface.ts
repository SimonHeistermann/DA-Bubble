import { Timestamp } from 'firebase/firestore';

export interface Conversation {
    name?: string;                    
    description?: string;             
    type: 'channel' | 'direct';       
    createdBy: string;                
    createdAt: Timestamp;
    updatedAt: Timestamp;
    participants: {                  
      [userUID: string]: ParticipantInfo;
    };
    messageCount: number;
    lastMessage?: LastMessage;
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