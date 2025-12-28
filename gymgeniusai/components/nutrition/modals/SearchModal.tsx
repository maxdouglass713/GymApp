import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet, Alert } from 'react-native';
import { BrandColors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { AILoadingIndicator } from '@/components/ai/AILoadingIndicator';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { router } from 'expo-router';
import { eventBus } from '@/lib/eventBus';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { auth } from '@/config/firebase';

interface FoodItem {
  name: string;
  measurements?: Array<{
    amount: number;
    unit: string;
    macros?: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  }>;
}

interface CustomMeal {
  id: string;
  name: string;
  servingSize: string;
  macrosPerServing: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface SearchModalProps {
  visible: boolean;
  searchQuery: string;
  filteredFoods: FoodItem[];
  customMeals?: CustomMeal[];
  onClose: () => void;
  onSearchChange: (query: string) => void;
  onFoodSelect: (food: FoodItem) => void;
  onCustomMealSelect?: (meal: CustomMeal) => void;
  onCreateCustomMeal?: () => void;
  colors: typeof BrandColors;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  visible,
  searchQuery,
  filteredFoods,
  customMeals = [],
  onClose,
  onSearchChange,
  onFoodSelect,
  onCustomMealSelect,
  onCreateCustomMeal,
  colors,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const { tier, canUseAI } = useSubscriptionStore();
  const cameraRef = useRef<CameraView>(null);

  // Cleanup when camera modal closes
  useEffect(() => {
    if (!showCamera && isDetecting) {
      // If camera closes while detecting, stop detecting
      setIsDetecting(false);
    }
  }, [showCamera, isDetecting]);
  
  const query = searchQuery.trim().toLowerCase();
  const filteredCustomMeals = customMeals.filter((meal) =>
    meal.name.toLowerCase().includes(query)
  );

  const shouldShowCreatePrompt =
    query.length > 0 &&
    filteredFoods.length === 0 &&
    filteredCustomMeals.length === 0 &&
    onCreateCustomMeal;

  const handlePhotoDetection = async () => {
    // Check feature flag - show "Coming Soon" if AI is disabled
    const { checkFeatureOrShowComingSoon } = require('@/utils/features/featureFlags');
    if (!checkFeatureOrShowComingSoon('cameraPhotoMacros', 'Auto-detect Food')) {
      return;
    }
    
    if (!canUseAI('macroEstimation')) {
      if (tier === 'free' || tier === 'basic') {
        Alert.alert(
          'AI Feature Locked',
          'AI photo detection requires a Pro or Elite subscription. Basic tier users do not have access to AI macro estimation features.',
          [
            {
              text: 'View Plans',
              onPress: () => eventBus.emit('openAIPlans'),
              style: 'default' as const,
            },
            { text: 'Cancel', style: 'cancel' as const },
          ]
        );
      } else if (tier === 'pro') {
        Alert.alert(
          'Monthly Limit Reached',
          'You\'ve used all AI macro estimations this month. Upgrade to Elite for unlimited access.',
          [
            {
              text: 'Upgrade to Elite',
              onPress: () => eventBus.emit('openAIPlans'),
              style: 'default' as const,
            },
            { text: 'Cancel', style: 'cancel' as const },
          ]
        );
      }
      return;
    }

    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera Permission', 'Camera access is required for photo detection.');
        return;
      }
    }

    setShowCamera(true);
  };

  const handleCapture = async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not ready. Please try again.');
      return;
    }

    setIsDetecting(true);
    
    // Capture photo reference before async operations
    const camera = cameraRef.current;
    
    try {
      // Take a picture with base64 encoding
      const photo = await camera.takePictureAsync({
        quality: 0.7, // Lower quality for faster upload
        base64: true,
      });

      if (!photo?.base64) {
        throw new Error('Failed to capture photo. Please try again.');
      }

      const base64Image = photo.base64;

      // Call Firebase function to analyze food
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const analyzeFoodImage = httpsCallable(functions, 'analyzeFoodImage');
      
      const result = await analyzeFoodImage({
        image: base64Image,
        mimeType: 'image/jpeg',
      });

      const data = result.data as any;
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Validate response data
      if (!data.name || !data.macros) {
        throw new Error('Invalid response from food analysis. Please try again.');
      }

      // Parse the detected food
      const detectedFood: FoodItem = {
        name: data.name || 'Detected Food',
        measurements: [{
          amount: data.servingAmount || 1,
          unit: data.servingUnit || 'serving',
          macros: {
            calories: data.macros?.calories || 0,
            protein: data.macros?.protein || 0,
            carbs: data.macros?.carbs || 0,
            fat: data.macros?.fat || 0,
          },
        }],
      };
      
      // Close camera modal first and stop detecting
      setIsDetecting(false);
      
      // Use requestAnimationFrame to ensure state updates are processed
      requestAnimationFrame(() => {
        setShowCamera(false);
        
        // Wait for camera modal to fully close before calling onFoodSelect
        // This prevents React Native modal conflicts when rapidly switching modals
        setTimeout(() => {
          try {
            // Call onFoodSelect which will close SearchModal and open LogFoodModal
            onFoodSelect(detectedFood);
          } catch (error) {
            console.error('Error calling onFoodSelect:', error);
            // Show error alert - but don't show if SearchModal is already closed
            setTimeout(() => {
              try {
                Alert.alert(
                  'Error',
                  'Failed to process detected food. Please try selecting it manually.',
                  [{ text: 'OK' }]
                );
              } catch (alertError) {
                console.error('Error showing alert:', alertError);
              }
            }, 100);
          }
        }, 500); // Delay to ensure camera modal is fully closed
      });
    } catch (error: any) {
      console.error('Error analyzing food image:', error);
      setIsDetecting(false);
      
      // Close camera modal if there's an error
      setShowCamera(false);
      
      let errorMessage = 'Failed to analyze food image. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 'permission-denied') {
        errorMessage = 'You do not have access to this feature. Please upgrade your plan or check your subscription.';
      } else if (error.code === 'unauthenticated') {
        errorMessage = 'Please log in to use this feature.';
      }
      
      // Wait a moment for modal to close before showing alert
      setTimeout(() => {
        Alert.alert(
          'Error',
          errorMessage,
          [{ text: 'OK' }]
        );
      }, 300);
    }
  };

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
          <Text style={[styles.modalTitle, { color: colors.text }]}>Search Foods</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput, { color: colors.text, borderColor: colors.icon }]}
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Search foods..."
            placeholderTextColor={'#FFFFFF'}
            autoFocus
          />
          {/* AI Photo Detection Button - HIDDEN for v1.0 to avoid "Coming Soon" in screenshots */}
          {false && (
          <TouchableOpacity
            style={[styles.photoButton, {
              backgroundColor: colors.accent + '15',
              borderColor: colors.accent,
            }]}
            onPress={handlePhotoDetection}
            activeOpacity={0.7}
          >
            <IconSymbol name="camera.fill" size={20} color={colors.accent} />
            <Text style={[styles.photoButtonText, { color: colors.accent }]}>
              Auto-detect
            </Text>
          </TouchableOpacity>
          )}
        </View>
        
        <ScrollView style={styles.searchResults}>
          {filteredFoods.map((food, index) => (
            <TouchableOpacity
              key={`food-${(food as any).id || food.name}-${index}`}
              style={[styles.searchResultItem, { borderBottomColor: colors.icon }]}
              onPress={() => onFoodSelect(food)}
            >
              <Text style={[styles.searchResultName, { color: colors.text }]}>{food.name}</Text>
              <Text style={[styles.searchResultServing, { color: '#FFFFFF' }]}>
                {food.measurements?.[0]?.amount} {food.measurements?.[0]?.unit}
              </Text>
              <Text style={[styles.searchResultMacros, { color: '#FFFFFF' }]}>
                {food.measurements?.[0]?.macros?.calories || 0} cal • {food.measurements?.[0]?.macros?.protein || 0}g P • {food.measurements?.[0]?.macros?.carbs || 0}g C • {food.measurements?.[0]?.macros?.fat || 0}g F
              </Text>
            </TouchableOpacity>
          ))}
          
          {filteredCustomMeals.map((meal) => (
            <TouchableOpacity
              key={`custom-meal-${meal.id}`}
              style={[styles.searchResultItem, { borderBottomColor: colors.icon }]}
              onPress={() => onCustomMealSelect?.(meal)}
            >
              <View style={styles.customMealHeader}>
                <Text style={[styles.searchResultName, { color: colors.text }]}>{meal.name}</Text>
                <View style={[styles.customBadge, { backgroundColor: colors.accent + '20' }]}>
                  <Text style={[styles.customBadgeText, { color: colors.accent }]}>Custom</Text>
                </View>
              </View>
              <Text style={[styles.searchResultServing, { color: '#FFFFFF' }]}>
                {meal.servingSize}
              </Text>
              <Text style={[styles.searchResultMacros, { color: '#FFFFFF' }]}>
                {meal.macrosPerServing.calories} cal • {meal.macrosPerServing.protein}g P • {meal.macrosPerServing.carbs}g C • {meal.macrosPerServing.fat}g F
              </Text>
            </TouchableOpacity>
          ))}
          
          {shouldShowCreatePrompt && (
            <TouchableOpacity
              style={[styles.createCustomButton, { borderColor: colors.accent, backgroundColor: colors.accent + '20' }]}
              onPress={onCreateCustomMeal}
              activeOpacity={0.7}
            >
              <Text style={[styles.createCustomText, { color: colors.accent }]}>
                Can't find a meal? Create one!
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Camera Modal for Photo Detection */}
        <Modal
          visible={showCamera}
          animationType="slide"
          transparent={false}
        >
          <View style={styles.cameraContainer}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                style={styles.cameraCloseButton}
                onPress={() => {
                  setShowCamera(false);
                  setIsDetecting(false);
                }}
              >
                <Text style={styles.cameraCloseText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.cameraTitle}>Detect Food from Photo</Text>
              <View style={styles.cameraHeaderSpacer} />
            </View>
            
            {isDetecting ? (
              <View style={styles.detectingContainer}>
                <AILoadingIndicator message="Analyzing food..." size="large" />
              </View>
            ) : (
              <>
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  facing="back"
                />
                <View style={styles.cameraControls}>
                  <TouchableOpacity
                    style={[styles.captureButton, { backgroundColor: colors.accent }]}
                    onPress={handleCapture}
                    activeOpacity={0.8}
                    disabled={isDetecting}
                  >
                    <View style={styles.captureButtonInner} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </Modal>
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
  searchContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    gap: Spacing.xs,
  },
  photoButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  cameraCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cameraCloseText: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  cameraTitle: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  cameraHeaderSpacer: {
    width: 60,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    paddingVertical: 32,
    alignItems: 'center',
    backgroundColor: BrandColors.background,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: BrandColors.background,
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BrandColors.background,
  },
  detectingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.background,
  },
  searchResults: {
    flex: 1,
  },
  searchResultItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  searchResultServing: {
    fontSize: 14,
    marginBottom: 2,
  },
  searchResultMacros: {
    fontSize: 12,
  },
  customMealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  customBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  customBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Typography.fontFamily,
  },
  createCustomButton: {
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  createCustomText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
});

