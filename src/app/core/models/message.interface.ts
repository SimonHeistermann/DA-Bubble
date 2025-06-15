import { Timestamp } from 'firebase/firestore';

export interface MessageData {         
    authorID: string;  
    authorName: string;              
    content: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
    isEdited: boolean;
    mentionIDs?: string[];               
    threadCount: number;              
    reactions?: MessageReactions;
    type: 'channel' | 'private';
    channelID?: string;
    recipientID?: string;
}

export interface Message extends MessageData{
    id: string; 
}

export interface ThreadMessage {
    messageId: string;
    authorId: string;               
    content: string;
    // type: 'text';
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
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
