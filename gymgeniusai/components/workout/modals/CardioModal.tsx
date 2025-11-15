import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput, StyleSheet } from 'react-native';
import { BrandColors, ComponentStyles } from '@/constants/theme';
import { CARDIO_DATABASE } from '@/utils/workout/exerciseDatabase';

interface CardioModalProps {
  visible: boolean;
  selectedActivity: string;
  duration: string;
  speed: string;
  distance: string;
  intensity: string;
  onClose: () => void;
  onSelectActivity: (activity: string) => void;
  onDurationChange: (duration: string) => void;
  onSpeedChange: (speed: string) => void;
  onDistanceChange: (distance: string) => void;
  onIntensityChange: (intensity: string) => void;
  onAdd: () => void;
  metricConfig?: {
    duration?: boolean;
    distance?: boolean;
  };
}

export const CardioModal: React.FC<CardioModalProps> = ({
  visible,
  selectedActivity,
  duration,
  speed,
  distance,
  intensity,
  onClose,
  onSelectActivity,
  onDurationChange,
  onSpeedChange,
  onDistanceChange,
  onIntensityChange,
  onAdd,
  metricConfig,
}) => {
  const showDuration = metricConfig?.duration !== false;
  const showDistance = metricConfig?.distance !== false;

  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.modalContainer, { backgroundColor: BrandColors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: BrandColors.text }]}>Add Cardio Activity</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeButton, { color: BrandColors.accent }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: BrandColors.text }]}>Activity</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activityScroll}>
              {CARDIO_DATABASE.map((activity, index) => (
                <TouchableOpacity
                  key={`cardio-activity-${activity}-${index}`}
                  style={[
                    styles.activityChip,
                    { backgroundColor: selectedActivity === activity ? BrandColors.accent : BrandColors.gray800 },
                    { borderColor: BrandColors.textSecondary }
                  ]}
                  onPress={() => onSelectActivity(activity)}
                >
                  <Text style={[
                    styles.activityChipText,
                    { color: selectedActivity === activity ? '#000' : BrandColors.text }
                  ]}>
                    {activity}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {showDuration && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: BrandColors.text }]}>
                Duration (minutes){metricConfig?.duration === false ? '' : ' *'}
              </Text>
              <TextInput
                style={[styles.modalInput, { color: BrandColors.text, borderColor: BrandColors.textSecondary }]}
                value={duration}
                onChangeText={onDurationChange}
                placeholder="30"
                placeholderTextColor={BrandColors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: BrandColors.text }]}>Speed (optional)</Text>
            <TextInput
              style={[styles.modalInput, { color: BrandColors.text, borderColor: BrandColors.textSecondary }]}
              value={speed}
              onChangeText={onSpeedChange}
              placeholder="6.5"
              placeholderTextColor={BrandColors.textSecondary}
              keyboardType="numeric"
            />
          </View>

          {showDistance && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: BrandColors.text }]}>
                Distance (optional)
              </Text>
              <TextInput
                style={[styles.modalInput, { color: BrandColors.text, borderColor: BrandColors.textSecondary }]}
                value={distance}
                onChangeText={onDistanceChange}
                placeholder="3.2"
                placeholderTextColor={BrandColors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: BrandColors.text }]}>Intensity</Text>
            <View style={styles.intensityButtons}>
              {['low', 'moderate', 'high'].map((intensityOption) => (
                <TouchableOpacity
                  key={intensityOption}
                  style={[
                    styles.intensityButton,
                    { backgroundColor: intensity === intensityOption ? BrandColors.accent : BrandColors.gray800 },
                    { borderColor: BrandColors.textSecondary }
                  ]}
                  onPress={() => onIntensityChange(intensityOption)}
                >
                  <Text style={[
                    styles.intensityButtonText,
                    { color: intensity === intensityOption ? '#000' : BrandColors.text }
                  ]}>
                    {intensityOption.charAt(0).toUpperCase() + intensityOption.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
        
        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[ComponentStyles.button.primary, styles.addButton]}
            onPress={onAdd}
          >
            <Text style={[ComponentStyles.button.primaryText, { color: '#000' }]}>Add Activity</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  activityScroll: {
    marginVertical: 8,
  },
  activityChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  activityChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  intensityButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  intensityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  intensityButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  addButton: {
    width: '100%',
  },
});

