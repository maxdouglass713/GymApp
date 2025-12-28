import { create } from 'zustand';
import { UserDocument } from '../types/firestore';
import { userService } from '../services/firestoreService';
import { deleteField } from 'firebase/firestore';

export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'elite';

export interface SubscriptionStore {
  tier: SubscriptionTier;
  subscriptionExpiresAt?: Date;
  aiUsage: {
    mealPlans: { count: number; resetDate: Date; lastUsed?: Date };
    macroEstimations: { count: number; resetDate: Date; lastUsed?: Date };
    workoutPlans: { count: number; resetDate: Date; lastUsed?: Date };
  };
  
  // AI Feature Costs (Volts for Basic tier)
  AI_COSTS: {
    mealPlan: number;
    macroEstimation: number;
    workoutPlan: number;
  };
  
  // Pro Tier Limits
  PRO_LIMITS: {
    mealPlans: number;
    macroEstimations: number;
    workoutPlans: number;
  };
  
  // Actions
  setTier: (tier: SubscriptionTier, expiresAt?: Date) => void;
  updateTier: (uid: string, newTier: SubscriptionTier) => Promise<void>;
  setAiUsage: (usage: SubscriptionStore['aiUsage']) => void;
  canUseAI: (feature: 'mealPlan' | 'macroEstimation' | 'workoutPlan') => boolean;
  getRemainingUsage: (feature: 'mealPlan' | 'macroEstimation' | 'workoutPlan') => number;
  getCost: (feature: 'mealPlan' | 'macroEstimation' | 'workoutPlan') => number;
  loadFromUserDoc: (userDoc: UserDocument) => void;
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  tier: 'free',
  subscriptionExpiresAt: undefined,
  aiUsage: {
    mealPlans: { count: 0, resetDate: new Date() },
    macroEstimations: { count: 0, resetDate: new Date() },
    workoutPlans: { count: 0, resetDate: new Date() },
  },
  
  // Basic tier Volt costs (high to make it harder)
  AI_COSTS: {
    mealPlan: 5000,      // 5,000 Volts
    macroEstimation: 2000, // 2,000 Volts
    workoutPlan: 6000,    // 6,000 Volts
  },
  
  // Pro tier monthly limits
  PRO_LIMITS: {
    mealPlans: 10,
    macroEstimations: 50,
    workoutPlans: 10,
  },
  
  setTier: (tier, expiresAt) => set({ tier, subscriptionExpiresAt: expiresAt }),
  
