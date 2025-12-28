# Firebase Functions Setup Guide

## Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. Logged into Firebase: `firebase login`
3. Gemini API key from Google AI Studio

## Step 1: Install Dependencies

```bash
cd gymgeniusai/functions
npm install
```

## Step 2: Set Firebase Project

First, set your Firebase project:

```bash
firebase use gym-genius-ai-bd17c
```

Or add it if not already set:

```bash
firebase use --add
# Select: gym-genius-ai-bd17c
```

## Step 3: Set Gemini API Key

Set your Gemini API key in Firebase Functions config:

```bash
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY_HERE"
```

**⚠️ IMPORTANT:** Replace `YOUR_GEMINI_API_KEY_HERE` with your actual API key from Google AI Studio. Never commit your API key to the repository.

## Step 4: Build Functions

```bash
cd gymgeniusai/functions
npm run build
```

## Step 5: Deploy Functions

```bash
# From project root
firebase deploy --only functions
```

Or deploy specific functions:

```bash
firebase deploy --only functions:generateMealPlan
firebase deploy --only functions:estimateMacros
firebase deploy --only functions:generateWorkoutPlan
firebase deploy --only functions:suggestNextExercise
firebase deploy --only functions:generateTeamWorkoutPlans
firebase deploy --only functions:generatePlayerSummary
firebase deploy --only functions:generateWorkoutTips
```

## Step 6: Test Functions

You can test functions locally using the emulator:

```bash
firebase emulators:start --only functions
```

## Available Functions

### User AI Features
- `generateMealPlan` - Generate personalized meal plans
- `estimateMacros` - Estimate macros for custom meals
- `generateWorkoutPlan` - Generate personalized workout plans
- `suggestNextExercise` - AI exercise suggestions based on workout pattern
- `generateWorkoutTips` - Real-time workout tips

### Coach Features
- `generateTeamWorkoutPlans` - Bulk team workout generation
- `generatePlayerSummary` - Player progress summaries

## Subscription Tier Enforcement

All functions automatically enforce subscription tiers:

- **Free**: No AI access
- **Basic**: Volt-based (5,000V meal plans, 2,000V macros, 6,000V workouts)
- **Pro**: Monthly limits (10 meal plans, 50 macros, 10 workouts)
- **Elite**: Unlimited access

## Troubleshooting

### Function not found
- Make sure functions are deployed: `firebase deploy --only functions`
- Check Firebase Console → Functions to verify deployment

### Permission denied errors
- User needs to upgrade subscription tier
- Check user's `planTier` in Firestore

### API key errors
- Verify API key is set: `firebase functions:config:get`
- Re-set if needed: `firebase functions:config:set gemini.api_key="YOUR_KEY"`

### Gemini API 404 errors
- The model name has been fixed from `gemini-1.5-flash-latest` to `gemini-1.5-flash`
- Make sure functions are rebuilt and redeployed after code changes
- Verify the API key is valid and has access to Gemini API
- Check Firebase Functions logs for detailed error messages

## Monitoring

View function logs:
```bash
firebase functions:log
```

View in Firebase Console:
- Go to Firebase Console → Functions → Logs

