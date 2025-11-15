import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { BrandColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { useCommunityStore } from '@/stores/communityStore';
import { UnlockModal } from '@/components/UnlockModal';

export default function JoinGymScreen() {
  const colorScheme = useColorScheme();
  const colors = BrandColors;
  const { joinCommunity, generateMockGyms, getAvailableSlots } = useCommunityStore();
  
  const [city, setCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [gyms, setGyms] = useState<any[]>([]);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  
  useEffect(() => {
    // Mock location permission request
    requestLocationPermission();
  }, []);
  
  const requestLocationPermission = async () => {
    // In a real app, this would request location permission
    // For now, we'll show a fallback input
    Alert.alert(
      'Location Permission',
      'We need your location to find nearby gyms. If you prefer, you can type your city manually.',
      [
        { text: 'Allow Location', onPress: () => setCity('Current Location') },
        { text: 'Type City', onPress: () => setCity('') },
      ]
    );
  };
  
  const searchGyms = () => {
    if (!city.trim()) {
      Alert.alert('Enter City', 'Please enter a city to search for gyms.');
      return;
    }
    
    const mockGyms = generateMockGyms(city.trim());
    setGyms(mockGyms);
  };
  
  const handleJoinGym = (gym: any) => {
    const availableSlots = getAvailableSlots();
    
    if (availableSlots <= 0) {
      setShowUnlockModal(true);
      return;
    }
    
    const success = joinCommunity({
      name: gym.name,
      type: 'gym',
      membersCount: gym.membersCount,
      location: { city, gymName: gym.name },
    });
    
    if (success) {
      Alert.alert(
        'Welcome to Your Gym! 🏋️‍♂️',
        `You've successfully joined ${gym.name}! You can now participate in challenges, view the leaderboard, and connect with fellow gym members.`,
        [
          {
            text: 'Let\'s Go!',
            onPress: () => {
              router.push('/(tabs)/community');
            },
          },
        ]
      );
    } else {
      Alert.alert('Error', 'Unable to join this gym. You may already be in a gym community.');
    }
  };
  
  const filteredGyms = gyms.filter(gym =>
    gym.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
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
          Find Your Gym
        </Text>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.searchSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Enter Your City
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.icon + '20', color: colors.text }]}
              placeholder="Enter city name..."
              placeholderTextColor={colors.icon}
              value={city}
              onChangeText={setCity}
              onSubmitEditing={searchGyms}
            />
            <TouchableOpacity
              style={[styles.searchButton, { backgroundColor: colors.tint }]}
              onPress={searchGyms}
            >
              <IconSymbol name="magnifyingglass" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        
        {gyms.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Nearby Gyms
            </Text>
            
            <View style={styles.searchBar}>
              <TextInput
                style={[styles.searchInput, { backgroundColor: colors.background, borderColor: colors.icon + '20', color: colors.text }]}
                placeholder="Search gyms..."
                placeholderTextColor={colors.icon}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <IconSymbol name="magnifyingglass" size={16} color={colors.icon} />
            </View>
            
            <View style={styles.gymList}>
              {filteredGyms.map((gym) => (
                <TouchableOpacity
                  key={gym.id}
                  style={[styles.gymCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}
                  onPress={() => handleJoinGym(gym)}
                >
                  <View style={styles.gymHeader}>
                    <IconSymbol name="building.2.fill" size={24} color={colors.tint} />
                    <View style={styles.gymInfo}>
                      <Text style={[styles.gymName, { color: colors.text }]}>
                        {gym.name}
                      </Text>
                      <Text style={[styles.gymLocation, { color: colors.icon }]}>
                        {city} • {gym.membersCount} members
                      </Text>
                    </View>
                    <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        
        {gyms.length === 0 && city && (
          <View style={styles.emptyState}>
            <IconSymbol name="building.2" size={48} color={colors.icon} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No gyms found
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.icon }]}>
              Try searching in a different city or check back later for new gyms.
            </Text>
          </View>
        )}
      </ScrollView>
      
      <UnlockModal
        visible={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        featureKey="community_slot_2"
        onUnlocked={() => {
          // Slot unlocked, user can join another community
        }}
      />
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
  searchSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'ui-rounded',
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsSection: {
    marginBottom: 32,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontFamily: 'ui-rounded',
  },
  gymList: {
    gap: 12,
  },
  gymCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  gymHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gymInfo: {
    flex: 1,
    marginLeft: 12,
  },
  gymName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 4,
  },
  gymLocation: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
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
  },
});