  updateTier: async (uid, newTier) => {
    try {
      // Calculate expiration date for paid tiers (30 days from now)
      const expiresAt = (newTier === 'pro' || newTier === 'elite') 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : undefined;
      
      // Reset AI usage when changing tiers
      const resetUsage = {
        mealPlans: { count: 0, resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        macroEstimations: { count: 0, resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        workoutPlans: { count: 0, resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      };
      
      // Update local state
      set({ 
        tier: newTier, 
        subscriptionExpiresAt: expiresAt,
        aiUsage: resetUsage,
      });
      
      // Save to Firestore
      // Only include subscriptionExpiresAt if it's defined (Firestore doesn't accept undefined)
      const updateData: any = {
        planTier: newTier,
        aiUsage: resetUsage,
      };
      
      if (expiresAt !== undefined) {
        updateData.subscriptionExpiresAt = expiresAt;
      } else {
        // For Basic/Free tiers, delete the subscriptionExpiresAt field if it exists
        updateData.subscriptionExpiresAt = deleteField();
      }
      
      await userService.updateUser(uid, updateData);
      
      console.log(`✅ Subscription tier updated to ${newTier}`);
    } catch (error) {
      console.error('❌ Error updating subscription tier:', error);
      throw error;
    }
  },
  
  setAiUsage: (usage) => set({ aiUsage: usage }),
  
  loadFromUserDoc: (userDoc) => {
    const tier = (userDoc.planTier || 'free') as SubscriptionTier;
    const expiresAt = userDoc.subscriptionExpiresAt?.toDate ? 
      userDoc.subscriptionExpiresAt.toDate() : 
      userDoc.subscriptionExpiresAt;
    
    const aiUsage = userDoc.aiUsage || {
      mealPlans: { count: 0, resetDate: new Date() },
      macroEstimations: { count: 0, resetDate: new Date() },
      workoutPlans: { count: 0, resetDate: new Date() },
    };
    
    // Convert Firestore timestamps to Dates
    const processedUsage = {
      mealPlans: {
        count: aiUsage.mealPlans?.count || 0,
        resetDate: aiUsage.mealPlans?.resetDate?.toDate ? 
          aiUsage.mealPlans.resetDate.toDate() : 
          new Date(aiUsage.mealPlans?.resetDate || new Date()),
        lastUsed: aiUsage.mealPlans?.lastUsed?.toDate ? 
          aiUsage.mealPlans.lastUsed.toDate() : 
          aiUsage.mealPlans?.lastUsed,
      },
      macroEstimations: {
        count: aiUsage.macroEstimations?.count || 0,
        resetDate: aiUsage.macroEstimations?.resetDate?.toDate ? 
          aiUsage.macroEstimations.resetDate.toDate() : 
          new Date(aiUsage.macroEstimations?.resetDate || new Date()),
        lastUsed: aiUsage.macroEstimations?.lastUsed?.toDate ? 
          aiUsage.macroEstimations.lastUsed.toDate() : 
          aiUsage.macroEstimations?.lastUsed,
      },
      workoutPlans: {
        count: aiUsage.workoutPlans?.count || 0,
        resetDate: aiUsage.workoutPlans?.resetDate?.toDate ? 
          aiUsage.workoutPlans.resetDate.toDate() : 
          new Date(aiUsage.workoutPlans?.resetDate || new Date()),
        lastUsed: aiUsage.workoutPlans?.lastUsed?.toDate ? 
          aiUsage.workoutPlans.lastUsed.toDate() : 
          aiUsage.workoutPlans?.lastUsed,
      },
    };
    
    set({ tier, subscriptionExpiresAt: expiresAt, aiUsage: processedUsage });
  },
  
  canUseAI: (feature) => {
    const { tier, aiUsage, AI_COSTS, PRO_LIMITS } = get();
    // Dynamically import to avoid circular dependency
    const pointsStore = require('./pointsStore');
    const totalPoints = pointsStore.usePointsStore?.getState()?.totalPoints || 0;
    
    // AI Macro Estimation is only available for Pro/Elite tiers, not Basic
    if (feature === 'macroEstimation') {
    if (tier === 'elite') return true; // Unlimited
      
      if (tier === 'pro') {
        const usage = aiUsage.macroEstimations;
        const limit = PRO_LIMITS.macroEstimations;
        
        // Check if reset date has passed
        const now = new Date();
        if (usage.resetDate < now) {
          return true; // Will be reset on server
        }
        
        return usage.count < limit;
      }
      
      // Basic and free tiers cannot use AI macro estimation
      return false;
    }
    
    if (tier === 'elite') return true; // Unlimited for other features
    
    if (tier === 'pro') {
      const usage = aiUsage[feature === 'mealPlan' ? 'mealPlans' : 'workoutPlans'];
      const limit = PRO_LIMITS[feature === 'mealPlan' ? 'mealPlans' : 'workoutPlans'];
      
      // Check if reset date has passed
      const now = new Date();
      if (usage.resetDate < now) {
        return true; // Will be reset on server
      }
      
      return usage.count < limit;
    }
    
    if (tier === 'basic') {
      // Check if user has enough Volts (only for meal plans and workout plans, not macro estimation)
      const cost = AI_COSTS[feature];
      return totalPoints >= cost;
    }
    
    return false; // Free tier - no AI access
  },
  
  getRemainingUsage: (feature) => {
    const { tier, aiUsage, AI_COSTS, PRO_LIMITS } = get();
    // Dynamically import to avoid circular dependency
    const pointsStore = require('./pointsStore');
    const totalPoints = pointsStore.usePointsStore?.getState()?.totalPoints || 0;
    
    // AI Macro Estimation is only available for Pro/Elite tiers
    if (feature === 'macroEstimation') {
      if (tier === 'elite') return Infinity;
      
      if (tier === 'pro') {
        const usage = aiUsage.macroEstimations;
        const limit = PRO_LIMITS.macroEstimations;
        
        // Check if reset date has passed
        const now = new Date();
        if (usage.resetDate < now) {
          return limit; // Will be reset
        }
        
        return Math.max(0, limit - usage.count);
      }
      
      // Basic and free tiers don't have access
      return 0;
    }
    
    if (tier === 'elite') return Infinity;
    
    if (tier === 'basic') {
      const cost = AI_COSTS[feature];
      return Math.floor(totalPoints / cost);
    }
    
    if (tier === 'pro') {
      const usage = aiUsage[feature === 'mealPlan' ? 'mealPlans' : 'workoutPlans'];
      const limit = PRO_LIMITS[feature === 'mealPlan' ? 'mealPlans' : 'workoutPlans'];
      
      // Check if reset date has passed
      const now = new Date();
      if (usage.resetDate < now) {
        return limit; // Will be reset
      }
      
      return Math.max(0, limit - usage.count);
    }
    
    return 0;
  },
  
  getCost: (feature) => {
    const { tier, AI_COSTS } = get();
    // AI Macro Estimation is not available for Basic tier
    if (feature === 'macroEstimation') {
      return 0; // Not purchasable with Volts - requires Pro/Elite subscription
    }
    
    if (tier === 'basic') {
      return AI_COSTS[feature];
    }
    return 0; // Pro and Elite don't use Volts
  },
}));

