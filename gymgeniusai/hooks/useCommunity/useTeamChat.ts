import React, { useState, useEffect, useRef } from 'react';
import { FlatList } from 'react-native';
import { chatService, ChatMessage } from '@/services/chatService';

export const useTeamChat = (teamId: string | undefined, activeTab: string) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatListRef = useRef<FlatList | null>(null);

  // Set up real-time chat listener
  useEffect(() => {
    if (activeTab !== 'chat') {
      setChatLoading(false);
      setChatMessages([]);
      setChatError(null);
      return;
    }

    if (!teamId) {
      console.warn('⚠️ No teamId provided for chat');
      setChatLoading(false);
      setChatError('No team ID available. Please ensure you are part of a team.');
      setChatMessages([]);
      return;
    }

    console.log('💬 Setting up real-time chat listener for team:', teamId);
    setChatLoading(true);
    setChatError(null);
    
    try {
      const unsubscribe = chatService.subscribeToTeamChat(
        teamId,
        (messages: ChatMessage[]) => {
          console.log('💬 Real-time chat messages received:', messages.length);
          setChatMessages(messages);
          setChatLoading(false);
          setChatError(null);
          
          // Auto-scroll to bottom when new messages arrive
          setTimeout(() => {
            chatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        },
        100 // Load last 100 messages
      );

      return () => {
        console.log('🧹 Cleaning up chat listener');
        unsubscribe();
        setChatLoading(false);
      };
    } catch (error) {
      console.error('❌ Error setting up chat listener:', error);
      setChatLoading(false);
      setChatError('Failed to load chat messages. Please try again.');
      setChatMessages([]);
    }
  }, [teamId, activeTab]);

  return {
    chatMessages,
    newMessage,
    setNewMessage,
    chatLoading,
    setChatLoading,
    chatError,
    chatListRef,
  };
};

