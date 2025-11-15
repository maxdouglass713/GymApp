import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { BrandColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { useCommunityStore } from '@/stores/communityStore';

export default function SwitchCommunityScreen() {
  const colorScheme = useColorScheme();
  const colors = BrandColors;
  const { communities, activeCommunityId, switchActiveCommunity } = useCommunityStore();
  
  const activeCommunity = communities.find(c => c.id === activeCommunityId);
  const otherCommunities = communities.filter(c => c.id !== activeCommunityId);
  
  const getCommunityTypeIcon = (type: string) => {
    switch (type) {
      case 'gym': return 'building.2.fill';
      case 'friends': return 'person.2.fill';
      case 'work': return 'briefcase.fill';
      default: return 'person.3.fill';
    }
  };
  
  const getCommunityTypeColor = (type: string) => {
    switch (type) {
      case 'gym': return BrandColors.accent;
      case 'friends': return '#22c55e';
      case 'work': return '#3b82f6';
      default: return colors.icon;
    }
  };
  
  const handleSwitchCommunity = (community: any) => {
    switchActiveCommunity(community.id);
    Alert.alert(
      'Switched Community',
      `You're now viewing ${community.name}`,
      [
        {
          text: 'OK',
          onPress: () => {
            router.push('/(tabs)/community');
          },
        },
      ]
    );
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.icon + '20' }]}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={20} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.title, { color: colors.text }]}>
          Switch Community
        </Text>
      </View>
      
      <View style={styles.content}>
        {activeCommunity && (
          <View style={styles.currentSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Current Community
            </Text>
            
            <View style={[styles.currentCommunityCard, { backgroundColor: colors.tint + '20', borderColor: colors.tint }]}>
              <View style={styles.communityHeader}>
                <IconSymbol
                  name={getCommunityTypeIcon(activeCommunity.type)}
                  size={24}
                  color={colors.tint}
                />
                <View style={styles.communityInfo}>
                  <Text style={[styles.communityName, { color: colors.text }]}>
                    {activeCommunity.name}
                  </Text>
                  <Text style={[styles.communityType, { color: colors.icon }]}>
                    {activeCommunity.type ? activeCommunity.type.charAt(0).toUpperCase() + activeCommunity.type.slice(1) : 'Community'} • {activeCommunity.membersCount} members
                  </Text>
                </View>
                <View style={[styles.activeBadge, { backgroundColor: colors.tint }]}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              </View>
            </View>
          </View>
        )}
        
        {otherCommunities.length > 0 ? (
          <View style={styles.otherSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Other Communities
            </Text>
            
            <View style={styles.communityList}>
              {otherCommunities.map((community) => (
                <TouchableOpacity
                  key={community.id}
                  style={[styles.communityCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}
                  onPress={() => handleSwitchCommunity(community)}
                >
                  <View style={styles.communityHeader}>
                    <IconSymbol
                      name={getCommunityTypeIcon(community.type)}
                      size={24}
                      color={getCommunityTypeColor(community.type)}
                    />
                    <View style={styles.communityInfo}>
                      <Text style={[styles.communityName, { color: colors.text }]}>
                        {community.name}
                      </Text>
                      <Text style={[styles.communityType, { color: colors.icon }]}>
                        {community.type ? community.type.charAt(0).toUpperCase() + community.type.slice(1) : 'Community'} • {community.membersCount} members
                      </Text>
                    </View>
                    <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <IconSymbol name="person.3" size={48} color={colors.icon} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Other Communities
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.icon }]}>
              You're only in one community. Join more communities to switch between them.
            </Text>
            
            <TouchableOpacity
              style={[styles.joinMoreButton, { backgroundColor: colors.tint }]}
              onPress={() => router.push('/community/select-type')}
            >
              <Text style={styles.joinMoreButtonText}>Join More Communities</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'ui-rounded',
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  currentSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 16,
  },
  currentCommunityCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
  },
  communityCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  communityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  communityName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 4,
  },
  communityType: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  otherSection: {
    flex: 1,
  },
  communityList: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  joinMoreButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinMoreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
});
