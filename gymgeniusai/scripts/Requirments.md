KINETIC FLOW AI - Requirements Document
1. Project Overview
Objective: Build an iOS-first AI-powered fitness application that helps users plan, log, and track workouts and nutrition, with a gamified points system to unlock advanced features.
Tech Stack:
•	Frontend: Expo React Native (black/red theme)
•	State Management: Zustand (in-memory, scalable to backend later)
•	Backend: Firebase (Auth, Firestore, Storage, Functions) or Supabase (alternative)
•	Payments: RevenueCat (IAP + Subscriptions)
•	AI Services: OpenAI API (chat coach, plan generation), Vision/OCR API for photo→macros, MediaPipe/TFLite for form feedback
Key Differentiators:
•	Gamified Points System: Earn points from logging workouts, cardio, and meals → unlock features or buy points.
•	AI Coach: Personalized advice via chat.
•	Nutrition Planner: Includes photo-to-macros meal logging.
•	Form Feedback Mode: Camera-based rep counting + cues.
•	Community Features: Challenges, leaderboards, streaks, badges.
________________________________________
2. Functional Requirements
2.1 Authentication (Firebase or Supabase)
•	User Signup/Login: Email, Apple Sign-In.
•	Session Management: Persistent login until logout.
•	Logout: Clear session and return to Welcome screen.
•	Error Handling: Show errors for invalid login, etc.
2.2 Workout Management
•	Workout Logging (Free):
o	Add exercises (sets, reps, weight, notes).
o	Finish workout → award +100 GP.
•	Workout Plans (Basic AI, Free):
o	Weekly AI-generated plan.
o	Replace exercise with alternatives.
•	Workout Plans Pro (2,800 GP):
o	Adaptive re-gen, periodization, history-based.
2.3 Nutrition Management
•	Meal Logging (Free): Manual entry of macros or food items.
•	Nutrition Planner + Grocery Lists (1,200 GP): Personalized macros, weekly ideas, grocery lists.
•	Photo→Macros (5,000 GP): Snap meal → AI estimates macros → user confirms.
2.4 Points & Gamification
•	Earn GP:
o	Workout: +100 GP (cap 300/day)
o	Cardio: +50 GP (cap 100/day)
o	Meal Log: +30 GP (cap 90/day)
o	Streak (3 workouts/wk): +200 GP
o	Watch Pro Tip video: +20 GP (cap 40/day)
•	Spend GP: Unlock features (see catalog).
•	Purchase GP Packs: 500 / 1,200 / 3,200 / 7,000 / 15,000.
•	Premium Subscription: Unlock all features instantly.
2.5 Coach & Community
•	AI Chat Coach (4,500 GP): Personalized Q&A for workouts, substitutions, motivation.
•	Community Challenges (3,000 GP): Join/create challenges, leaderboards, badges.
•	Progress & Insights (Free + 2,000 GP Advanced):
o	History, PRs, streaks (free).
o	Muscle-volume trends, fatigue/consistency flags (Advanced).
2.6 Form Feedback (6,000 GP)
•	Camera Mode: Rep counting + form cues (depth, tempo, ROM).
•	Privacy: On-device ML for faster + safer processing.
________________________________________
3. Technical Specifications
3.1 Database (Firestore or Supabase)
•	users: { id, email, points, planTier, streaks, createdAt }
•	point_events: { id, uid, type, amount, createdAt }
•	feature_unlocks: { uid, featureKey, via (‘gp’, ‘purchase’, ‘premium’), createdAt }
•	features_catalog: { featureKey, pointsRequired, iapProductId }
3.2 API Integration
•	OpenAI (AI Chat Coach + Plan Gen):
o	Input: user goals, logs, context.
o	Output: advice, adjusted plans.
•	Vision/OCR (Photo→Macros):
o	Input: food photo.
o	Output: top 1–3 food matches + portion estimates.
•	MediaPipe/TFLite (Form Feedback):
o	Input: camera feed.
o	Output: rep count + form cues.
3.3 Component Architecture
•	WelcomeStack: Splash, Welcome, Onboarding.
•	MainTabs: Home, Workout, Coach, Progress, Store.
•	Shared Components: PointsBar, UnlockModal, ExerciseCard, MealLogger.
________________________________________
4. Non-Functional Requirements
•	Performance: Core screens load <1s.
•	Security: Use Firebase/Supabase auth, secure IAP via RevenueCat.
•	Accessibility: Large text support, color-blind safe progress charts.
•	Error Handling: Toasts for network issues, fallbacks for AI errors.
•	Testing: Unit tests for points system, unlock logic, workout logging.
________________________________________
5. Development Milestones
a) Phase 1: Welcome, Onboarding, Basic Home/Workout Logging (1 week)
b) Phase 2: Points System + Unlock Modal (1 week)
c) Phase 3: AI Plan + Nutrition Logging (2 weeks)
d) Phase 4: IAP Integration (RevenueCat), GP Store, Premium (1 week)
e) Phase 5: Advanced Features (Photo→Macros, Form Feedback, Challenges) (2–3 weeks)
f) Phase 6: Polish, Testing, Beta via TestFlight (1 week)
________________________________________
6. Risk Management
•	Risk: Apple IAP rejection.
o	Mitigation: Follow guidelines, use RevenueCat.
•	Risk: AI API cost overruns.
o	Mitigation: Cache plans, limit free queries.
•	Risk: Inaccurate Photo→Macros.
o	Mitigation: Always require user confirmation.
•	Risk: Camera privacy concerns.
o	Mitigation: On-device ML, clear permissions dialog.
________________________________________
7. Appendix
•	Expo Docs: https://docs.expo.dev
•	Zustand Docs: https://github.com/pmndrs/zustand
•	RevenueCat Docs: https://www.revenuecat.com/docs
•	Firebase Docs: https://firebase.google.com/docs
•	OpenAI API Reference: https://platform.openai.com/docs
•	MediaPipe Docs: https://developers.google.com/mediapipe
