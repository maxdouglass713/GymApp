import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, FlatList, ActivityIndicator } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors } from '@/constants/theme';
import { ChatMessage } from '@/services/chatService';
import { MessageBubble } from '../MessageBubble';

interface ChatTabProps {
  chatMessages: ChatMessage[];
  newMessage: string;
  setNewMessage: (text: string) => void;
  chatLoading: boolean;
  chatError: string | null;
  chatListRef: React.RefObject<FlatList | null>;
  userId: string | undefined;
  onSendMessage: () => void;
}

export const ChatTab: React.FC<ChatTabProps> = ({
  chatMessages,
  newMessage,
  setNewMessage,
  chatLoading,
  chatError,
  chatListRef,
  userId,
  onSendMessage,
}) => {
  return (
    <KeyboardAvoidingView 
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {chatLoading ? (
        <View style={styles.emptyChatContainer}>
          <ActivityIndicator size="large" color={BrandColors.accent} />
          <Text style={[styles.emptyChatTitle, { color: BrandColors.text }]}>
            Loading messages...
          </Text>
        </View>
      ) : chatError ? (
        <View style={styles.emptyChatContainer}>
          <IconSymbol name="exclamationmark.triangle" size={48} color={BrandColors.textSecondary} />
          <Text style={[styles.emptyChatTitle, { color: BrandColors.text }]}>
            Unable to load chat
          </Text>
          <Text style={[styles.emptyChatDescription, { color: BrandColors.textSecondary }]}>
            {chatError}
          </Text>
        </View>
      ) : chatMessages.length === 0 ? (
        <View style={styles.emptyChatContainer}>
          <IconSymbol name="message" size={48} color={BrandColors.textSecondary} />
          <Text style={[styles.emptyChatTitle, { color: BrandColors.text }]}>
            No messages yet
          </Text>
          <Text style={[styles.emptyChatDescription, { color: BrandColors.textSecondary }]}>
            Be the first to start a conversation in your team!
          </Text>
        </View>
      ) : (
        <FlatList
          ref={chatListRef}
          data={chatMessages}
          keyExtractor={(item) => item.id}
          style={styles.chatMessages}
          contentContainerStyle={{ paddingBottom: 16 }}
          onContentSizeChange={() => {
            chatListRef.current?.scrollToEnd({ animated: true });
          }}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isOwnMessage={item.userId === userId}
            />
          )}
        />
      )}
      
      <View style={styles.chatInputContainer}>
        <TextInput
          style={[styles.chatInput, { 
            backgroundColor: BrandColors.gray800, 
            color: BrandColors.text,
            borderColor: BrandColors.textSecondary + '20',
            opacity: chatError ? 0.5 : 1
          }]}
          placeholder={chatError ? "Chat unavailable" : "Type a message..."}
          placeholderTextColor={BrandColors.textSecondary}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          editable={!chatError}
        />
        <TouchableOpacity
          style={[
            styles.sendButton, 
            { 
              backgroundColor: chatError ? BrandColors.textSecondary : BrandColors.accent,
              opacity: (!newMessage.trim() || chatError) ? 0.5 : 1
            }
          ]}
          onPress={onSendMessage}
          disabled={!newMessage.trim() || !!chatError}
        >
          <IconSymbol 
            name="paperplane.fill" 
            size={16} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  chatContainer: {
    flex: 1,
    minHeight: 400,
  },
  chatMessages: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyChatTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyChatDescription: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
    lineHeight: 20,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BrandColors.background,
    borderTopWidth: 1,
    borderTopColor: BrandColors.textSecondary + '20',
    gap: 12,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'ui-rounded',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

