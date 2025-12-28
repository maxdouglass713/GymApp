/**
 * Meal Plan Generator Component
 * 
 * Main screen for viewing and generating AI-powered meal plans
 */

import React, { useState, useEffect } from 'react';
import { checkFeatureOrShowComingSoon } from '@/utils/features/featureFlags';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter, router } from 'expo-router';
import { BrandColors } from '@/constants/theme';
import { useMealPlanStore } from '@/stores/mealPlanStore';
import { useUserStore } from '@/stores/userStore';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { usePointsStore } from '@/stores/pointsStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useAuth } from '@/components/AuthProvider';
import { generateMealPlanWithAI } from '@/services/geminiService';
import { saveMealBatchToFirebase, loadMealBatchesFromFirebase } from '@/services/mealPlanService';
import { MealCard } from './MealCard';
import { MealDetailModal } from './MealDetailModal';
import { GeneratedMeal, MealType, MealPlanGenerationRequest } from '@/types/mealPlan';
import { format } from 'date-fns';
import { AIFeatureGate } from '@/components/ai/AIFeatureGate';
import { AILoadingIndicator } from '@/components/ai/AILoadingIndicator';
import { AIGenerationCard } from '@/components/ai/AIGenerationCard';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { eventBus } from '@/lib/eventBus';
import { teamService } from '@/services/teamService';
import { userService } from '@/services/firestoreService';
import { mealPlanSharingService } from '@/services/mealPlanSharingService';

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
  
  // Check if AI features are enabled - show "Coming Soon" if disabled
  useEffect(() => {
    if (!checkFeatureOrShowComingSoon('mealPlans', 'AI Meal Plan Generator')) {
      onClose();
      return;
    }
  }, [onClose]);
  const profile = useUserStore((state) => state.profile);
  const { mealBatches, currentBatch, isGenerating, setIsGenerating, setCurrentBatch, addMealBatch } = useMealPlanStore();
  const { addMeal, selectedDate } = useNutritionStore();
  // Check if user is a personal user - if so, don't show coach/trainer controls
  const isPersonalUser = profile?.userType === 'personal' || profile?.appUseType === 'personal';
  const isTrainer = !isPersonalUser && profile?.appUseType === 'gym_trainer' && profile?.institutionRole !== 'player';
  const isCoach = !isPersonalUser && profile?.userType === 'institution' && profile?.institutionRole !== 'player' && !isTrainer;
  const isCoachOrTrainer = isCoach || isTrainer;
  
  type ClientOption = { id: string; name: string };
  const [teamMembers, setTeamMembers] = useState<ClientOption[]>([]);
  const [teamName, setTeamName] = useState<string>(profile?.institutionName || 'Team');
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [isSendingToClient, setIsSendingToClient] = useState(false);
  const [coachForm, setCoachForm] = useState({
    goalFocus: '',
    calorieTarget: '',
    dietaryNotes: '',
    specialNotes: '',
  });
  
  const [selectedMeal, setSelectedMeal] = useState<GeneratedMeal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showGoalFocusDropdown, setShowGoalFocusDropdown] = useState(false);
  const [showCalorieTargetDropdown, setShowCalorieTargetDropdown] = useState(false);
  const [showDietaryNotesDropdown, setShowDietaryNotesDropdown] = useState(false);
  const updateCoachForm = (field: keyof typeof coachForm, value: string) => {
    setCoachForm((prev) => ({ ...prev, [field]: value }));
  };
  
  // Goal focus options
  const GOAL_FOCUS_OPTIONS = [
    { value: 'lose_weight', label: 'Lose Weight / Cut' },
    { value: 'build_muscle', label: 'Build Muscle / Bulk' },
    { value: 'maintain', label: 'Maintain Weight' },
    { value: 'performance', label: 'Athletic Performance' },
    { value: 'health', label: 'General Health' },
  ];
  
  // Calorie target options (common ranges)
  const CALORIE_TARGET_OPTIONS = [
    { value: '1500', label: '1500 calories' },
    { value: '1800', label: '1800 calories' },
    { value: '2000', label: '2000 calories' },
    { value: '2200', label: '2200 calories' },
    { value: '2400', label: '2400 calories' },
    { value: '2600', label: '2600 calories' },
    { value: '2800', label: '2800 calories' },
    { value: '3000', label: '3000 calories' },
    { value: '3200', label: '3200 calories' },
    { value: '3500', label: '3500 calories' },
  ];
  
  // Dietary notes options
  const DIETARY_NOTES_OPTIONS = [
    { value: 'high_protein', label: 'High Protein' },
    { value: 'low_carb', label: 'Low Carb' },
    { value: 'keto', label: 'Keto' },
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'paleo', label: 'Paleo' },
    { value: 'mediterranean', label: 'Mediterranean' },
    { value: 'gluten_free', label: 'Gluten Free' },
    { value: 'dairy_free', label: 'Dairy Free' },
    { value: 'balanced', label: 'Balanced' },
  ];
  
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

  useEffect(() => {
    if (!isCoachOrTrainer || !profile?.teamId) return;
    const unsubscribe = teamService.subscribeToTeam(profile.teamId, (team) => {
      if (!team) return;
      setTeamName(team.name || profile?.institutionName || 'Team');
      const clients =
        team.members
          ?.filter((member) => member.role === 'player')
          .map((member) => ({
            id: member.userId,
            name: member.name || 'Client',
          })) || [];
      setTeamMembers(clients);
      if (clients.length === 0) {
        setSelectedClient(null);
      } else if (
        selectedClient &&
        !clients.some((client) => client.id === selectedClient.id)
      ) {
        setSelectedClient(null);
      }
    });
    return () => unsubscribe();
  }, [isCoachOrTrainer, profile?.teamId, profile?.institutionName, selectedClient]);
  
  // Helper function to map profile goals to dropdown values
  const mapProfileGoalToDropdownValue = (goal: string): string => {
    const goalLower = goal.toLowerCase();
    if (goalLower === 'lose_fat' || goalLower.includes('lose') || goalLower.includes('cut')) {
      return 'lose_weight';
    }
    if (goalLower === 'build_muscle' || goalLower === 'gain_strength' || goalLower.includes('build') || goalLower.includes('bulk') || goalLower.includes('muscle')) {
      return 'build_muscle';
    }
    if (goalLower === 'improve_fitness' || goalLower === 'improve_endurance' || goalLower.includes('performance') || goalLower.includes('athletic')) {
      return 'performance';
    }
    if (goalLower === 'general_health' || goalLower === 'improve_flexibility' || goalLower.includes('health')) {
      return 'health';
    }
    // Default to maintain if unclear
    return 'maintain';
  };

  // Auto-populate calorie target and goal when client/player is selected
  useEffect(() => {
    if (!isCoachOrTrainer || !selectedClient) {
      // Clear fields if no client is selected
      if (!selectedClient) {
        updateCoachForm('calorieTarget', '');
        updateCoachForm('goalFocus', '');
      }
      return;
    }
    
    // Fetch client profile and populate fields
    const loadClientData = async () => {
      try {
        const clientDocument = await userService.getUser(selectedClient.id);
        
        // Populate calorie target
        if (clientDocument?.customMacroTargets?.calories) {
          updateCoachForm('calorieTarget', clientDocument.customMacroTargets.calories.toString());
          console.log('✅ Auto-populated calorie target for client:', selectedClient.name, '->', clientDocument.customMacroTargets.calories);
        } else {
          updateCoachForm('calorieTarget', '');
        }
        
        // Populate goal/focus from client's profile
        const primaryGoal = clientDocument?.primaryGoal || 
                           (clientDocument?.goals && clientDocument.goals.length > 0 ? clientDocument.goals[0] : null);
        
        if (primaryGoal) {
          const dropdownValue = mapProfileGoalToDropdownValue(primaryGoal);
          updateCoachForm('goalFocus', dropdownValue);
          console.log('✅ Auto-populated goal/focus for client:', selectedClient.name, '->', primaryGoal, 'mapped to', dropdownValue);
        } else {
          updateCoachForm('goalFocus', '');
        }
      } catch (error) {
        console.error('⚠️ Failed to load client data:', error);
        updateCoachForm('calorieTarget', '');
        updateCoachForm('goalFocus', '');
      }
    };
    
    loadClientData();
  }, [selectedClient, isCoachOrTrainer]);
  
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
  
  const deriveGoalFromInput = (input: string) => {
    const text = input.toLowerCase();
    if (text.includes('lose') || text.includes('cut')) return 'lose_weight';
    if (text.includes('muscle') || text.includes('build') || text.includes('bulk')) return 'build_muscle';
    if (text.includes('endurance') || text.includes('stamina')) return 'increase_endurance';
    if (text.includes('maintain') || text.includes('healthy')) return 'stay_fit';
    return 'general_health';
  };

  const deriveMacrosFromCalories = (calories: number) => {
    const safeCalories = Math.max(calories, 1200);
    return {
      calories: safeCalories,
      protein: Math.round((safeCalories * 0.3) / 4),
      carbs: Math.round((safeCalories * 0.4) / 4),
      fat: Math.round((safeCalories * 0.3) / 9),
    };
  };

  const generateNewMealPlan = async () => {
    if (!user || !profile) {
      console.error('❌ Missing user or profile data');
      Alert.alert('Error', 'Please complete your profile first');
      return;
    }

    if (isCoachOrTrainer) {
      if (!profile.teamId) {
        Alert.alert('Team Required', 'Join or create a team before generating plans for clients.');
        return;
      }
      if (!selectedClient) {
        Alert.alert('Select Client', 'Choose which client should receive this plan.');
        return;
      }
    }
    
    setIsGenerating(true);
    
    try {
      console.log('🎯 Generating new meal plan with AI...');
      console.log('👤 User:', user.uid);
      console.log('📋 Profile:', profile);
      
      // Get personalized macros or use defaults
      let targetMacros = useNutritionStore.getState().personalizedTargets || {
        calories: 2500,
        protein: 150,
        carbs: 250,
        fat: 80,
      };

      let generationProfile: any = profile;
      let assignedClientId: string | undefined;
      let assignedClientName: string | undefined;
      let clientDocument: any = null;

      if (isCoachOrTrainer && selectedClient) {
        assignedClientId = selectedClient.id;
        assignedClientName = selectedClient.name;
        try {
          clientDocument = await userService.getUser(selectedClient.id);
          if (clientDocument) {
            generationProfile = {
              ...generationProfile,
              ...clientDocument,
            };
            if (clientDocument.customMacroTargets) {
              targetMacros = {
                calories: clientDocument.customMacroTargets.calories,
                protein: clientDocument.customMacroTargets.protein,
                carbs: clientDocument.customMacroTargets.carbs,
                fat: clientDocument.customMacroTargets.fat,
              };
            }
          }
        } catch (error) {
          console.error('⚠️ Failed to load client profile:', error);
        }
      }

      if (!clientDocument && coachForm.calorieTarget) {
        const targetCalories = parseInt(coachForm.calorieTarget, 10);
        if (!isNaN(targetCalories)) {
          targetMacros = deriveMacrosFromCalories(targetCalories);
        }
      }
      
      console.log('📊 Target macros:', targetMacros);
      
      // Calculate age from birthday if available
      let age: number | undefined;
      if (generationProfile.birthday) {
        const birthDate = new Date(generationProfile.birthday);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        console.log('🎂 Calculated age:', age);
      }
      
      // Parse weight correctly
      let weight: number | undefined;
      if (generationProfile.weight?.value) {
        if (typeof generationProfile.weight.value === 'number') {
          weight = generationProfile.weight.value;
        } else if (typeof generationProfile.weight.value === 'string') {
          const parsed = parseFloat(generationProfile.weight.value);
          if (!isNaN(parsed)) {
            weight = parsed;
          }
        }
      }
      
      console.log('⚖️ Weight:', weight);
      
      const primaryGoal =
        (generationProfile.goals && generationProfile.goals.length > 0
          ? generationProfile.goals[0]
          : generationProfile.primaryGoal) || 'general_health';
      let normalizedGoal = normalizeMealGoal(primaryGoal);
      if (coachForm.goalFocus) {
        normalizedGoal = normalizeMealGoal(deriveGoalFromInput(coachForm.goalFocus));
      }
      
      const request: MealPlanGenerationRequest = {
        userId: assignedClientId || user.uid,
        firstName: assignedClientName || generationProfile.firstName || 'there',
        goal: normalizedGoal,
        experience: generationProfile.exerciseExperience,
        dietaryPreference: generationProfile.nutritionPreference,
        targetMacros,
        age,
        weight,
        sex: generationProfile.sex,
        assignedClientId,
        assignedClientName,
        coachNotes: coachForm.specialNotes || undefined,
        customGoal: coachForm.goalFocus || undefined,
        customCalorieTarget: coachForm.calorieTarget ? parseInt(coachForm.calorieTarget, 10) || undefined : undefined,
        dietaryNotes: coachForm.dietaryNotes || undefined,
      };
      
      console.log('📝 Request:', request);
      
      // Generate meal plan with AI (now goes through Firebase Functions)
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
  
  const handleSendPlanToClient = async () => {
    if (!currentBatch || !user || !profile?.teamId || !selectedClient) {
      Alert.alert('Select Client', 'Choose a client and generate a plan before sending.');
      return;
    }
    setIsSendingToClient(true);
    try {
      const success = await mealPlanSharingService.shareMealPlanWithPlayers(
        {
          ...currentBatch,
          date: new Date().toISOString().split('T')[0],
          coachNotes: coachForm.specialNotes,
          goalFocus: coachForm.goalFocus,
        },
        user.uid,
        profile.firstName || 'Coach',
        profile.teamId,
        teamName || profile.institutionName || 'Team',
        [selectedClient.id],
        [selectedClient.name]
      );
      if (success) {
        Alert.alert('Sent!', `Meal plan delivered to ${selectedClient.name}'s inbox.`);
      } else {
        Alert.alert('Error', 'Unable to send meal plan. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error sending meal plan:', error);
      Alert.alert('Error', 'Unable to send meal plan. Please try again.');
    } finally {
      setIsSendingToClient(false);
    }
  };
  
  const { tier } = useSubscriptionStore();

  if (isGenerating) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: BrandColors.background }]}>
        <AIGenerationCard
          title="AI Meal Plan Generator"
          subtitle="Creating your personalized meal plan"
          icon="sparkles"
          loading={true}
          glowColor={BrandColors.accent}
        >
          <AILoadingIndicator 
            message="AI is analyzing your goals and creating custom meals..." 
            size="large"
          />
        </AIGenerationCard>
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
        
        {/* Hero Header Section */}
        <View style={[styles.heroHeader, { backgroundColor: BrandColors.accent + '15' }]}>
          <View style={[styles.heroIconContainer, { backgroundColor: BrandColors.accent + '25' }]}>
            <IconSymbol name="fork.knife" size={40} color={BrandColors.accent} />
          </View>
          <Text style={[styles.heroTitle, { color: BrandColors.text }]}>Custom Meal Ideas</Text>
          <Text style={[styles.heroSubtitle, { color: BrandColors.textSecondary }]}>
            AI-powered meal plans tailored to your goals, preferences, and nutritional needs
          </Text>
          <View style={styles.heroFeatures}>
            <View style={[styles.featureBadge, { backgroundColor: BrandColors.accent + '20' }]}>
              <IconSymbol name="target" size={14} color={BrandColors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.featureBadgeText, { color: BrandColors.accent }]}>Goal-Based</Text>
            </View>
            <View style={[styles.featureBadge, { backgroundColor: BrandColors.accent + '20' }]}>
              <IconSymbol name="chart.bar.fill" size={14} color={BrandColors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.featureBadgeText, { color: BrandColors.accent }]}>Macro-Targeted</Text>
            </View>
            <View style={[styles.featureBadge, { backgroundColor: BrandColors.accent + '20' }]}>
              <IconSymbol name="bolt.fill" size={14} color={BrandColors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.featureBadgeText, { color: BrandColors.accent }]}>Personalized</Text>
            </View>
          </View>
        </View>

        {isCoachOrTrainer && (
          <View style={[styles.coachPanel, { backgroundColor: BrandColors.surface, borderColor: BrandColors.accent + '30' }]}>
            <View style={styles.coachPanelHeader}>
              <View style={[styles.coachPanelIconContainer, { backgroundColor: BrandColors.accent + '20' }]}>
                <IconSymbol name="person.badge.plus" size={24} color={BrandColors.accent} />
              </View>
              <View style={styles.coachPanelHeaderText}>
                <Text style={[styles.coachPanelTitle, { color: BrandColors.text }]}>
                  Coach / Trainer Controls
                </Text>
                <Text style={[styles.coachPanelSubtitle, { color: BrandColors.textSecondary }]}>
                  Create personalized meal plans for your clients
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.clientSelector,
                { borderColor: BrandColors.accent },
                !selectedClient && teamMembers.length === 0 && { opacity: 0.5 },
              ]}
              onPress={() => {
                if (teamMembers.length === 0) return;
                setShowClientModal(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.clientSelectorText, { color: BrandColors.text }]}>
                {teamMembers.length === 0
                  ? 'No clients found'
                  : selectedClient
                  ? `Client: ${selectedClient.name}`
                  : 'Select client'}
              </Text>
              <Text style={[styles.clientSelectorChevron, { color: BrandColors.accent }]}>▾</Text>
            </TouchableOpacity>

            <View style={styles.coachInputGroup}>
              {/* Goal Focus Dropdown */}
              <TouchableOpacity
                style={[
                  styles.focusDropdown,
                  { borderColor: BrandColors.accent },
                ]}
                onPress={() => setShowGoalFocusDropdown(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.focusDropdownText, { color: coachForm.goalFocus ? BrandColors.text : BrandColors.textSecondary }]}>
                  {coachForm.goalFocus 
                    ? GOAL_FOCUS_OPTIONS.find(opt => opt.value === coachForm.goalFocus)?.label || 'Select goal focus'
                    : 'Goal / Focus (Optional)'}
                </Text>
                <Text style={[styles.focusDropdownChevron, { color: BrandColors.accent }]}>▾</Text>
              </TouchableOpacity>
              
              {/* Calorie Target Dropdown */}
              <TouchableOpacity
                style={[
                  styles.focusDropdown,
                  { borderColor: BrandColors.accent },
                ]}
                onPress={() => setShowCalorieTargetDropdown(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.focusDropdownText, { color: coachForm.calorieTarget ? BrandColors.text : BrandColors.textSecondary }]}>
                  {coachForm.calorieTarget 
                    ? CALORIE_TARGET_OPTIONS.find(opt => opt.value === coachForm.calorieTarget)?.label || `${coachForm.calorieTarget} calories`
                    : 'Daily Calorie Target (Optional)'}
                </Text>
                <Text style={[styles.focusDropdownChevron, { color: BrandColors.accent }]}>▾</Text>
              </TouchableOpacity>
              
              {/* Dietary Notes Dropdown */}
              <TouchableOpacity
                style={[
                  styles.focusDropdown,
                  { borderColor: BrandColors.accent },
                ]}
                onPress={() => setShowDietaryNotesDropdown(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.focusDropdownText, { color: coachForm.dietaryNotes ? BrandColors.text : BrandColors.textSecondary }]}>
                  {coachForm.dietaryNotes 
                    ? DIETARY_NOTES_OPTIONS.find(opt => opt.value === coachForm.dietaryNotes)?.label || coachForm.dietaryNotes
                    : 'Dietary Preferences (Optional)'}
                </Text>
                <Text style={[styles.focusDropdownChevron, { color: BrandColors.accent }]}>▾</Text>
              </TouchableOpacity>
              
              <TextInput
                style={[
                  styles.coachInput,
                  styles.coachInputMultiline,
                  { borderColor: BrandColors.gray700, color: BrandColors.text },
                ]}
                placeholder="Any other instructions?"
                placeholderTextColor={BrandColors.textSecondary}
                multiline
                value={coachForm.specialNotes}
                onChangeText={(text) => updateCoachForm('specialNotes', text)}
              />
            </View>
          </View>
        )}

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
            {isCoachOrTrainer && selectedClient && (
              <TouchableOpacity
                style={[
                  styles.sendPlanButton,
                  { backgroundColor: BrandColors.accent },
                  isSendingToClient && { opacity: 0.6 },
                ]}
                onPress={handleSendPlanToClient}
                disabled={isSendingToClient}
                activeOpacity={0.85}
              >
                <Text style={[styles.sendPlanButtonText, { color: '#000' }]}>
                  {isSendingToClient ? 'Sending…' : `📤 Send to ${selectedClient.name}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {/* Generate New Button with AI Feature Gate */}
        <AIFeatureGate 
          feature="mealPlan" 
          onProceed={generateNewMealPlan}
          onNavigateToPlans={() => eventBus.emit('openAIPlans')}
          onNavigateToStore={() => router.push('/(tabs)/store')}
        >
          <TouchableOpacity
            style={[styles.generateButton, { 
              backgroundColor: BrandColors.accent,
              opacity: isGenerating ? 0.6 : 1,
            }]}
            onPress={generateNewMealPlan}
            disabled={isGenerating}
          >
            <Text style={styles.generateButtonText}>
              ✨ Generate AI Meal Plan
            </Text>
            <Text style={styles.generateButtonSubtext}>
              {tier === 'basic' ? '(5,000 V)' : tier === 'pro' ? '(Limited)' : tier === 'elite' ? '(Unlimited)' : '(Upgrade Required)'}
            </Text>
          </TouchableOpacity>
        </AIFeatureGate>
        
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
      
      {/* Client Selector Modal */}
      <Modal
        visible={showClientModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowClientModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.clientModalContent, { backgroundColor: BrandColors.background }]}>
            <Text style={[styles.clientModalTitle, { color: BrandColors.text }]}>
              Choose Client
            </Text>
            <ScrollView style={styles.clientList} showsVerticalScrollIndicator={false}>
              {teamMembers.map((client) => (
                <TouchableOpacity
                  key={client.id}
                  style={[
                    styles.clientListItem,
                    selectedClient?.id === client.id && { borderColor: BrandColors.accent },
                  ]}
                  onPress={() => {
                    setSelectedClient(client);
                    setShowClientModal(false);
                  }}
                >
                  <Text style={[styles.clientListText, { color: BrandColors.text }]}>
                    {client.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {teamMembers.length === 0 && (
                <Text style={[styles.emptyClientText, { color: BrandColors.textSecondary }]}>
                  Invite clients to your team to start sending plans.
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.closeClientModalButton, { backgroundColor: BrandColors.accent }]}
              onPress={() => setShowClientModal(false)}
            >
              <Text style={[styles.closeClientModalText, { color: '#000' }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Goal Focus Dropdown Modal */}
      <Modal
        visible={showGoalFocusDropdown}
        animationType="slide"
        transparent
        onRequestClose={() => setShowGoalFocusDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.focusModalContent, { backgroundColor: BrandColors.background }]}>
            <Text style={[styles.focusModalTitle, { color: BrandColors.text }]}>Select Goal / Focus</Text>
            <ScrollView style={styles.focusList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.focusListItem,
                  !coachForm.goalFocus && { borderColor: BrandColors.accent },
                ]}
                onPress={() => {
                  updateCoachForm('goalFocus', '');
                  setShowGoalFocusDropdown(false);
                }}
              >
                <Text style={[styles.focusListText, { color: BrandColors.text }]}>None (Let AI decide)</Text>
                {!coachForm.goalFocus && (
                  <Text style={[styles.focusListCheck, { color: BrandColors.accent }]}>✓</Text>
                )}
              </TouchableOpacity>
              {GOAL_FOCUS_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.focusListItem,
                    coachForm.goalFocus === option.value && { borderColor: BrandColors.accent },
                  ]}
                  onPress={() => {
                    updateCoachForm('goalFocus', option.value);
                    setShowGoalFocusDropdown(false);
                  }}
                >
                  <Text style={[styles.focusListText, { color: BrandColors.text }]}>
                    {option.label}
                  </Text>
                  {coachForm.goalFocus === option.value && (
                    <Text style={[styles.focusListCheck, { color: BrandColors.accent }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.closeFocusModalButton, { backgroundColor: BrandColors.accent }]}
              onPress={() => setShowGoalFocusDropdown(false)}
            >
              <Text style={[styles.closeFocusModalText, { color: '#000' }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Calorie Target Dropdown Modal */}
      <Modal
        visible={showCalorieTargetDropdown}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCalorieTargetDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.focusModalContent, { backgroundColor: BrandColors.background }]}>
            <Text style={[styles.focusModalTitle, { color: BrandColors.text }]}>Select Calorie Target</Text>
            <ScrollView style={styles.focusList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.focusListItem,
                  !coachForm.calorieTarget && { borderColor: BrandColors.accent },
                ]}
                onPress={() => {
                  updateCoachForm('calorieTarget', '');
                  setShowCalorieTargetDropdown(false);
                }}
              >
                <Text style={[styles.focusListText, { color: BrandColors.text }]}>None (Use client's targets)</Text>
                {!coachForm.calorieTarget && (
                  <Text style={[styles.focusListCheck, { color: BrandColors.accent }]}>✓</Text>
                )}
              </TouchableOpacity>
              {CALORIE_TARGET_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.focusListItem,
                    coachForm.calorieTarget === option.value && { borderColor: BrandColors.accent },
                  ]}
                  onPress={() => {
                    updateCoachForm('calorieTarget', option.value);
                    setShowCalorieTargetDropdown(false);
                  }}
                >
                  <Text style={[styles.focusListText, { color: BrandColors.text }]}>
                    {option.label}
                  </Text>
                  {coachForm.calorieTarget === option.value && (
                    <Text style={[styles.focusListCheck, { color: BrandColors.accent }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.closeFocusModalButton, { backgroundColor: BrandColors.accent }]}
              onPress={() => setShowCalorieTargetDropdown(false)}
            >
              <Text style={[styles.closeFocusModalText, { color: '#000' }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Dietary Notes Dropdown Modal */}
      <Modal
        visible={showDietaryNotesDropdown}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDietaryNotesDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.focusModalContent, { backgroundColor: BrandColors.background }]}>
            <Text style={[styles.focusModalTitle, { color: BrandColors.text }]}>Select Dietary Preferences</Text>
            <ScrollView style={styles.focusList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.focusListItem,
                  !coachForm.dietaryNotes && { borderColor: BrandColors.accent },
                ]}
                onPress={() => {
                  updateCoachForm('dietaryNotes', '');
                  setShowDietaryNotesDropdown(false);
                }}
              >
                <Text style={[styles.focusListText, { color: BrandColors.text }]}>None (Use client's preferences)</Text>
                {!coachForm.dietaryNotes && (
                  <Text style={[styles.focusListCheck, { color: BrandColors.accent }]}>✓</Text>
                )}
              </TouchableOpacity>
              {DIETARY_NOTES_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.focusListItem,
                    coachForm.dietaryNotes === option.value && { borderColor: BrandColors.accent },
                  ]}
                  onPress={() => {
                    updateCoachForm('dietaryNotes', option.value);
                    setShowDietaryNotesDropdown(false);
                  }}
                >
                  <Text style={[styles.focusListText, { color: BrandColors.text }]}>
                    {option.label}
                  </Text>
                  {coachForm.dietaryNotes === option.value && (
                    <Text style={[styles.focusListCheck, { color: BrandColors.accent }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.closeFocusModalButton, { backgroundColor: BrandColors.accent }]}
              onPress={() => setShowDietaryNotesDropdown(false)}
            >
              <Text style={[styles.closeFocusModalText, { color: '#000' }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  sendPlanButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sendPlanButtonText: {
    fontSize: 16,
    fontWeight: '700',
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
  heroHeader: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BrandColors.accent + '30',
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    fontSize: 15,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  heroFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  featureBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 4,
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  coachPanel: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BrandColors.gray800,
  },
  coachPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  coachPanelIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  coachPanelHeaderText: {
    flex: 1,
  },
  coachPanelTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  coachPanelSubtitle: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  clientSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  clientSelectorText: {
    fontSize: 15,
    fontWeight: '600',
  },
  clientSelectorChevron: {
    fontSize: 18,
    fontWeight: '700',
  },
  coachInputGroup: {
    gap: 10,
  },
  coachInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  coachInputMultiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  focusDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: BrandColors.background,
  },
  focusDropdownText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  focusDropdownChevron: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  focusModalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  focusModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  focusModalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  focusList: {
    marginBottom: 16,
  },
  focusListItem: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BrandColors.gray800,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  focusListText: {
    fontSize: 16,
    fontWeight: '600',
  },
  focusListCheck: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeFocusModalButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeFocusModalText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  clientModalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  clientModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  clientList: {
    marginBottom: 16,
  },
  clientListItem: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BrandColors.gray800,
    marginBottom: 10,
  },
  clientListText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyClientText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  closeClientModalButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeClientModalText: {
    fontSize: 16,
    fontWeight: '700',
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

