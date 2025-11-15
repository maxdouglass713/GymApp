import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';

interface CardioCardProps {
  exercise: {
    id: string;
    name: string;
    duration?: number;
    speed?: number;
    distance?: number;
    intensity?: string;
  };
  onRemove: (id: string) => void;
}

export const CardioCard: React.FC<CardioCardProps> = ({ exercise, onRemove }) => {
  return (
    <View style={[styles.exerciseCard, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
      <View style={styles.exerciseHeader}>
        <Text style={[styles.exerciseName, { color: BrandColors.text }]}>{exercise.name}</Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(exercise.id)}
        >
          <Text style={[styles.removeButtonText, { color: BrandColors.accent }]}>×</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.cardioDetails}>
        <View style={styles.cardioRow}>
          <Text style={[styles.cardioLabel, { color: BrandColors.textSecondary }]}>Duration:</Text>
          <Text style={[styles.cardioValue, { color: BrandColors.text }]}>{exercise.duration} minutes</Text>
        </View>
        
        {exercise.speed && (
          <View style={styles.cardioRow}>
            <Text style={[styles.cardioLabel, { color: BrandColors.textSecondary }]}>Speed:</Text>
            <Text style={[styles.cardioValue, { color: BrandColors.text }]}>
              {exercise.speed} {exercise.name === 'Running' || exercise.name === 'Walking' ? 'mph' : 'rpm'}
            </Text>
          </View>
        )}
        
        {exercise.distance && (
          <View style={styles.cardioRow}>
            <Text style={[styles.cardioLabel, { color: BrandColors.textSecondary }]}>Distance:</Text>
            <Text style={[styles.cardioValue, { color: BrandColors.text }]}>
              {exercise.distance} {exercise.name === 'Running' || exercise.name === 'Walking' ? 'miles' : 'km'}
            </Text>
          </View>
        )}
        
        <View style={styles.cardioRow}>
          <Text style={[styles.cardioLabel, { color: BrandColors.textSecondary }]}>Intensity:</Text>
          <Text style={[styles.cardioValue, { color: BrandColors.text }]}>{exercise.intensity}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  exerciseCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  cardioDetails: {
    gap: 8,
  },
  cardioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardioLabel: {
    fontSize: 14,
  },
  cardioValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});

