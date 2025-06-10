import { Timestamp } from 'firebase/firestore';

export interface Message {
    conversationId: string;          
    authorId: string;                
    content: string;
    // type: 'text';
    timestamp: Timestamp;
    editedAt?: Timestamp;
    isEdited: boolean;
    mentions: string[];               
    threadCount: number;              
    reactions: MessageReactions;
}

export interface ThreadMessage {
    messageId: string;
    authorId: string;               
    content: string;
    // type: 'text';
    timestamp: Timestamp;
    editedAt?: Timestamp;
    isEdited: boolean;
    mentions: string[];
    reactions: MessageReactions;
}

export interface MessageReactions {
    [emoji: string]: {
      users: string[]; 
      count: number;
      emojiUrl?: string; 
    };
}
