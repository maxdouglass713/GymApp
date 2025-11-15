import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors } from '@/constants/theme';
import { router } from 'expo-router';

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

interface PlayerCardProps {
  player: PlayerStat;
  onSelect?: (player: PlayerStat) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, onSelect }) => {
  const statusColor = player.status === 'active' 
    ? '#22c55e' 
    : player.status === 'needs_attention' 
    ? '#f59e0b' 
    : '#ef4444';
  
  const statusIcon = player.status === 'active' 
    ? 'checkmark.circle.fill' 
    : player.status === 'needs_attention' 
    ? 'exclamationmark.triangle.fill' 
    : 'xmark.circle.fill';
  
  return (
    <TouchableOpacity
      style={[styles.playerCard, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary + '20' }]}
      onPress={() => {
        if (onSelect) {
          onSelect(player);
          return;
        }
        router.push({
        pathname: '/community/team-management',
          params: { selectedPlayerId: player.playerId },
        });
      }}
    >
      <View style={styles.playerCardHeader}>
        <View style={styles.playerInfo}>
          <Text style={[styles.playerName, { color: BrandColors.text }]}>
            {player.playerName}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <IconSymbol name={statusIcon} size={12} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {player.status === 'active' ? 'Active' : 
               player.status === 'needs_attention' ? 'Needs Attention' : 
               'Inactive'}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.playerMetrics}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: BrandColors.textSecondary }]}>
            This Week
          </Text>
          <Text style={[styles.metricValue, { color: BrandColors.accent }]}>
            {player.workoutsThisWeek}
          </Text>
          <Text style={[styles.metricSubtext, { color: BrandColors.textSecondary }]}>
            workouts
          </Text>
        </View>
        
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: BrandColors.textSecondary }]}>
            Score
          </Text>
          <Text style={[styles.metricValue, { color: BrandColors.accent }]}>
            {player.consistencyScore}
          </Text>
          <Text style={[styles.metricSubtext, { color: BrandColors.textSecondary }]}>
            /100
          </Text>
        </View>
        
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: BrandColors.textSecondary }]}>
            Streak
          </Text>
          <Text style={[styles.metricValue, { color: BrandColors.accent }]}>
            {player.currentStreak}
          </Text>
          <Text style={[styles.metricSubtext, { color: BrandColors.textSecondary }]}>
            days
          </Text>
        </View>
        
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: BrandColors.textSecondary }]}>
            Total
          </Text>
          <Text style={[styles.metricValue, { color: BrandColors.accent }]}>
            {player.totalWorkouts}
          </Text>
          <Text style={[styles.metricSubtext, { color: BrandColors.textSecondary }]}>
            workouts
          </Text>
        </View>
      </View>
      
      {player.lastWorkoutDate && (
        <View style={styles.lastWorkoutInfo}>
          <IconSymbol name="clock" size={14} color={BrandColors.textSecondary} />
          <Text style={[styles.lastWorkoutText, { color: BrandColors.textSecondary }]}>
            Last workout: {player.lastWorkoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  playerCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  playerCardHeader: {
    marginBottom: 16,
  },
  playerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerName: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  playerMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: BrandColors.background,
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: 'ui-rounded',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'ui-rounded',
    marginBottom: 2,
  },
  metricSubtext: {
    fontSize: 10,
    fontFamily: 'ui-rounded',
  },
  lastWorkoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BrandColors.textSecondary + '20',
  },
  lastWorkoutText: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
  },
});

