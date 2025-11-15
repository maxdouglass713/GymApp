import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';

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

interface SearchModalProps {
  visible: boolean;
  searchQuery: string;
  filteredFoods: FoodItem[];
  onClose: () => void;
  onSearchChange: (query: string) => void;
  onFoodSelect: (food: FoodItem) => void;
  colors: typeof BrandColors;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  visible,
  searchQuery,
  filteredFoods,
  onClose,
  onSearchChange,
  onFoodSelect,
  colors,
}) => {
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
        
        <TextInput
          style={[styles.searchInput, { color: colors.text, borderColor: colors.icon }]}
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search foods..."
          placeholderTextColor={'#FFFFFF'}
          autoFocus
        />
        
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
        </ScrollView>
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
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
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
});

