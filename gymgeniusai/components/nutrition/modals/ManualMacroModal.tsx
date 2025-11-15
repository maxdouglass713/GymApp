import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { BrandColors, ComponentStyles } from '@/constants/theme';

interface ManualMacroModalProps {
  visible: boolean;
  manualCalories: string;
  manualProtein: string;
  manualCarbs: string;
  manualFat: string;
  onClose: () => void;
  onCaloriesChange: (value: string) => void;
  onProteinChange: (value: string) => void;
  onCarbsChange: (value: string) => void;
  onFatChange: (value: string) => void;
  onSave: () => void;
  colors: typeof BrandColors;
}

export const ManualMacroModal: React.FC<ManualMacroModalProps> = ({
  visible,
  manualCalories,
  manualProtein,
  manualCarbs,
  manualFat,
  onClose,
  onCaloriesChange,
  onProteinChange,
  onCarbsChange,
  onFatChange,
  onSave,
  colors,
}) => {
  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Custom Macro Targets</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeButton, { color: colors.tint }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.infoModalContent}>
          <Text style={[styles.manualMacroDescription, { color: colors.icon }]}>
            Advanced users can manually set their daily macro targets. These will override the calculated values.
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Daily Calories</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.icon }]}
              value={manualCalories}
              onChangeText={onCaloriesChange}
              placeholder="2500"
              placeholderTextColor={colors.icon}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Protein (grams)</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.icon }]}
              value={manualProtein}
              onChangeText={onProteinChange}
              placeholder="150"
              placeholderTextColor={colors.icon}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Carbs (grams)</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.icon }]}
              value={manualCarbs}
              onChangeText={onCarbsChange}
              placeholder="250"
              placeholderTextColor={colors.icon}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Fat (grams)</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.icon }]}
              value={manualFat}
              onChangeText={onFatChange}
              placeholder="70"
              placeholderTextColor={colors.icon}
              keyboardType="numeric"
            />
          </View>
        </ScrollView>
        
        <View style={styles.modalActionsContainer}>
          <TouchableOpacity
            style={[ComponentStyles.button.primary, styles.saveButton]}
            onPress={onSave}
          >
            <Text style={[ComponentStyles.button.primaryText, { color: '#000' }]}>Save Custom Targets</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoModalContent: {
    flex: 1,
  },
  manualMacroDescription: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalActionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  saveButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
});

