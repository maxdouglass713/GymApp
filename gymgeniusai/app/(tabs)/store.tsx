import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BrandColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePointsStore } from '@/stores/pointsStore';
import { useStoreStore, V_PACKS } from '@/stores/storeStore';
import { useAuth } from '@/components/AuthProvider';
import { checkFeatureOrShowComingSoon } from '@/utils/features/featureFlags';

type StoreScreenProps = {
  hideAdAndRestore?: boolean;
};

export default function StoreScreen({ hideAdAndRestore = false }: StoreScreenProps) {
  const colorScheme = useColorScheme();
  const colors = BrandColors;
  const { user } = useAuth();
  
  const { totalPoints, addPoints } = usePointsStore();
  const { addAdReward, getDailyAdEarned, canWatchAd, simulatePurchase } = useStoreStore();
  
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [isWatchingAd, setIsWatchingAd] = useState(false);

  const handlePurchase = async (pack: any) => {
    // Check feature flag - show "Coming Soon" if IAP is disabled
    if (!checkFeatureOrShowComingSoon('gpPurchasing', 'Purchase GP Packs')) {
      return;
    }
    
    setIsPurchasing(pack.sku);
    
    try {
      const result = await simulatePurchase(pack.sku);
      
      if (result.success && user?.uid) {
        addPoints({
          type: 'purchase',
          amount: pack.gpAmount,
          description: `Purchased ${pack.name}`,
        }, user.uid);
        
        Alert.alert('Purchase Successful!', `Purchased ${pack.name}`);
      } else {
        Alert.alert('Purchase Failed', result.error || 'Purchase was cancelled or failed.');
      }
    } catch (error) {
      Alert.alert('Purchase Error', 'An error occurred during purchase. Please try again.');
    } finally {
      setIsPurchasing(null);
    }
  };

  const handleWatchAd = async () => {
    if (!canWatchAd()) {
      Alert.alert('Daily Limit Reached', 'You have reached your daily ad limit (60 V).');
      return;
    }

    setIsWatchingAd(true);
    
    // Simulate ad loading and watching (5-10 seconds)
    const adDuration = 5000 + Math.random() * 5000;
    
    setTimeout(() => {
      const success = addAdReward(20);
      
      if (success && user?.uid) {
        addPoints({
          type: 'video',
          amount: 20,
          description: 'Watched rewarded ad',
        }, user.uid);
        
        Alert.alert('Thanks for watching!', '+20 V');
      } else {
        Alert.alert('Daily Limit Reached', 'You have reached your daily ad limit.');
      }
      
      setIsWatchingAd(false);
    }, adDuration);
  };

  const handleRestorePurchases = () => {
    Alert.alert('Restore Purchases', 'Restored (simulated)');
  };

  const renderBalanceSection = () => (
    <View style={styles.balanceSection}>
      <View style={styles.balanceHeader}>
        <Text style={[styles.balanceIcon]}>⚡</Text>
        <Text style={[styles.balanceLabel, { color: colors.text }]}>Your Balance</Text>
      </View>
      <Text style={[styles.balanceAmount, { color: '#FFFFFF' }]}>
        {totalPoints.toLocaleString()} V
      </Text>
      <Text style={[styles.purchaseNote, { color: colors.icon }]}>
        Redeem your points for upgrades and perks.
      </Text>
    </View>
  );

  const renderVPacks = () => (
    // HIDDEN for v1.0 - Purchase buttons show "Coming Soon", avoid in screenshots
    <View style={styles.packsSection}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Rewards</Text>
      <Text style={[styles.purchaseNote, { color: colors.icon, textAlign: 'center', marginTop: 8 }]}>
        Redeem your points for upgrades and perks in a future update. For now, keep earning points by logging workouts and meals.
      </Text>
      {/* {V_PACKS.map((pack) => (
          <TouchableOpacity
            key={pack.sku}
            style={[styles.packCard, { backgroundColor: colors.background, borderColor: colors.icon }]}
            onPress={() => handlePurchase(pack.sku)}
            disabled={isPurchasing !== null}
          >
            {pack.tag && (
              <View style={[
                styles.packTag,
                { backgroundColor: pack.tag === 'best_value' ? colors.tint : '#FFD700' }
              ]}>
                <Text style={[
                  styles.packTagText,
                  { color: pack.tag === 'best_value' ? '#000' : '#000' }
                ]}>
                  {pack.tag === 'best_value' ? 'Best Value' : 'Popular'}
                </Text>
              </View>
            )}
            
            <View style={styles.packContent}>
              <Text style={[styles.packName, { color: colors.text }]}>{pack.name}</Text>
              <Text style={[styles.packVAmount, { color: colors.text }]}>
                {pack.gpAmount.toLocaleString()} V
              </Text>
              <TouchableOpacity
                style={[styles.purchaseButton, { backgroundColor: colors.tint }]}
                onPress={() => handlePurchase(pack.sku)}
                disabled={isPurchasing !== null}
              >
                <Text style={[styles.purchaseButtonText, { color: '#FFFFFF' }]}>
                  ${pack.price.toFixed(2)}
                </Text>
              </TouchableOpacity>
            </View>
            
            {isPurchasing === pack.sku && (
              <View style={styles.packLoading}>
                <ActivityIndicator color={colors.tint} size="small" />
              </View>
            )}
          </TouchableOpacity>
      ))} */}
    </View>
  );

  const renderWatchAdSection = () => {
    const dailyEarned = getDailyAdEarned();
    const canWatch = canWatchAd();
    
    return (
      <View style={styles.adSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Earn Free Points</Text>
        
        <TouchableOpacity
          style={[
            styles.adButton,
            { 
              backgroundColor: canWatch ? colors.tint : '#374151',
              opacity: canWatch ? 1 : 0.6
            }
          ]}
          onPress={handleWatchAd}
          disabled={!canWatch || isWatchingAd}
        >
          {isWatchingAd ? (
            <View style={styles.adLoading}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={[styles.adButtonText, { color: '#FFFFFF' }]}>Watching Ad...</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.adButtonText, { color: '#FFFFFF' }]}>
                Watch Ad (+20 V)
              </Text>
              <Text style={[styles.adSubtext, { color: '#FFFFFF' }]}>
                {dailyEarned}/60 V today
              </Text>
            </>
          )}
        </TouchableOpacity>
        
        {!canWatch && (
          <Text style={[styles.adLimitText, { color: colors.icon }]}>
            Daily ad limit reached
          </Text>
        )}
      </View>
    );
  };

  const renderRestoreSection = () => (
    <View style={styles.restoreSection}>
      <TouchableOpacity
        style={styles.restoreButton}
        onPress={handleRestorePurchases}
      >
        <Text style={[styles.restoreText, { color: colors.tint }]}>
          Restore Purchases
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>KINETIC FLOW Volts</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            Earn Volts for your consistency, then redeem them for rewards.
          </Text>
        </View>
        {renderBalanceSection()}
        {renderVPacks()}
        {!hideAdAndRestore && renderWatchAdSection()}
        {!hideAdAndRestore && renderRestoreSection()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  balanceSection: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  purchaseNote: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  packsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  packsGrid: {
    gap: 8,
  },
  packCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    position: 'relative',
    minHeight: 60,
  },
  packTag: {
    position: 'absolute',
    top: -8,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  packTagText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  packContent: {
    flex: 1,
    justifyContent: 'center',
  },
  packName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  packPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  packSubtext: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  packLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  adSection: {
    marginBottom: 16,
  },
  adButton: {
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 4,
  },
  adLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  adSubtext: {
    fontSize: 10,
    opacity: 0.8,
  },
  adLimitText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  restoreSection: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  restoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  restoreText: {
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  // New header styles
  header: {
    paddingTop: 80,
    paddingBottom: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Updated balance section styles
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  balanceLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  // New pack styles
  packVAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  purchaseButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignItems: 'center',
    minHeight: 24,
  },
  purchaseButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

