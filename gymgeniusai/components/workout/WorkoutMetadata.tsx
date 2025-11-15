import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';

interface WorkoutMetadataProps {
  title: string;
  onTitleChange: (title: string) => void;
}

export const WorkoutMetadata: React.FC<WorkoutMetadataProps> = ({
  title,
  onTitleChange,
}) => {
  return (
    <View style={styles.metadataSection}>
      <TextInput
        style={[styles.titleInput, { color: BrandColors.text, borderColor: BrandColors.textSecondary }]}
        value={title}
        onChangeText={onTitleChange}
        placeholder="Workout Title (Optional)"
        placeholderTextColor={BrandColors.textSecondary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  metadataSection: {
    marginBottom: 16,
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
});

