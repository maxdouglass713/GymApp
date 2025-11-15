import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { BrandColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface FoodItem {
  name: string;
  servingCount: number;
  servingSize: string;
  totalMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface SwipeableFoodItemProps {
  food: FoodItem;
  colors: typeof BrandColors;
  onEdit: (food: FoodItem) => void;
  onDelete: (food: FoodItem) => void;
}

export const SwipeableFoodItem: React.FC<SwipeableFoodItemProps> = ({ food, colors, onEdit, onDelete }) => {
  const renderRightActions = (
    _progress: Animated.AnimatedAddition<number>,
    dragX: Animated.AnimatedAddition<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-120, -40, 0],
      outputRange: [1, 1, 0.9],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.actionContainer, { transform: [{ scale }] }]}> 
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          activeOpacity={0.85}
          onPress={() => onEdit(food)}
        >
          <IconSymbol name="square.and.pencil" size={18} color={BrandColors.gray900} />
          <Text style={styles.actionLabel}>Edit</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderLeftActions = (
    _progress: Animated.AnimatedAddition<number>,
    dragX: Animated.AnimatedAddition<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [0, 40, 120],
      outputRange: [0.9, 1, 1],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.actionContainer, { transform: [{ scale }] }]}> 
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          activeOpacity={0.85}
          onPress={() => onDelete(food)}
        >
          <IconSymbol name="trash" size={18} color="#fff" />
          <Text style={[styles.actionLabel, styles.deleteLabel]}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      rightThreshold={40}
      leftThreshold={40}
    >
      <View style={[styles.foodItem, { borderColor: colors.icon }] }>
        <View style={styles.foodInfo}>
          <Text style={[styles.foodName, { color: colors.text }]}>{food.name}</Text>
          <Text style={[styles.foodServing, { color: '#FFFFFF' }]}>
            {food.servingCount} × {food.servingSize}
          </Text>
          <Text style={[styles.foodMacros, { color: '#FFFFFF' }]}>
            {Math.round(food.totalMacros.calories)} cal • {Math.round(food.totalMacros.protein)}g P • {Math.round(food.totalMacros.carbs)}g C • {Math.round(food.totalMacros.fat)}g F
          </Text>
        </View>
        <TouchableOpacity
          style={styles.removeFoodButton}
          onPress={() => onDelete(food)}
        >
          <Text style={[styles.removeFoodText, { color: colors.tint }]}>×</Text>
        </TouchableOpacity>
      </View>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: BrandColors.gray800,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  foodServing: {
    fontSize: 14,
    marginBottom: 4,
  },
  foodMacros: {
    fontSize: 12,
  },
  removeFoodButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  removeFoodText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  actionContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  editButton: {
    backgroundColor: '#4FD1C5',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  actionLabel: {
    fontWeight: '600',
    fontSize: 14,
    color: BrandColors.gray900,
  },
  deleteLabel: {
    color: '#FFFFFF',
  },
});

