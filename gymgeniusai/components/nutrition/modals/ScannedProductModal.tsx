import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BrandColors } from '@/constants/theme';
import { ProductData } from '@/services/barcodeService';

interface ScannedProductModalProps {
  visible: boolean;
  product: ProductData | null;
  loading: boolean;
  onClose: () => void;
  onAddToNutrition: (servings: number) => void;
  colors: typeof BrandColors;
}

export const ScannedProductModal: React.FC<ScannedProductModalProps> = ({
  visible,
  product,
  loading,
  onClose,
  onAddToNutrition,
  colors,
}) => {
  const [servingCount, setServingCount] = useState('1');

  const handleAdd = () => {
    const servings = parseFloat(servingCount);
    if (isNaN(servings) || servings <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of servings.');
      return;
    }
    onAddToNutrition(servings);
    setServingCount('1'); // Reset for next time
  };

  const servings = parseFloat(servingCount) || 1;
  const calculatedMacros = product
    ? {
        calories: Math.round(product.macros.calories * servings),
        protein: Math.round(product.macros.protein * servings * 10) / 10,
        carbs: Math.round(product.macros.carbs * servings * 10) / 10,
        fat: Math.round(product.macros.fat * servings * 10) / 10,
      }
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={[styles.loadingText, { color: colors.text }]}>
                Looking up product...
              </Text>
            </View>
          ) : product ? (
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Product Found</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={[styles.closeButtonText, { color: colors.tint }]}>✕</Text>
                </TouchableOpacity>
              </View>

              {product.imageUrl && (
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: product.imageUrl }}
                    style={styles.productImage}
                    resizeMode="contain"
                  />
                </View>
              )}

              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
                {product.brand && (
                  <Text style={[styles.brand, { color: colors.icon }]}>{product.brand}</Text>
                )}

                <View style={styles.macrosSection}>
                  <Text style={[styles.macrosTitle, { color: colors.text }]}>
                    Nutrition per {product.servingSize}
                  </Text>
                  
                  <View style={styles.macrosGrid}>
                    <View style={[styles.macroItem, { backgroundColor: colors.background }]}>
                      <Text style={[styles.macroValue, { color: colors.text }]}>
                        {product.macros.calories}
                      </Text>
                      <Text style={[styles.macroLabel, { color: colors.icon }]}>Calories</Text>
                    </View>
                    
                    <View style={[styles.macroItem, { backgroundColor: colors.background }]}>
                      <Text style={[styles.macroValue, { color: colors.text }]}>
                        {product.macros.protein}g
                      </Text>
                      <Text style={[styles.macroLabel, { color: colors.icon }]}>Protein</Text>
                    </View>
                    
                    <View style={[styles.macroItem, { backgroundColor: colors.background }]}>
                      <Text style={[styles.macroValue, { color: colors.text }]}>
                        {product.macros.carbs}g
                      </Text>
                      <Text style={[styles.macroLabel, { color: colors.icon }]}>Carbs</Text>
                    </View>
                    
                    <View style={[styles.macroItem, { backgroundColor: colors.background }]}>
                      <Text style={[styles.macroValue, { color: colors.text }]}>
                        {product.macros.fat}g
                      </Text>
                      <Text style={[styles.macroLabel, { color: colors.icon }]}>Fat</Text>
                    </View>
                  </View>
                </View>

                {calculatedMacros && parseFloat(servingCount) !== 1 && (
                  <View style={styles.totalMacrosSection}>
                    <Text style={[styles.totalMacrosTitle, { color: colors.text }]}>
                      Total ({servingCount} {parseFloat(servingCount) === 1 ? 'serving' : 'servings'})
                    </Text>
                    <View style={styles.totalMacrosRow}>
                      <Text style={[styles.totalMacroText, { color: colors.text }]}>
                        {calculatedMacros.calories} cal
                      </Text>
                      <Text style={[styles.totalMacroText, { color: colors.text }]}>
                        {calculatedMacros.protein}g protein
                      </Text>
                      <Text style={[styles.totalMacroText, { color: colors.text }]}>
                        {calculatedMacros.carbs}g carbs
                      </Text>
                      <Text style={[styles.totalMacroText, { color: colors.text }]}>
                        {calculatedMacros.fat}g fat
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.servingInputSection}>
                  <Text style={[styles.servingLabel, { color: colors.text }]}>Servings</Text>
                  <TextInput
                    style={[styles.servingInput, { 
                      backgroundColor: colors.background, 
                      color: colors.text,
                      borderColor: colors.icon 
                    }]}
                    value={servingCount}
                    onChangeText={setServingCount}
                    keyboardType="decimal-pad"
                    placeholder="1"
                    placeholderTextColor={colors.icon}
                  />
                  <Text style={[styles.servingUnit, { color: colors.icon }]}>
                    × {product.servingSize}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.tint }]}
                  onPress={handleAdd}
                >
                  <Text style={styles.addButtonText}>Add to Nutrition</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorTitle, { color: colors.text }]}>
                Product Not Found
              </Text>
              <Text style={[styles.errorText, { color: colors.icon }]}>
                We couldn't find this product in our database. Please try scanning again or add it manually.
              </Text>
              <TouchableOpacity
                style={[styles.closeButton2, { backgroundColor: colors.tint }]}
                onPress={onClose}
              >
                <Text style={styles.closeButton2Text}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  imageContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  productImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  productInfo: {
    padding: 20,
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  brand: {
    fontSize: 16,
    marginBottom: 20,
  },
  macrosSection: {
    marginBottom: 24,
  },
  macrosTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  macrosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  macroItem: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 14,
  },
  totalMacrosSection: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  totalMacrosTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  totalMacrosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  totalMacroText: {
    fontSize: 14,
  },
  servingInputSection: {
    marginBottom: 24,
  },
  servingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  servingInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  servingUnit: {
    fontSize: 14,
  },
  addButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  closeButton2: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  closeButton2Text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

