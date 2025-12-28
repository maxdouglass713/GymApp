import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Keyboard, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { BrandColors } from '@/constants/theme';

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: undefined },
  { key: 'lunch', label: 'Lunch', icon: undefined },
  { key: 'dinner', label: 'Dinner', icon: undefined },
  { key: 'snacks', label: 'Snacks', icon: undefined },
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
  onSave,
  colors,
}) => {
  if (!selectedFood || !selectedFood.measurements || selectedFood.measurements.length === 0) {
    return null;
  }

  // Calculate macros in real-time based on selected measurement and serving count
  const calculateMacros = () => {
    if (!selectedMeasurement?.macros || !servingCount) {
      return null;
    }
    
    const count = parseFloat(servingCount);
    if (isNaN(count) || count <= 0) {
      return null;
    }
    
    const macros = selectedMeasurement.macros;
    
    return {
      calories: Math.round(macros.calories * count),
      protein: Math.round(macros.protein * count * 10) / 10, // Round to 1 decimal
      carbs: Math.round(macros.carbs * count * 10) / 10,
      fat: Math.round(macros.fat * count * 10) / 10,
    };
  };

  const calculatedMacros = calculateMacros();

  return (
    <Modal visible={visible} animationType="slide">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
            <Text style={[styles.inputLabel, { color: colors.text }]}>Adding to:</Text>
            <View style={[styles.mealDisplay, { backgroundColor: colors.gray800, borderColor: colors.icon }]}>
              <Text style={[styles.mealDisplayText, { color: colors.text }]}>
                {MEAL_TYPES.find(m => m.key === selectedMealType)?.icon} {MEAL_TYPES.find(m => m.key === selectedMealType)?.label || selectedMealType}
              </Text>
            </View>
          </View>
          
          {/* Real-time Macro Preview */}
          {calculatedMacros && selectedMeasurement && (
            <View style={[styles.macroPreview, { backgroundColor: colors.surface, borderColor: colors.accent }]}>
              <Text style={[styles.macroPreviewTitle, { color: colors.text }]}>
                Macros for {servingCount} {selectedMeasurement.unit}{parseFloat(servingCount) !== 1 ? 's' : ''}
              </Text>
              <View style={styles.macroRow}>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: colors.text }]}>
                    {calculatedMacros.calories}
                  </Text>
                  <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>cal</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: '#DC143C' }]}>
                    {calculatedMacros.protein}g
                  </Text>
                  <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>protein</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: '#FFD700' }]}>
                    {calculatedMacros.carbs}g
                  </Text>
                  <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>carbs</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: '#00FF88' }]}>
                    {calculatedMacros.fat}g
                  </Text>
                  <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>fat</Text>
                </View>
              </View>
            </View>
          )}
          
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.tint }]}
            onPress={onSave}
          >
            <Text style={[styles.saveButtonText, { color: '#FFFFFF' }]}>Save</Text>
          </TouchableOpacity>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
    flexGrow: 1,
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
  mealDisplay: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mealDisplayText: {
    fontSize: 16,
    fontWeight: '600',
  },
  macroPreview: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    marginTop: 8,
  },
  macroPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  macroDivider: {
    width: 1,
    height: 40,
    backgroundColor: BrandColors.gray700,
    marginHorizontal: 8,
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

