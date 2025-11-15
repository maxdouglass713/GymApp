import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';

interface NutritionPlannerModalProps {
  visible: boolean;
  onClose: () => void;
  colors: typeof BrandColors;
}

export const NutritionPlannerModal: React.FC<NutritionPlannerModalProps> = ({
  visible,
  onClose,
  colors,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.infoModalContent, { backgroundColor: colors.background }]}>
          <Text style={[styles.infoModalTitle, { color: colors.text }]}>
            Nutrition Planner & Grocery Lists
          </Text>
          <Text style={[styles.infoModalText, { color: colors.icon }]}>
            Get personalized macro targets, weekly meal ideas, and automatically generated grocery lists based on your goals and preferences.
          </Text>
          
          <TouchableOpacity
            style={[styles.infoModalButton, { backgroundColor: colors.tint }]}
            onPress={onClose}
          >
            <Text style={[styles.infoModalButtonText, { color: '#000' }]}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  infoModalContent: {
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 300,
  },
  infoModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  infoModalText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  infoModalButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  infoModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

