import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { key: 'lunch', label: 'Lunch', icon: '☀️' },
  { key: 'dinner', label: 'Dinner', icon: '🌙' },
  { key: 'snacks', label: 'Snacks', icon: '🍎' },
] as const;

interface Measurement {
  amount: number;
  unit: string;
  macros?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface FoodItem {
  name: string;
  measurements?: Measurement[];
}

interface LogFoodModalProps {
  visible: boolean;
  selectedFood: FoodItem | null;
  selectedMeasurement: Measurement | null;
  servingCount: string;
  selectedMealType: string;
  onClose: () => void;
  onMeasurementSelect: (measurement: Measurement) => void;
  onServingCountChange: (count: string) => void;
  onMealTypeChange: (mealType: string) => void;
  onSave: () => void;
  colors: typeof BrandColors;
}

export const LogFoodModal: React.FC<LogFoodModalProps> = ({
  visible,
  selectedFood,
  selectedMeasurement,
  servingCount,
  selectedMealType,
  onClose,
  onMeasurementSelect,
  onServingCountChange,
  onMealTypeChange,
  onSave,
  colors,
}) => {
  if (!selectedFood || !selectedFood.measurements || selectedFood.measurements.length === 0) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onClose}
          >
            <Text style={[styles.backButtonText, { color: '#FFFFFF' }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Log Food</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.foodDetails}>
          <Text style={[styles.foodDetailsName, { color: colors.text }]}>{selectedFood.name}</Text>
          {selectedMeasurement && (
            <Text style={[styles.foodDetailsServing, { color: '#FFFFFF' }]}>
              {selectedMeasurement.amount} {selectedMeasurement.unit}
            </Text>
          )}
        </View>
        
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Measurement:</Text>
          <View style={styles.measurementButtons}>
            {selectedFood.measurements?.map((measurement, index) => (
              <TouchableOpacity
                key={`measurement-${measurement.unit}-${index}`}
                style={[
                  styles.measurementButton,
                  { borderColor: colors.icon },
                  selectedMeasurement?.unit === measurement.unit && { backgroundColor: colors.tint }
                ]}
                onPress={() => onMeasurementSelect(measurement)}
              >
                <Text style={[
                  styles.measurementButtonText,
                  { color: selectedMeasurement?.unit === measurement.unit ? '#000' : colors.text }
                ]}>
                  {measurement.unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Amount:</Text>
          <TextInput
            style={[styles.inputField, { color: colors.text, borderColor: colors.icon }]}
            value={servingCount}
            onChangeText={onServingCountChange}
            keyboardType="numeric"
            placeholder="1"
            placeholderTextColor={colors.icon}
          />
        </View>
        
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Meal:</Text>
          <View style={styles.mealTypeButtons}>
            {MEAL_TYPES.map((meal) => (
              <TouchableOpacity
                key={meal.key}
                style={[
                  styles.mealTypeButton,
                  { borderColor: colors.icon },
                  selectedMealType === meal.key && { backgroundColor: colors.tint }
                ]}
                onPress={() => onMealTypeChange(meal.key)}
              >
                <Text style={[
                  styles.mealTypeButtonText,
                  { color: selectedMealType === meal.key ? '#000' : colors.text }
                ]}>
                  {meal.icon} {meal.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.tint }]}
          onPress={onSave}
        >
          <Text style={[styles.saveButtonText, { color: '#FFFFFF' }]}>Save</Text>
        </TouchableOpacity>
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
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: BrandColors.tint,
    minWidth: 80,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 80,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
  measurementButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  measurementButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  measurementButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  mealTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealTypeButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mealTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
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

