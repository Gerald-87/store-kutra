import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  updateDoc,
  doc,
  getDocs
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Message } from '../../types';

interface ChatState {
  conversations: { [key: string]: Message[] };
  activeConversations: string[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  conversations: {},
  activeConversations: [],
  isLoading: false,
  error: null,
};

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (messageData: Omit<Message, 'id' | 'timestamp'>) => {
    const message = {
      ...messageData,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    
    console.log('Sending message:', message);
    const docRef = await addDoc(collection(db, 'messages'), message);
    console.log('Message sent with ID:', docRef.id);
    
    return { id: docRef.id, ...message };
  }
);

export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async (userId: string) => {
    const q1 = query(
      collection(db, 'messages'),
      where('fromUserId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const q2 = query(
      collection(db, 'messages'),
      where('toUserId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    const messages: Message[] = [];
    snapshot1.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() } as Message);
    });
    snapshot2.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() } as Message);
    });
    
    return messages;
  }
);

export const markMessageAsRead = createAsyncThunk(
  'chat/markMessageAsRead',
  async (messageId: string) => {
    await updateDoc(doc(db, 'messages', messageId), { isRead: true });
    return messageId;
  }
);

// Fetch messages for a specific conversation
export const fetchConversationMessages = createAsyncThunk(
  'chat/fetchConversationMessages',
  async ({ userId, otherUserId }: { userId: string; otherUserId: string }) => {
    try {
      const q1 = query(
        collection(db, 'messages'),
        where('fromUserId', '==', userId),
        where('toUserId', '==', otherUserId),
        orderBy('timestamp', 'asc')
      );
      
      const q2 = query(
        collection(db, 'messages'),
        where('fromUserId', '==', otherUserId),
        where('toUserId', '==', userId),
        orderBy('timestamp', 'asc')
      );
      
      const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      const messages: Message[] = [];
      snapshot1.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() } as Message);
      });
      snapshot2.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() } as Message);
      });
      
      // Sort by timestamp
      messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      const conversationKey = [userId, otherUserId].sort().join('_');
      return { conversationKey, messages };
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      throw error;
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      const message = action.payload;
      const conversationKey = message.conversationKey || 
        [message.fromUserId, message.toUserId].sort().join('_');
      
      if (!state.conversations[conversationKey]) {
        state.conversations[conversationKey] = [];
      }
      
      state.conversations[conversationKey].push(message);
      
      if (!state.activeConversations.includes(conversationKey)) {
        state.activeConversations.push(conversationKey);
      }
    },
    
    setConversationMessages: (state, action: PayloadAction<{ 
      conversationKey: string; 
      messages: Message[] 
    }>) => {
      const { conversationKey, messages } = action.payload;
      state.conversations[conversationKey] = messages;
      
      if (!state.activeConversations.includes(conversationKey)) {
        state.activeConversations.push(conversationKey);
      }
    },
    
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isLoading = false;
        const message = action.payload;
        const conversationKey = message.conversationKey || 
          [message.fromUserId, message.toUserId].sort().join('_');
        
        if (!state.conversations[conversationKey]) {
          state.conversations[conversationKey] = [];
        }
        
        state.conversations[conversationKey].push(message);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to send message';
      })
      .addCase(fetchConversations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.isLoading = false;
        // Group messages by conversation
        const conversations: { [key: string]: Message[] } = {};
        
        action.payload.forEach(message => {
          const conversationKey = message.conversationKey || 
            [message.fromUserId, message.toUserId].sort().join('_');
          
          if (!conversations[conversationKey]) {
            conversations[conversationKey] = [];
          }
          
          conversations[conversationKey].push(message);
        });
        
        state.conversations = conversations;
        state.activeConversations = Object.keys(conversations);
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch conversations';
      })
      
      // Fetch Conversation Messages
      .addCase(fetchConversationMessages.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchConversationMessages.fulfilled, (state, action) => {
        state.isLoading = false;
        const { conversationKey, messages } = action.payload;
        state.conversations[conversationKey] = messages;
        
        if (!state.activeConversations.includes(conversationKey)) {
          state.activeConversations.push(conversationKey);
        }
      })
      .addCase(fetchConversationMessages.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch conversation messages';
      });
  },
});

export const { addMessage, setConversationMessages, clearError } = chatSlice.actions;
export { fetchConversationMessages };
export default chatSlice.reducer;