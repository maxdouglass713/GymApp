import { BrandColors } from '@/constants/theme';

/**
 * Generate a 6-character invite code
 */
export const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Format time relative to now
 */
export const formatTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));
  
  if (hours > 24) {
    return date.toLocaleDateString();
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else {
    return `${minutes}m ago`;
  }
};

/**
 * Get community type icon name
 */
export const getCommunityTypeIcon = (type: string): string => {
  switch (type) {
    case 'gym': return 'building.2.fill';
    case 'friends': return 'person.2.fill';
    case 'work': return 'briefcase.fill';
    case 'sports': return 'sportscourt.fill';
    default: return 'person.3.fill';
  }
};

/**
 * Get community type color
 */
export const getCommunityTypeColor = (type: string): string => {
  switch (type) {
    case 'gym': return BrandColors.accent;
    case 'friends': return BrandColors.success;
    case 'work': return BrandColors.info;
    case 'sports': return '#f59e0b';
    default: return BrandColors.textSecondary;
  }
};

