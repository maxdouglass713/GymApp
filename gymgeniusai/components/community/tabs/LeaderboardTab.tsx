import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors } from '@/constants/theme';

interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  score?: number;
  subtitle?: string;
}

interface LeaderboardTabProps {
  entries: LeaderboardEntry[];
  metricLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onSelectMember?: (entry: LeaderboardEntry) => void;
}

export const LeaderboardTab: React.FC<LeaderboardTabProps> = ({
  entries,
  metricLabel = 'points',
  emptyTitle = 'No activity yet',
  emptyDescription = 'Start logging workouts to appear on the leaderboard!',
  onSelectMember,
}) => {
  return (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
        Weekly Leaderboard
      </Text>
      <View style={[styles.leaderboardCard, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary + '20' }]}>
        {entries.length === 0 ? (
          <View style={styles.emptyLeaderboardContainer}>
            <IconSymbol name="chart.bar" size={48} color={BrandColors.textSecondary} />
            <Text style={[styles.emptyLeaderboardTitle, { color: BrandColors.text }]}>
              {emptyTitle}
            </Text>
            <Text style={[styles.emptyLeaderboardDescription, { color: BrandColors.textSecondary }]}>
              {emptyDescription}
            </Text>
          </View>
        ) : (
          entries.slice(0, 10).map((entry, index) => (
            <TouchableOpacity
              key={entry.id}
              style={styles.touchable}
              onPress={() => onSelectMember?.(entry)}
              disabled={!onSelectMember}
            >
              <View style={styles.leaderboardEntry}>
                <View style={styles.rankContainer}>
                  <Text style={[styles.rank, { color: BrandColors.textSecondary }]}>
                    #{entry.rank}
                  </Text>
                  {index < 3 && (
                    <IconSymbol 
                      name={index === 0 ? "crown.fill" : index === 1 ? "medal.fill" : "medal.fill"} 
                      size={16} 
                      color={index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : "#CD7F32"} 
                    />
                  )}
                </View>
                <View style={styles.entryInfo}>
                  <Text style={[styles.entryName, { color: BrandColors.text }]}>
                    {entry.name}
                  </Text>
                  {entry.subtitle ? (
                    <Text style={[styles.entryScore, { color: BrandColors.textSecondary }]}>
                      {entry.subtitle}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.scoreContainer}>
                  {typeof entry.score === 'number' ? (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.scoreNumber, { color: BrandColors.accent }]}>
                        {entry.score}
                      </Text>
                      <Text style={[styles.scoreLabel, { color: BrandColors.textSecondary }]}>
                        {metricLabel}
                      </Text>
                    </View>
                  ) : (
                    <IconSymbol name="person.2.fill" size={18} color={BrandColors.textSecondary} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
  },
  touchable: {
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'ui-rounded',
    marginBottom: 12,
  },
  leaderboardCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rank: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    fontWeight: '600',
    width: 32,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 60,
  },
  entryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  entryName: {
    fontSize: 16,
    fontFamily: 'ui-rounded',
    fontWeight: '500',
  },
  entryScore: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'ui-rounded',
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
    marginTop: 2,
  },
  emptyLeaderboardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyLeaderboardTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyLeaderboardDescription: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
    lineHeight: 20,
  },
});

