import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { BrandColors, ComponentStyles } from '@/constants/theme';

interface EditFoodModalProps {
  visible: boolean;
  editFood: any;
  editServingSize: string;
  editServingCount: string;
  editCalories: string;
  editProtein: string;
  editCarbs: string;
  editFat: string;
  onClose: () => void;
  onServingSizeChange: (value: string) => void;
  onServingCountChange: (value: string) => void;
  onCaloriesChange: (value: string) => void;
  onProteinChange: (value: string) => void;
  onCarbsChange: (value: string) => void;
  onFatChange: (value: string) => void;
  onSave: () => void;
  colors: typeof BrandColors;
}

export const EditFoodModal: React.FC<EditFoodModalProps> = ({
  visible,
  editFood,
  editServingSize,
  editServingCount,
  editCalories,
  editProtein,
  editCarbs,
  editFat,
  onClose,
  onServingSizeChange,
  onServingCountChange,
  onCaloriesChange,
  onProteinChange,
  onCarbsChange,
  onFatChange,
  onSave,
  colors,
}) => {
  if (!editFood) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" transparent={false}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}> 
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Food</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeButton, { color: colors.tint }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 400 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            contentInsetAdjustmentBehavior="never"
            style={{ backgroundColor: colors.background }}
          >
            <View style={styles.foodDetails}>
              <Text style={[styles.foodDetailsName, { color: colors.text }]}>{editFood.name}</Text>
              <Text style={[styles.foodDetailsServing, { color: '#FFFFFF' }]}>{editServingSize}</Text>
            </View>

            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Serving Size Label</Text>
              <TextInput
                style={[styles.inputField, { color: colors.text, borderColor: colors.icon }]}
                value={editServingSize}
                onChangeText={onServingSizeChange}
                placeholder="e.g., 1 cup, 150g, 1 bar"
                placeholderTextColor={colors.icon}
                returnKeyType="done"
                keyboardAppearance={Platform.OS === 'ios' ? 'dark' : 'default'}
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Servings</Text>
              <TextInput
                style={[styles.inputField, { color: colors.text, borderColor: colors.icon }]}
                value={editServingCount}
                onChangeText={onServingCountChange}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor={colors.icon}
                returnKeyType="done"
                keyboardAppearance={Platform.OS === 'ios' ? 'dark' : 'default'}
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Per Serving Macros</Text>
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Calories</Text>
                  <TextInput
                    style={[styles.inputField, { color: colors.text, borderColor: colors.icon }]}
                    value={editCalories}
                    onChangeText={onCaloriesChange}
                    keyboardType="numeric"
                    placeholder="e.g., 200"
                    placeholderTextColor={colors.icon}
                    returnKeyType="done"
                    keyboardAppearance={Platform.OS === 'ios' ? 'dark' : 'default'}
                  />
                </View>
                <View>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Protein (g)</Text>
                  <TextInput
                    style={[styles.inputField, { color: colors.text, borderColor: colors.icon }]}
                    value={editProtein}
                    onChangeText={onProteinChange}
                    keyboardType="numeric"
                    placeholder="e.g., 20"
                    placeholderTextColor={colors.icon}
                    returnKeyType="done"
                    keyboardAppearance={Platform.OS === 'ios' ? 'dark' : 'default'}
                  />
                </View>
                <View>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Carbs (g)</Text>
                  <TextInput
                    style={[styles.inputField, { color: colors.text, borderColor: colors.icon }]}
                    value={editCarbs}
                    onChangeText={onCarbsChange}
                    keyboardType="numeric"
                    placeholder="e.g., 30"
                    placeholderTextColor={colors.icon}
                    returnKeyType="done"
                    keyboardAppearance={Platform.OS === 'ios' ? 'dark' : 'default'}
                  />
                </View>
                <View>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Fat (g)</Text>
                  <TextInput
                    style={[styles.inputField, { color: colors.text, borderColor: colors.icon }]}
                    value={editFat}
                    onChangeText={onFatChange}
                    keyboardType="numeric"
                    placeholder="e.g., 8"
                    placeholderTextColor={colors.icon}
                    returnKeyType="done"
                    keyboardAppearance={Platform.OS === 'ios' ? 'dark' : 'default'}
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.tint }]}
              onPress={onSave}
            >
              <Text style={[styles.saveButtonText]}>Save Changes</Text>
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
  foodDetails: {
    marginBottom: 20,
  },
  foodDetailsName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  foodDetailsServing: {
    fontSize: 16,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  saveButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

