import {
  collection,
  doc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  teamId: string;
  avatar?: string;
}

// Helper to convert Firestore timestamps to Date
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  return new Date();
};

export const chatService = {
  // Send a message to a team chat
  async sendMessage(
    teamId: string,
    userId: string,
    userName: string,
    message: string
  ): Promise<string> {
    try {
      // Validate inputs
      if (!teamId || !teamId.trim()) {
        throw new Error('Team ID is required');
      }
      if (!userId || !userId.trim()) {
        throw new Error('User ID is required');
      }
      if (!userName || !userName.trim()) {
        throw new Error('User name is required');
      }
      if (!message || !message.trim()) {
        throw new Error('Message cannot be empty');
      }
      
      console.log('💬 Sending chat message:', { teamId, userId, userName, messageLength: message.length });
      
      const messagesRef = collection(db, 'teamChats', teamId, 'messages');
      const docRef = await addDoc(messagesRef, {
        userId,
        userName: userName.trim(),
        message: message.trim(),
        teamId,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      
      console.log('✅ Message sent successfully:', docRef.id);
      return docRef.id;
    } catch (error: any) {
      console.error('❌ Error sending chat message:', error);
      
      // Provide user-friendly error messages
      if (error?.code === 'permission-denied') {
        throw new Error('You do not have permission to send messages in this team.');
      } else if (error?.code === 'unavailable') {
        throw new Error('Chat service is temporarily unavailable. Please try again.');
      } else if (error?.message) {
        throw error;
      } else {
        throw new Error('Failed to send message. Please check your connection and try again.');
      }
    }
  },

  // Subscribe to real-time messages for a team
  subscribeToTeamChat(
    teamId: string,
    callback: (messages: ChatMessage[]) => void,
    messageLimit: number = 50
  ): Unsubscribe {
    // Validate teamId
    if (!teamId || !teamId.trim()) {
      console.error('❌ Invalid teamId provided to subscribeToTeamChat');
      callback([]);
      // Return a no-op unsubscribe function
      return () => {};
    }
    
    console.log('👂 Setting up real-time listener for team chat:', teamId);
    
    try {
      const messagesRef = collection(db, 'teamChats', teamId, 'messages');
      const messagesQuery = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        limit(messageLimit)
      );
      
      const unsubscribe = onSnapshot(
        messagesQuery,
        (querySnapshot) => {
          const messages: ChatMessage[] = [];
          
          querySnapshot.forEach((doc) => {
            try {
              const data = doc.data();
              messages.push({
                id: doc.id,
                userId: data.userId || 'unknown',
                userName: data.userName || 'Unknown',
                message: data.message || '',
                timestamp: convertTimestamp(data.timestamp || data.createdAt),
                teamId: data.teamId || teamId,
                avatar: data.avatar,
              });
            } catch (docError) {
              console.warn('⚠️ Error processing chat message document:', doc.id, docError);
            }
          });
          
          // Reverse to show oldest first (for chat UI)
          messages.reverse();
          
          console.log('💬 Real-time chat update received:', messages.length, 'messages');
          callback(messages);
        },
        (error: any) => {
          console.error('❌ Error in team chat real-time listener:', error);
          
          // Handle specific Firestore errors
          if (error?.code === 'permission-denied') {
            console.error('❌ Permission denied for team chat:', teamId);
          } else if (error?.code === 'not-found') {
            console.log('ℹ️ Chat collection not found yet - this is normal for new teams');
            callback([]);
            return;
          } else if (error?.code === 'unavailable') {
            console.error('❌ Chat service unavailable');
          }
          
          callback([]);
        }
      );
      
      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up chat listener:', error);
      callback([]);
      return () => {};
    }
  },

  // Load recent messages (one-time fetch)
  async getRecentMessages(teamId: string, limitCount: number = 50): Promise<ChatMessage[]> {
    try {
      console.log('📥 Loading recent chat messages for team:', teamId);
      
      const messagesRef = collection(db, 'teamChats', teamId, 'messages');
      const messagesQuery = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const { getDocs } = await import('firebase/firestore');
      const querySnapshot = await getDocs(messagesQuery);
      
      const messages: ChatMessage[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName || 'Unknown',
          message: data.message,
          timestamp: convertTimestamp(data.timestamp || data.createdAt),
          teamId: data.teamId || teamId,
          avatar: data.avatar,
        });
      });
      
      // Reverse to show oldest first
      messages.reverse();
      
      console.log('✅ Loaded', messages.length, 'chat messages');
      return messages;
    } catch (error) {
      console.error('❌ Error loading chat messages:', error);
      // If collection doesn't exist yet, return empty array
      if ((error as any)?.code === 'not-found' || (error as any)?.code === 'permission-denied') {
        console.log('ℹ️ Chat collection not found or permission denied - returning empty array');
        return [];
      }
      throw error;
    }
  },
};




