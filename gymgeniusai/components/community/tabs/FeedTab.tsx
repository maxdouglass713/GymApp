import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { BrandColors } from '@/constants/theme';
import { FeedEntry } from '@/stores/communityStore';

interface FeedTabProps {
  entries: FeedEntry[];
  header?: React.ReactNode;
}

const formatTimestamp = (date: Date) => {
  try {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    return '';
  }
};

const usernamePalette = [
  '#FF75B5',
  '#FFC146',
  '#6EE7B7',
  '#60A5FA',
  '#A78BFA',
  '#F472B6',
  '#38BDF8',
  '#F87171',
  '#34D399',
  '#FBBF24',
];

const getUsernameColor = (name: string) => {
  if (!name) {
    return '#FFFFFF';
  }
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % usernamePalette.length;
  return usernamePalette[index];
};

export const FeedTab: React.FC<FeedTabProps> = ({ entries, header }) => {
  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
      ),
    [entries]
  );

  if (!sortedEntries.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyTitle, { color: BrandColors.text }]}>
          No activity yet
        </Text>
        <Text
          style={[styles.emptyDescription, { color: BrandColors.textSecondary }]}
        >
          Share a workout or create a challenge to start the feed.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.feedList}
      data={sortedEntries}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        header ? <View style={styles.headerContainer}>{header}</View> : undefined
      }
      renderItem={({ item }) => (
        <View style={[styles.chatRow, { backgroundColor: BrandColors.gray900 }]}>
          <Text style={[styles.timestamp, { color: BrandColors.textSecondary }]}>
            {formatTimestamp(item.createdAt)}
          </Text>
          <Text
            style={[styles.username, { color: getUsernameColor(item.displayName) }]}
            numberOfLines={1}
          >
            {item.displayName}
          </Text>
          <Text style={[styles.message, { color: BrandColors.text }]} numberOfLines={4}>
            {item.message}
          </Text>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  feedList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  headerContainer: {
    paddingBottom: 16,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
    width: 48,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    maxWidth: 120,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'ui-rounded',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
    lineHeight: 20,
  },
});
