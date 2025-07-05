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
    lastAnswerTime?: Timestamp;            
    reactions?: MessageReactions;
    type: 'channel' | 'private';
    channelID?: string;
    recipientID?: string;
    conversationID?:string;
}

export interface Message extends MessageData{
    id: string; 
}

export interface ThreadMessage {
    id?: string;
    messageId: string;
    authorId: string;               
    content: string;
    createdAt?: Timestamp;
    editedAt?: Timestamp;
    isEdited: boolean;
    mentions: string[];
    reactions: ThreadReactions[];
}

export interface ThreadReactions {
  emojiStr: string;
  userId: string;
}

export interface MessageReactions {
    [emoji: string]: {
      users: string[]; 
    };
}
