/**
 * Meal Detail Modal Component
 * 
 * Shows full meal details and allows user to select which meal slot to add it to
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { GeneratedMeal, MealType } from '@/types/mealPlan';
import { BrandColors } from '@/constants/theme';

interface MealDetailModalProps {
  visible: boolean;
  meal: GeneratedMeal | null;
  onClose: () => void;
  onAddToMealSlot: (mealType: MealType) => void;
  onSaveToFavorites?: () => void;
}

const MEAL_SLOT_OPTIONS: Array<{ type: MealType; icon: string; label: string }> = [
  { type: 'breakfast', icon: '🌅', label: 'Breakfast' },
  { type: 'lunch', icon: '🌞', label: 'Lunch' },
  { type: 'dinner', icon: '🌙', label: 'Dinner' },
  { type: 'snack', icon: '🍎', label: 'Snack' },
];

export function MealDetailModal({
  visible,
  meal,
  onClose,
  onAddToMealSlot,
  onSaveToFavorites,
}: MealDetailModalProps) {
  if (!meal) return null;
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: BrandColors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: BrandColors.gray800 }]}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Text style={[styles.backText, { color: BrandColors.accent }]}>← Back</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Meal Name */}
          <Text style={[styles.mealName, { color: BrandColors.text }]}>{meal.name}</Text>
          
          {/* Macros Section */}
          <View style={[styles.section, { backgroundColor: BrandColors.gray900 }]}>
            <Text style={[styles.sectionTitle, { color: BrandColors.textSecondary }]}>
              📊 Macros
            </Text>
            <View style={styles.macrosGrid}>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: BrandColors.text }]}>
                  {meal.macros.calories}
                </Text>
                <Text style={[styles.macroLabel, { color: BrandColors.textSecondary }]}>
                  kcal
                </Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: BrandColors.text }]}>
                  {meal.macros.protein}g
                </Text>
                <Text style={[styles.macroLabel, { color: BrandColors.textSecondary }]}>
                  Protein
                </Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: BrandColors.text }]}>
                  {meal.macros.carbs}g
                </Text>
                <Text style={[styles.macroLabel, { color: BrandColors.textSecondary }]}>
                  Carbs
                </Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: BrandColors.text }]}>
                  {meal.macros.fat}g
                </Text>
                <Text style={[styles.macroLabel, { color: BrandColors.textSecondary }]}>
                  Fat
                </Text>
              </View>
            </View>
          </View>
          
          {/* Ingredients Section */}
          <View style={[styles.section, { backgroundColor: BrandColors.gray900 }]}>
            <Text style={[styles.sectionTitle, { color: BrandColors.textSecondary }]}>
              📝 Ingredients
            </Text>
            {meal.ingredients.map((ingredient, index) => (
              <View key={index} style={styles.ingredientRow}>
                <Text style={[styles.ingredientBullet, { color: BrandColors.accent }]}>
                  •
                </Text>
                <Text style={[styles.ingredientText, { color: BrandColors.text }]}>
                  {ingredient.amount && ingredient.unit
                    ? `${ingredient.amount} ${ingredient.unit} `
                    : ''}
                  {ingredient.name}
                </Text>
              </View>
            ))}
          </View>
          
          {/* Meal Slot Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: BrandColors.textSecondary }]}>
              Add this meal to:
            </Text>
            <View style={styles.mealSlotsGrid}>
              {MEAL_SLOT_OPTIONS.map((slot) => (
                <TouchableOpacity
                  key={slot.type}
                  style={[styles.mealSlotButton, { 
                    backgroundColor: BrandColors.gray900,
                    borderColor: BrandColors.gray800,
                  }]}
                  onPress={() => onAddToMealSlot(slot.type)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.mealSlotIcon}>{slot.icon}</Text>
                  <Text style={[styles.mealSlotLabel, { color: BrandColors.text }]}>
                    {slot.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Save to Favorites (Optional) */}
          {onSaveToFavorites && (
            <TouchableOpacity
              style={[styles.favoriteButton, { 
                backgroundColor: BrandColors.gray900,
                borderColor: BrandColors.accent,
              }]}
              onPress={onSaveToFavorites}
            >
              <Text style={[styles.favoriteButtonText, { color: BrandColors.accent }]}>
                💾 Save to Favorites
              </Text>
            </TouchableOpacity>
          )}
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mealName: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 20,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  ingredientRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  ingredientBullet: {
    fontSize: 20,
    marginRight: 8,
    marginTop: -2,
  },
  ingredientText: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  mealSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 12,
  },
  mealSlotButton: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  mealSlotIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  mealSlotLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  favoriteButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    marginTop: 8,
  },
  favoriteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

