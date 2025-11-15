import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors } from '@/constants/theme';
import { PlayerCard } from '../PlayerCard';

interface PlayerStat {
  playerId: string;
  playerName: string;
  workoutsThisWeek: number;
  consistencyScore: number;
  currentStreak: number;
  lastWorkoutDate: Date | null;
  totalWorkouts: number;
  status: 'active' | 'inactive' | 'needs_attention';
}

interface OverviewTabProps {
  playerStats: PlayerStat[];
  loadingOverview: boolean;
  title?: string;
  memberLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onSelectPlayer?: (player: PlayerStat) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  playerStats,
  loadingOverview,
  title = 'Team Overview',
  memberLabel = 'Players',
  emptyTitle = 'No members yet',
  emptyDescription = 'Members will appear here once they join your community.',
  onSelectPlayer,
}) => {
  const singularLabel = memberLabel.endsWith('s')
    ? memberLabel.slice(0, -1)
    : memberLabel;

  return (
    <View style={styles.tabContent}>
      <View style={styles.headerSection}>
        <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
          {title}
        </Text>
        {playerStats.length > 0 && (
          <Text style={[styles.playerCount, { color: BrandColors.textSecondary }]}>
            {playerStats.length} {playerStats.length === 1 ? singularLabel : memberLabel}
          </Text>
        )}
      </View>
      
      {loadingOverview ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.accent} />
          <Text style={[styles.loadingText, { color: BrandColors.textSecondary }]}>
            Loading player stats...
          </Text>
        </View>
      ) : playerStats.length === 0 ? (
        <View style={styles.emptyOverviewContainer}>
          <IconSymbol name="person.2" size={48} color={BrandColors.textSecondary} />
          <Text style={[styles.emptyOverviewTitle, { color: BrandColors.text }]}>
            {emptyTitle}
          </Text>
          <Text style={[styles.emptyOverviewDescription, { color: BrandColors.textSecondary }]}>
            {emptyDescription}
          </Text>
        </View>
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {playerStats.map((player) => (
            <PlayerCard key={player.playerId} player={player} onSelect={onSelectPlayer} />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.textSecondary + '20',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'ui-rounded',
    marginBottom: 4,
  },
  playerCount: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    marginTop: 4,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
  },
  emptyOverviewContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyOverviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  emptyOverviewDescription: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
});

