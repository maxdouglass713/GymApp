import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';

interface EquipmentModalProps {
  visible: boolean;
  selectedExercise: string;
  availableEquipment: string[];
  onClose: () => void;
  onSelectEquipment: (equipment: string) => void;
}

export const EquipmentModal: React.FC<EquipmentModalProps> = ({
  visible,
  selectedExercise,
  availableEquipment,
  onClose,
  onSelectEquipment,
}) => {
  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.modalContainer, { backgroundColor: BrandColors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: BrandColors.text }]}>Select Equipment</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeButton, { color: BrandColors.accent }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalContent}>
          <Text style={[styles.equipmentModalSubtitle, { color: BrandColors.textSecondary }]}>
            Choose equipment for: {selectedExercise}
          </Text>
          
          <View style={styles.equipmentGrid}>
            {availableEquipment.map((equipment, index) => (
              <TouchableOpacity
                key={`equipment-${equipment}-${index}`}
                style={[
                  styles.equipmentOption,
                  { 
                    backgroundColor: BrandColors.gray800,
                    borderColor: BrandColors.textSecondary
                  }
                ]}
                onPress={() => onSelectEquipment(equipment)}
              >
                <Text style={[styles.equipmentOptionText, { color: BrandColors.text }]}>
                  {equipment}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
    padding: 20,
  },
  equipmentModalSubtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  equipmentOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  equipmentOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

