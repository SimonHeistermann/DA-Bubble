import { Timestamp } from 'firebase/firestore';

export interface Conversation {
    coversationID: string;                        
    type: 'channel' | 'direct';                
    channelID?: string;

}
