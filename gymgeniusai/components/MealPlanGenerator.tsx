/**
 * Meal Plan Generator Component
 * 
 * Main screen for viewing and generating AI-powered meal plans
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BrandColors } from '@/constants/theme';
import { useMealPlanStore } from '@/stores/mealPlanStore';
import { useUserStore } from '@/stores/userStore';
import { usePointsStore } from '@/stores/pointsStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useAuth } from '@/components/AuthProvider';
import { generateMealPlanWithAI } from '@/services/geminiService';
import { saveMealBatchToFirebase, loadMealBatchesFromFirebase } from '@/services/mealPlanService';
import { MealCard } from './MealCard';
import { MealDetailModal } from './MealDetailModal';
import { GeneratedMeal, MealType, MealPlanGenerationRequest } from '@/types/mealPlan';
import { format } from 'date-fns';

interface MealPlanGeneratorProps {
  isInitialGeneration?: boolean; // True when just unlocked
  onClose?: () => void;
}

const normalizeMealGoal = (goal: string): string => {
  switch (goal) {
    case 'lose_fat':
      return 'lose_weight';
    case 'gain_strength':
    case 'increase_power':
      return 'build_muscle';
    case 'improve_endurance':
      return 'increase_endurance';
    case 'improve_flexibility':
    case 'general_health':
      return 'stay_fit';
    default:
      return goal || 'stay_fit';
  }
};

export function MealPlanGenerator({ isInitialGeneration = false, onClose }: MealPlanGeneratorProps) {
  const router = useRouter();
  const { user } = useAuth();
  const profile = useUserStore((state) => state.profile);
  const { mealBatches, currentBatch, isGenerating, setIsGenerating, setCurrentBatch, addMealBatch } = useMealPlanStore();
  const { addMeal, selectedDate } = useNutritionStore();
  
  const [selectedMeal, setSelectedMeal] = useState<GeneratedMeal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Load meal plan history on mount
  useEffect(() => {
    if (user && !isInitialGeneration) {
      loadHistory();
    }
  }, [user]);
  
  // Generate initial meal plan if this is first unlock
  useEffect(() => {
    if (isInitialGeneration && user && profile) {
      generateNewMealPlan();
    }
  }, [isInitialGeneration]);
  
  const loadHistory = async () => {
    if (!user) return;
    
    setIsLoadingHistory(true);
    try {
      const batches = await loadMealBatchesFromFirebase(user.uid);
      useMealPlanStore.setState({ mealBatches: batches });
      
      if (batches.length > 0 && !currentBatch) {
        setCurrentBatch(batches[0]);
      }
    } catch (error) {
      console.error('Error loading meal plan history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };
  
  const generateNewMealPlan = async () => {
    if (!user || !profile) {
      console.error('❌ Missing user or profile data');
      Alert.alert('Error', 'Please complete your profile first');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      console.log('🎯 Generating new meal plan...');
      console.log('👤 User:', user.uid);
      console.log('📋 Profile:', profile);
      
      // Get personalized macros or use defaults
      const targetMacros = useNutritionStore.getState().personalizedTargets || {
        calories: 2500,
        protein: 150,
        carbs: 250,
        fat: 80,
      };
      
      console.log('📊 Target macros:', targetMacros);
      
      // Calculate age from birthday if available
      let age: number | undefined;
      if (profile.birthday) {
        const birthDate = new Date(profile.birthday);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        console.log('🎂 Calculated age:', age);
      }
      
      // Parse weight correctly
      let weight: number | undefined;
      if (profile.weight?.value) {
        if (typeof profile.weight.value === 'number') {
          weight = profile.weight.value;
        } else if (typeof profile.weight.value === 'string') {
          // Handle "195" format
          const parsed = parseFloat(profile.weight.value);
          if (!isNaN(parsed)) {
            weight = parsed;
          }
        }
      }
      
      console.log('⚖️ Weight:', weight);
      
      const primaryGoal =
        (profile.goals && profile.goals.length > 0 ? profile.goals[0] : profile.primaryGoal) || 'general_health';
      const normalizedGoal = normalizeMealGoal(primaryGoal);

      const request: MealPlanGenerationRequest = {
        userId: user.uid,
        firstName: profile.firstName || 'there',
        goal: normalizedGoal,
        experience: profile.exerciseExperience,
        dietaryPreference: profile.nutritionPreference,
        targetMacros,
        age,
        weight,
        sex: profile.sex,
      };
      
      console.log('📝 Request:', request);
      
      // Generate meal plan with AI
      const batch = await generateMealPlanWithAI(request);
      console.log('🍽️ Generated batch:', batch);
      
      // Save to Firebase
      await saveMealBatchToFirebase(batch);
      console.log('💾 Saved to Firebase');
      
      // Add to store
      addMealBatch(batch);
      setCurrentBatch(batch);
      console.log('✅ Added to store and set as current batch');
      
      // No need to deduct points here - already done in home screen
      
      console.log('✅ Meal plan generated successfully');
    } catch (error) {
      console.error('❌ Error generating meal plan:', error);
      Alert.alert(
        'Error',
        `Failed to generate meal plan: ${error.message || 'Unknown error'}`,
      );
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleMealPress = (meal: GeneratedMeal) => {
    setSelectedMeal(meal);
    setShowDetailModal(true);
  };
  
  const handleAddToMealSlot = async (mealType: MealType) => {
    if (!selectedMeal || !user) return;
    
    try {
      console.log(`📝 Adding ${selectedMeal.name} to ${mealType}`);
      
      // Format the date for nutrition tracking
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Convert mealType to match nutrition store format (snack -> snacks)
      const nutritionMealType = mealType === 'snack' ? 'snacks' : mealType;
      
      // Add meal to nutrition tracker
      // We'll create a meal entry with all ingredients
      const mealEntry = {
        id: `meal_${Date.now()}`,
        name: selectedMeal.name,
        mealType: nutritionMealType,
        calories: selectedMeal.macros.calories,
        protein: selectedMeal.macros.protein,
        carbs: selectedMeal.macros.carbs,
        fat: selectedMeal.macros.fat,
        ingredients: selectedMeal.ingredients.map(ing => 
          `${ing.amount} ${ing.unit} ${ing.name}`.trim()
        ).join('\n'),
      };
      
      // Add to nutrition store
      await addMeal(dateStr, nutritionMealType, mealEntry);
      
      // Mark meal as added in the batch
      if (currentBatch) {
        useMealPlanStore.getState().markMealAsAdded(currentBatch.id, selectedMeal.mealType, dateStr);
        
        // Update Firebase
        await saveMealBatchToFirebase({
          ...currentBatch,
          meals: {
            ...currentBatch.meals,
            [selectedMeal.mealType]: {
              ...selectedMeal,
              addedToNutrition: new Date(),
              addedToDate: dateStr,
            },
          },
        });
      }
      
      setShowDetailModal(false);
      
      Alert.alert(
        '✅ Meal Added!',
        `${selectedMeal.name} has been added to your ${mealType}.`,
        [
          {
            text: 'View Nutrition',
            onPress: () => {
              if (onClose) onClose();
              router.push('/(tabs)/nutrition');
            },
          },
          { text: 'OK', style: 'cancel' },
        ],
      );
    } catch (error) {
      console.error('Error adding meal:', error);
      Alert.alert('Error', 'Failed to add meal. Please try again.');
    }
  };
  
  if (isGenerating) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: BrandColors.background }]}>
        <Text style={[styles.loadingTitle, { color: BrandColors.text }]}>
          🤖 Generating Your
        </Text>
        <Text style={[styles.loadingTitle, { color: BrandColors.text }]}>
          Personalized
        </Text>
        <Text style={[styles.loadingTitle, { color: BrandColors.text }]}>
          Meal Plan...
        </Text>
        
        <ActivityIndicator size="large" color={BrandColors.accent} style={{ marginTop: 30 }} />
        
        <View style={{ marginTop: 30 }}>
          <Text style={[styles.loadingStep, { color: BrandColors.textSecondary }]}>
            Analyzing your goals...
          </Text>
          <Text style={[styles.loadingStep, { color: BrandColors.textSecondary }]}>
            Creating custom meals...
          </Text>
          <Text style={[styles.loadingStep, { color: BrandColors.textSecondary }]}>
            Calculating macros...
          </Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: BrandColors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={onClose} 
            style={[styles.backButton, { backgroundColor: BrandColors.surface }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.backText, { color: BrandColors.accent }]}>← Back</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.title, { color: BrandColors.text }]}>
          {currentBatch ? 'Your Meal Plan' : 'Meal Ideas History'}
        </Text>
        
        {/* History Button */}
        {mealBatches.length > 0 && (
          <TouchableOpacity
            style={[styles.historyButton, { backgroundColor: BrandColors.surface }]}
            onPress={() => {
              // Toggle between current batch and history view
              if (currentBatch) {
                setCurrentBatch(null);
              } else {
                // Show the most recent batch
                const mostRecent = mealBatches[0];
                setCurrentBatch(mostRecent);
              }
            }}
          >
            <Text style={[styles.historyButtonText, { color: BrandColors.accent }]}>
              {currentBatch ? '📚 View History' : '🍽️ View Current Batch'}
            </Text>
          </TouchableOpacity>
        )}
        
        {currentBatch && (
          <Text style={[styles.subtitle, { color: BrandColors.textSecondary }]}>
            Generated {format(new Date(currentBatch.generatedAt), 'MMM d, yyyy • h:mm a')}
          </Text>
        )}
        
        {/* History View */}
        {!currentBatch && mealBatches.length > 0 && (
          <View style={styles.historyContainer}>
            <Text style={[styles.historyTitle, { color: BrandColors.text }]}>
              📚 Past Meal Plans
            </Text>
            {mealBatches.map((batch, index) => (
              <TouchableOpacity
                key={batch.id}
                style={[styles.historyItem, { backgroundColor: BrandColors.surface }]}
                onPress={() => setCurrentBatch(batch)}
              >
                <Text style={[styles.historyDate, { color: BrandColors.text }]}>
                  {format(new Date(batch.generatedAt), 'MMM d, yyyy • h:mm a')}
                </Text>
                <Text style={[styles.historyMacros, { color: BrandColors.textSecondary }]}>
                  {batch.totalMacros.calories} kcal • {batch.totalMacros.protein}g protein
                </Text>
                <Text style={[styles.historyGoal, { color: BrandColors.accent }]}>
                  Goal: {batch.basedOnProfile.goal}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {currentBatch && (
          <Text style={[styles.instructions, { color: BrandColors.textSecondary }]}>
            Tap any meal to add it to your nutrition tracker!
          </Text>
        )}
        
        {/* Current Batch Meals */}
        {currentBatch && (
          <View style={styles.mealsContainer}>
            {!currentBatch.meals.breakfast.addedToNutrition && (
              <MealCard 
                meal={currentBatch.meals.breakfast} 
                onPress={() => handleMealPress(currentBatch.meals.breakfast)}
              />
            )}
            {!currentBatch.meals.lunch.addedToNutrition && (
              <MealCard 
                meal={currentBatch.meals.lunch} 
                onPress={() => handleMealPress(currentBatch.meals.lunch)}
              />
            )}
            {!currentBatch.meals.dinner.addedToNutrition && (
              <MealCard 
                meal={currentBatch.meals.dinner} 
                onPress={() => handleMealPress(currentBatch.meals.dinner)}
              />
            )}
            {!currentBatch.meals.snack.addedToNutrition && (
              <MealCard 
                meal={currentBatch.meals.snack} 
                onPress={() => handleMealPress(currentBatch.meals.snack)}
              />
            )}
            
            {/* Show message if all meals have been added */}
            {currentBatch.meals.breakfast.addedToNutrition && 
             currentBatch.meals.lunch.addedToNutrition && 
             currentBatch.meals.dinner.addedToNutrition && 
             currentBatch.meals.snack.addedToNutrition && (
              <View style={[styles.allAddedCard, { backgroundColor: BrandColors.gray900 }]}>
                <Text style={[styles.allAddedText, { color: BrandColors.text }]}>
                  ✅ All meals from this batch have been added to your nutrition tracker!
                </Text>
                <Text style={[styles.allAddedSubtext, { color: BrandColors.textSecondary }]}>
                  Generate a new meal plan or view your history.
                </Text>
              </View>
            )}
            
            {/* Total Macros */}
            <View style={[styles.totalsCard, { 
              backgroundColor: BrandColors.gray900,
              borderColor: BrandColors.accent,
            }]}>
              <Text style={[styles.totalsTitle, { color: BrandColors.textSecondary }]}>
                📊 DAILY TOTALS
              </Text>
              <Text style={[styles.totalsText, { color: BrandColors.text }]}>
                {currentBatch.totalMacros.calories} kcal | {currentBatch.totalMacros.protein}g protein
              </Text>
              <Text style={[styles.totalsText, { color: BrandColors.text }]}>
                {currentBatch.totalMacros.carbs}g carbs | {currentBatch.totalMacros.fat}g fat
              </Text>
            </View>
          </View>
        )}
        
        {/* Generate New Button */}
        <TouchableOpacity
          style={[styles.generateButton, { 
            backgroundColor: BrandColors.accent,
            opacity: isGenerating ? 0.6 : 1,
          }]}
          onPress={generateNewMealPlan}
          disabled={isGenerating}
        >
          <Text style={styles.generateButtonText}>
            🔄 Generate New Meal Plan
          </Text>
          <Text style={styles.generateButtonSubtext}>
            (1,200 V)
          </Text>
        </TouchableOpacity>
        
        {/* Meal History */}
        {!isInitialGeneration && mealBatches.length > 1 && (
          <View style={styles.historySection}>
            <Text style={[styles.historyTitle, { color: BrandColors.textSecondary }]}>
              Previous Meal Plans
            </Text>
            {mealBatches.slice(1, 5).map((batch) => (
              <TouchableOpacity
                key={batch.id}
                style={[styles.historyCard, { 
                  backgroundColor: BrandColors.gray900,
                  borderColor: BrandColors.gray800,
                }]}
                onPress={() => setCurrentBatch(batch)}
              >
                <Text style={[styles.historyDate, { color: BrandColors.text }]}>
                  📅 {format(new Date(batch.generatedAt), 'MMM d, yyyy • h:mm a')}
                </Text>
                <Text style={[styles.historyMacros, { color: BrandColors.textSecondary }]}>
                  {batch.totalMacros.calories} kcal | {batch.totalMacros.protein}g protein
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>
      
      {/* Meal Detail Modal */}
      <MealDetailModal
        visible={showDetailModal}
        meal={selectedMeal}
        onClose={() => setShowDetailModal(false)}
        onAddToMealSlot={handleAddToMealSlot}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  loadingStep: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50,
  },
  header: {
    marginBottom: 20,
    paddingTop: 10,
    zIndex: 10,
  },
  backButton: {
    padding: 12,
    paddingTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 8,
    minWidth: 80,
  },
  backText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'left',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  instructions: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  mealsContainer: {
    marginBottom: 20,
  },
  totalsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 8,
  },
  totalsTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  totalsText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  generateButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  generateButtonSubtext: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 4,
    opacity: 0.8,
  },
  historySection: {
    marginTop: 12,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  historyCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyMacros: {
    fontSize: 14,
  },
  historyButton: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'center',
  },
  historyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  historyContainer: {
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  historyItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BrandColors.gray800,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyGoal: {
    fontSize: 12,
    fontWeight: '500',
  },
  allAddedCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  allAddedText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  allAddedSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

