# Firebase Setup Guide for KINETIC FLOW AI

This guide will help you set up Firebase for your KINETIC FLOW AI app.

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: "KINETIC FLOW AI" (or your preferred name)
4. Enable Google Analytics (optional)
5. Choose Analytics account (optional)
6. Click "Create project"

## 2. Add Firebase to Your App

### For React Native (Expo)

1. In Firebase Console, click "Add app" and select the web icon (</>)
2. Register your app with nickname: "KINETIC FLOW AI Web"
3. Copy the Firebase configuration object
4. Replace the placeholder values in `config/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-actual-app-id"
};
```

## 3. Enable Authentication

1. In Firebase Console, go to "Authentication" > "Get started"
2. Go to "Sign-in method" tab
3. Enable "Email/Password" provider
4. Optionally enable "Apple" provider for iOS

## 4. Set Up Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location (choose closest to your users)
5. Click "Done"

### Security Rules (Development)

For development, you can use these permissive rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read/write their own workouts
    match /workouts/{workoutId} {
      allow read, write: if request.auth != null && 
        resource.data.uid == request.auth.uid;
    }
    
    // Users can read/write their own meals
    match /meals/{mealId} {
      allow read, write: if request.auth != null && 
        resource.data.uid == request.auth.uid;
    }
    
    // Users can read/write their own point events
    match /pointEvents/{eventId} {
      allow read, write: if request.auth != null && 
        resource.data.uid == request.auth.uid;
    }
    
    // Users can read/write their own feature unlocks
    match /featureUnlocks/{unlockId} {
      allow read, write: if request.auth != null && 
        resource.data.uid == request.auth.uid;
    }
    
    // Users can read/write their own progress entries
    match /progress/{progressId} {
      allow read, write: if request.auth != null && 
        resource.data.uid == request.auth.uid;
    }
    
    // Users can read/write their own challenge participation
    match /userChallenges/{challengeId} {
      allow read, write: if request.auth != null && 
        resource.data.uid == request.auth.uid;
    }
    
    // Everyone can read feature catalog and community challenges
    match /featureCatalog/{catalogId} {
      allow read: if true;
    }
    
    match /communityChallenges/{challengeId} {
      allow read: if true;
    }
  }
}
```

## 5. Initialize Feature Catalog

Run this script to populate your feature catalog:

```typescript
import { featureService } from './services/firestoreService';

const initializeFeatureCatalog = async () => {
  const features = [
    {
      featureKey: 'workout_plans_pro',
      name: 'Workout Plans Pro',
      description: 'Adaptive workout plans with periodization',
      pointsRequired: 2800,
      isActive: true,
    },
    {
      featureKey: 'nutrition_planner',
      name: 'Nutrition Planner',
      description: 'Personalized macros and meal planning',
      pointsRequired: 1200,
      isActive: true,
    },
    {
      featureKey: 'photo_macros',
      name: 'Photo to Macros',
      description: 'AI-powered meal photo analysis',
      pointsRequired: 5000,
      isActive: true,
    },
    {
      featureKey: 'ai_coach',
      name: 'AI Chat Coach',
      description: 'Personalized fitness advice and motivation',
      pointsRequired: 4500,
      isActive: true,
    },
    {
      featureKey: 'community_challenges',
      name: 'Community Challenges',
      description: 'Join challenges and compete with friends',
      pointsRequired: 3000,
      isActive: true,
    },
    {
      featureKey: 'form_feedback',
      name: 'Form Feedback',
      description: 'Camera-based rep counting and form analysis',
      pointsRequired: 6000,
      isActive: true,
    },
    {
      featureKey: 'advanced_progress',
      name: 'Advanced Progress Insights',
      description: 'Muscle volume trends and fatigue analysis',
      pointsRequired: 2000,
      isActive: true,
    },
  ];

  for (const feature of features) {
    await featureService.createFeature(feature);
  }
};
```

## 6. Environment Variables (Optional)

For better security, you can use environment variables:

1. Install `expo-constants` (already installed)
2. Create `.env` file in your project root:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
```

3. Update `config/firebase.ts`:

```typescript
import Constants from 'expo-constants';

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId,
};
```

## 7. Testing Your Setup

Create a simple test component to verify everything works:

```typescript
import React, { useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import { useFirebaseAuth } from '../hooks/useFirebase';

export const FirebaseTest = () => {
  const { user, loading, signIn, signOut } = useFirebaseAuth();

  const testSignIn = async () => {
    try {
      await signIn('test@example.com', 'password123');
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <View>
      <Text>User: {user ? user.email : 'Not signed in'}</Text>
      {user ? (
        <Button title="Sign Out" onPress={signOut} />
      ) : (
        <Button title="Test Sign In" onPress={testSignIn} />
      )}
    </View>
  );
};
```

## 8. Next Steps

1. Update your existing Zustand stores to sync with Firestore
2. Implement data migration for existing users
3. Add offline support with Firestore offline persistence
4. Set up Firebase Storage for user photos
5. Implement Firebase Functions for server-side logic
6. Add push notifications with Firebase Cloud Messaging

## Troubleshooting

### Common Issues

1. **"Firebase App named '[DEFAULT]' already exists"**
   - Make sure you're only initializing Firebase once
   - Check if you have multiple Firebase config files

2. **"Permission denied" errors**
   - Check your Firestore security rules
   - Ensure user is authenticated before accessing data

3. **"Network request failed"**
   - Check your internet connection
   - Verify Firebase project configuration
   - Make sure Firestore is enabled in your project

### Getting Help

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)

