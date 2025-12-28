import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandColors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useUserStore } from '@/stores/userStore';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { eventBus } from '@/lib/eventBus';
import { useWeightStore } from '@/stores/weightStore';
import { getLocalDateKey } from '@/stores/nutritionStore';
import { useAuth } from '@/components/AuthProvider';
// import { AIInfoModal } from '@/components/home/modals/AIInfoModal'; // HIDDEN for v1.0
import { isFeatureEnabled, checkFeatureOrShowComingSoon } from '@/utils/features/featureFlags';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { profile } = useUserStore();
  const { dailyWeights, loadWeightsFromFirebase } = useWeightStore();
  const { user } = useAuth();
  const [showActionModal, setShowActionModal] = useState(false);
  // const [showAIInfoModal, setShowAIInfoModal] = useState(false); // HIDDEN for v1.0
  const [refreshKey, setRefreshKey] = useState(0);
  
  const isCoach = profile?.userType === 'institution' && profile?.institutionRole !== 'player';
  
  // Load weights on mount
  useEffect(() => {
    if (user?.uid && dailyWeights.length === 0) {
      loadWeightsFromFirebase(user.uid).catch((error) => {
        console.error('❌ Error loading weights in CustomTabBar:', error);
      });
    }
  }, [user?.uid]);
  
  // Check if weight has been logged today - include refreshKey to force recalculation
  const hasLoggedWeightToday = React.useMemo(() => {
    if (!dailyWeights || dailyWeights.length === 0) {
      return false;
    }
    const today = new Date();
    const todayKey = getLocalDateKey(today);
    const hasLogged = dailyWeights.some((w) => w.date === todayKey);
    return hasLogged;
  }, [dailyWeights, refreshKey]);
  
  // Listen for weight logged event to force re-check
  useEffect(() => {
    const unsubscribe = eventBus.subscribe('weightLogged', () => {
      // Force re-render by updating state
      setRefreshKey(prev => prev + 1);
    });
    return () => unsubscribe();
  }, []);

  const handleActionPress = (action: string) => {
    setShowActionModal(false);
    
    switch (action) {
      // case 'aiInfo': // HIDDEN for v1.0
      //   setShowAIInfoModal(true);
      //   break;
      case 'barcode':
        if (isFeatureEnabled('barcodeScanner')) {
          router.push('/(tabs)/nutrition');
          // Small delay to ensure navigation completes before emitting event
          setTimeout(() => {
            eventBus.emit('openBarcodeScanner');
          }, 300);
        }
        break;
      case 'snapTrack':
        if (isFeatureEnabled('cameraPhotoMacros')) {
          router.push('/(tabs)/nutrition');
          setTimeout(() => {
            eventBus.emit('openSnapTrack');
          }, 300);
        }
        break;
      case 'searchFood':
        router.push('/(tabs)/nutrition');
        setTimeout(() => {
          eventBus.emit('openFoodSearch');
        }, 300);
        break;
      case 'water':
        router.push('/(tabs)/nutrition');
        setTimeout(() => {
          eventBus.emit('openWaterTracking');
        }, 300);
        break;
      case 'logWeight':
        eventBus.emit('openWeightLog');
        break;
      case 'assignWorkout':
        router.push('/(tabs)/workout');
        break;
      case 'assignMealPlan':
        router.push('/(tabs)/nutrition');
        break;
      case 'teamManagement':
        if (isFeatureEnabled('teamManagement')) {
          router.push('/community/team-management');
        }
        break;
      case 'teamStats':
        if (!checkFeatureOrShowComingSoon('communityChallenges', 'Community Features')) {
          return;
        }
        router.push('/(tabs)/community');
        break;
    }
  };

  // Build action options based on user type
  // Include dailyWeights in dependencies so it updates when weight is logged
  const actionOptions = React.useMemo(() => {
    // HIDDEN for v1.0 App Store submission - AI Features option removed
    const baseOptions: any[] = [
      // { key: 'aiInfo', label: 'AI Features', icon: '✨', action: 'aiInfo' },
    ];

    if (isCoach && isFeatureEnabled('teamManagement')) {
      return [
        ...baseOptions,
        { key: 'assignWorkout', label: 'Assign Workout', icon: '💪', action: 'assignWorkout' },
        { key: 'assignMealPlan', label: 'Assign Meal Plan', icon: '🍎', action: 'assignMealPlan' },
        { key: 'teamManagement', label: 'Team Management', icon: '👥', action: 'teamManagement' },
        { key: 'teamStats', label: 'View Team Stats', icon: '📊', action: 'teamStats' },
      ];
    } else {
      // For non-coaches: show edit weight if logged today, otherwise log weight with alert
      const weightLabel = hasLoggedWeightToday ? 'Edit Weight' : 'Log Daily Morning Weight';
      return [
        ...baseOptions,
        { key: 'logWeight', label: weightLabel, icon: '⚖️', action: 'logWeight', hasAlert: !hasLoggedWeightToday },
        { key: 'water', label: 'Log Water', icon: '💧', action: 'water' },
      ];
    }
  }, [isCoach, hasLoggedWeightToday, refreshKey]);

  return (
    <>
      <View
        style={[
          styles.tabBar,
          {
            paddingBottom: Math.max(insets.bottom, Spacing.sm),
            height: 88 + Math.max(insets.bottom - Spacing.sm, 0),
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const isFocused = state.index === index;

          // Only show these specific tabs
          const visibleTabs = ['index', 'workout', 'nutrition', 'profile'];
          if (!visibleTabs.includes(route.name)) {
            return null;
          }

          // Skip hidden tabs - check if href is explicitly null or if tabBarIcon is missing
          if (options.href === null || !options.tabBarIcon) {
            return null;
          }

          // Insert lightning bolt button between workout and nutrition
          const shouldInsertButton = route.name === 'workout';
          const tabButtons = [];

          const onPress = () => {
            if (process.env.EXPO_OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const TabBarIcon = options.tabBarIcon;
          const TabBarLabel = options.tabBarLabel;

          const tabButton = (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? String(label)}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              {TabBarIcon && TabBarIcon({ focused: isFocused, color: isFocused ? BrandColors.accent : BrandColors.textSecondary, size: 24 })}
              <View style={styles.tabLabel}>
                <Text
                  style={[
                    styles.tabLabelText,
                    { color: isFocused ? BrandColors.accent : BrandColors.textSecondary },
                  ]}
                >
                  {typeof TabBarLabel === 'string' ? TabBarLabel : label}
                </Text>
              </View>
            </TouchableOpacity>
          );

          if (shouldInsertButton) {
            return (
              <React.Fragment key={`fragment-${route.key}`}>
                {tabButton}
                {/* Center Lightning Bolt Button */}
                <TouchableOpacity
                  style={styles.fab}
                  onPress={() => {
                    if (process.env.EXPO_OS === 'ios') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    setShowActionModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.fabInner}>
                    <IconSymbol name="bolt.fill" size={32} color="#00D4FF" />
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            );
          }

          return tabButton;
        })}
      </View>

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowActionModal(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isCoach ? 'Coach Quick Actions' : 'Quick Actions'}
              </Text>
            </View>
            {actionOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.actionOption,
                  (option as any).hasAlert && styles.actionOptionAlert,
                  isCoach && styles.coachActionOption,
                ]}
                onPress={() => handleActionPress(option.action)}
                activeOpacity={0.7}
              >
                <Text style={styles.actionIcon}>{option.icon}</Text>
                <View style={styles.actionLabelContainer}>
                  <Text style={styles.actionLabel}>{option.label}</Text>
                  {(option as any).hasAlert && (
                    <View style={styles.alertBadge}>
                      <Text style={styles.alertBadgeText}>!</Text>
                    </View>
                  )}
                </View>
                {isCoach && (
                  <IconSymbol name="chevron.right" size={16} color={BrandColors.textSecondary} />
                )}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* AI Info Modal - HIDDEN for v1.0 App Store submission */}
      {/* <AIInfoModal
        visible={showAIInfoModal}
        onClose={() => setShowAIInfoModal(false)}
      /> */}
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: BrandColors.background,
    borderTopColor: BrandColors.gray800,
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    position: 'relative',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.sm,
    minHeight: 60,
  },
  tabLabel: {
    marginTop: Spacing.xs,
  },
  tabLabelText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.semibold,
  },
  fab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.sm,
    minHeight: 60,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#001A2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00D4FF',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: BrandColors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: BrandColors.gray800,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
    minWidth: 180,
  },
  coachActionOption: {
    backgroundColor: BrandColors.gray800,
    borderWidth: 1,
    borderColor: BrandColors.accent + '20',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  actionOptionAlert: {
    borderWidth: 2,
    borderColor: '#f59e0b',
    backgroundColor: '#f59e0b' + '10',
  },
  aiActionOption: {
    backgroundColor: BrandColors.accent + '15',
    borderWidth: 2,
    borderColor: BrandColors.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  aiActionIcon: {
    fontSize: 24,
  },
  aiActionLabel: {
    color: BrandColors.accent,
    fontWeight: Typography.fontWeight.bold,
  },
  actionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.xs,
  },
  alertBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  actionLabel: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.semibold,
  },
  modalHeader: {
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.gray800,
  },
  modalTitle: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
  },
});

