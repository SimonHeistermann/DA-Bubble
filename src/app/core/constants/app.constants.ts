export const APP_CONSTANTS = {
    COLLECTIONS: {
      USERS: 'users',
      CONVERSATIONS: 'conversations', 
      MESSAGES: 'messages'
    },
    USER_STATUS: {
      ONLINE: 'online',
      OFFLINE: 'offline'
    },
    CONVERSATION_TYPES: {
      CHANNEL: 'channel',
      DIRECT: 'direct'
    },
    MESSAGE_TYPES: {
      TEXT: 'text'
    }
} as const;