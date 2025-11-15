import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BrandColors } from '@/constants/theme';
import { ChallengeCard } from '../ChallengeCard';

interface Challenge {
  id: string;
  title: string;
  description: string;
  progress: number;
  isJoined: boolean;
  createdByName?: string;
  createdAt?: Date;
}

interface ChallengesTabProps {
  challenges: Challenge[];
  onJoinChallenge: (challengeId: string) => void;
  canManageChallenges?: boolean;
  onCreateChallenge?: () => void;
  onDeleteChallenge?: (challengeId: string) => void;
}

export const ChallengesTab: React.FC<ChallengesTabProps> = ({
  challenges,
  onJoinChallenge,
  canManageChallenges = false,
  onCreateChallenge,
  onDeleteChallenge,
}) => {
  const hasChallenges = challenges && challenges.length > 0;

  return (
    <View style={styles.tabContent}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
          Active Challenges
        </Text>
        {canManageChallenges && onCreateChallenge && (
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: BrandColors.accent }]}
            onPress={onCreateChallenge}
          >
            <Text style={[styles.createButtonText, { color: '#000' }]}>+ Create Challenge</Text>
          </TouchableOpacity>
        )}
      </View>

      {hasChallenges ? (
        challenges.map((challenge) => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            onJoinChallenge={onJoinChallenge}
            showCreator={!canManageChallenges}
            canDelete={canManageChallenges}
            onDeleteChallenge={canManageChallenges ? onDeleteChallenge : undefined}
          />
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: BrandColors.textSecondary }]}>
            No active challenges yet
          </Text>
          <Text style={[styles.emptyDescription, { color: BrandColors.textSecondary }]}>
            {canManageChallenges
              ? 'Create your first challenge to rally the community.'
              : 'Check back soon to see new challenges from your commissioner.'}
          </Text>
          {canManageChallenges && onCreateChallenge && (
            <TouchableOpacity
              style={[styles.emptyCreateButton, { borderColor: BrandColors.accent }]}
              onPress={onCreateChallenge}
            >
              <Text style={[styles.emptyCreateButtonText, { color: BrandColors.accent }]}>
                Create a Challenge
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'ui-rounded',
  },
  createButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  emptyState: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  emptyCreateButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  emptyCreateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
});

