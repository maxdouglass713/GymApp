import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';
import { formatTime } from '@/utils/community/communityHelpers';
import { ChatMessage } from '@/services/chatService';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwnMessage }) => {
  return (
    <View style={[styles.messageContainer, isOwnMessage && styles.ownMessage]}>
      <View style={[
        styles.messageBubble,
        { 
          backgroundColor: isOwnMessage 
            ? BrandColors.accent 
            : BrandColors.gray800 
        }
      ]}>
        <Text style={[styles.messageText, { color: '#FFFFFF' }]}>
          {message.message}
        </Text>
      </View>
      <Text style={[styles.messageInfo, { color: BrandColors.textSecondary }]}>
        {message.userName} • {formatTime(message.timestamp)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'ui-rounded',
    lineHeight: 20,
  },
  messageInfo: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
    marginHorizontal: 4,
  },
});

