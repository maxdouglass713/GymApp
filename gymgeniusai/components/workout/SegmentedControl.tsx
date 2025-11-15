import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';

interface SegmentedControlProps {
  activeSegment: 'all' | 'favorites';
  onSegmentChange: (segment: 'all' | 'favorites') => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  activeSegment,
  onSegmentChange,
}) => {
  return (
    <View style={[styles.segmentedControl, { backgroundColor: BrandColors.gray800 }]}>
      <TouchableOpacity
        style={[
          styles.segmentButton,
          { backgroundColor: activeSegment === 'all' ? BrandColors.accent : 'transparent' }
        ]}
        onPress={() => onSegmentChange('all')}
      >
        <Text style={[
          styles.segmentText,
          { color: activeSegment === 'all' ? '#000' : BrandColors.text }
        ]}>
          All Workouts
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.segmentButton,
          { backgroundColor: activeSegment === 'favorites' ? BrandColors.accent : 'transparent' }
        ]}
        onPress={() => onSegmentChange('favorites')}
      >
        <Text style={[
          styles.segmentText,
          { color: activeSegment === 'favorites' ? '#000' : BrandColors.text }
        ]}>
          Favorites
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

