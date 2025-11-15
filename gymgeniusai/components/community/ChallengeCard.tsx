import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { BrandColors } from '@/constants/theme';

interface Challenge {
  id: string;
  title: string;
  description: string;
  progress: number;
  isJoined: boolean;
  createdByName?: string;
  createdAt?: Date;
}

interface ChallengeCardProps {
  challenge: Challenge;
  onJoinChallenge: (challengeId: string) => void;
  showCreator?: boolean;
  onDeleteChallenge?: (challengeId: string) => void;
  canDelete?: boolean;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  onJoinChallenge,
  showCreator = false,
  onDeleteChallenge,
  canDelete = false,
}) => {
  return (
    <View
      style={[styles.challengeCard, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary + '20' }]}
    >
      <View style={styles.challengeHeader}>
        <View style={styles.headerRow}>
        <Text style={[styles.challengeTitle, { color: BrandColors.text }]}>
          {challenge.title}
        </Text>
          {canDelete && onDeleteChallenge && (
            <TouchableOpacity
              style={[styles.deleteButton, { borderColor: BrandColors.accent }]}
              onPress={() => {
                Alert.alert(
                  'Delete Challenge',
                  `Are you sure you want to delete "${challenge.title}"? This will remove it for everyone.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => onDeleteChallenge(challenge.id),
                    },
                  ]
                );
              }}
            >
              <Text style={[styles.deleteButtonText, { color: BrandColors.accent }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.challengeDescription, { color: BrandColors.textSecondary }]}>
          {challenge.description}
        </Text>
        {showCreator && challenge.createdByName && (
          <Text style={[styles.challengeMeta, { color: BrandColors.textSecondary }]}>
            Created by {challenge.createdByName}
          </Text>
        )}
        <View style={styles.challengeProgress}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${challenge.progress}%`, backgroundColor: BrandColors.accent }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: BrandColors.textSecondary }]}>
            {challenge.progress}% complete
          </Text>
        </View>
      </View>
      
      <View style={styles.challengeActions}>
        <TouchableOpacity
          style={[
            styles.challengeButton,
            { backgroundColor: challenge.isJoined ? BrandColors.textSecondary + '20' : BrandColors.accent }
          ]}
          onPress={() => onJoinChallenge(challenge.id)}
        >
          <Text style={[
            styles.challengeButtonText,
            { color: challenge.isJoined ? BrandColors.textSecondary : '#FFFFFF' }
          ]}>
            {challenge.isJoined ? 'Joined' : 'Join Challenge'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.challengeButton, styles.secondaryButton, { borderColor: BrandColors.accent }]}
          onPress={() => {
            Alert.alert('Challenge Details', challenge.description);
          }}
        >
          <Text style={[styles.challengeButtonText, { color: BrandColors.accent }]}>
            Details
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  challengeCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  challengeHeader: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 4,
  },
  challengeDescription: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    lineHeight: 20,
  },
  challengeMeta: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
    marginTop: 6,
  },
  challengeProgress: {
    marginTop: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: BrandColors.gray800,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
  },
  challengeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  challengeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
  },
  challengeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    textTransform: 'uppercase',
  },
});

