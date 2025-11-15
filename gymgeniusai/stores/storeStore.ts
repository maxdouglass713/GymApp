import { create } from 'zustand';

export interface VPack {
  sku: string;
  name: string;
  gpAmount: number;
  price: number;
  currency: string;
  bonus?: string;
  tag?: 'popular' | 'best_value';
}

export interface AdReward {
  id: string;
  type: 'rewarded_ad';
  amount: number;
  createdAt: Date;
}

export interface StoreStore {
  // Daily ad tracking
  dailyAdRewards: AdReward[];
  dailyAdCap: number; // 60 V = 3 ads × 20 V
  
  // Actions
  addAdReward: (amount: number) => boolean;
  getDailyAdEarned: () => number;
  canWatchAd: () => boolean;
  resetDailyAdRewards: () => void;
  
  // Purchase simulation
  simulatePurchase: (sku: string) => Promise<{ success: boolean; error?: string }>;
}

// V Pack catalog
export const V_PACKS: VPack[] = [
  { sku: 'gp_500', name: '500 V', gpAmount: 500, price: 0.99, currency: 'USD' },
  { sku: 'gp_1200', name: '1,200 V', gpAmount: 1200, price: 1.99, currency: 'USD' },
  { sku: 'gp_3200', name: '3,200 V', gpAmount: 3200, price: 4.99, currency: 'USD' },
  { sku: 'gp_7000', name: '7,000 V', gpAmount: 7000, price: 9.99, currency: 'USD', tag: 'popular' },
  { sku: 'gp_15000', name: '15,000 V', gpAmount: 15000, price: 19.99, currency: 'USD' },
  { sku: 'gp_40000', name: '40,000 V', gpAmount: 40000, price: 49.99, currency: 'USD' },
  { sku: 'gp_85000', name: '85,000 V', gpAmount: 85000, price: 99.99, currency: 'USD', tag: 'best_value' },
];

export const useStoreStore = create<StoreStore>((set, get) => ({
  dailyAdRewards: [],
  dailyAdCap: 60, // 3 ads × 20 V
  
  addAdReward: (amount) => {
    const { dailyAdRewards, dailyAdCap, getDailyAdEarned } = get();
    
    if (getDailyAdEarned() + amount > dailyAdCap) {
      return false;
    }
    
    const newReward: AdReward = {
      id: Date.now().toString(),
      type: 'rewarded_ad',
      amount,
      createdAt: new Date(),
    };
    
    set((state) => ({
      dailyAdRewards: [...state.dailyAdRewards, newReward],
    }));
    
    return true;
  },
  
  getDailyAdEarned: () => {
    const { dailyAdRewards } = get();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return dailyAdRewards
      .filter(reward => reward.createdAt >= today)
      .reduce((sum, reward) => sum + reward.amount, 0);
  },
  
  canWatchAd: () => {
    const { getDailyAdEarned, dailyAdCap } = get();
    return getDailyAdEarned() < dailyAdCap;
  },
  
  resetDailyAdRewards: () => {
    set({ dailyAdRewards: [] });
  },
  
  simulatePurchase: async (sku) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate 10% failure rate for testing
    if (Math.random() < 0.1) {
      return { success: false, error: 'Purchase failed. Please try again.' };
    }
    
    return { success: true };
  },
}));

