# App Store Connect Setup Guide 🚀

Your build has been submitted! Now complete your app listing and submit for review.

---

## 📱 STEP 1: Go to App Store Connect

1. Go to: https://appstoreconnect.apple.com/
2. Click **"My Apps"**
3. Find **"KINETIC FLOW AI"** (or create it if it doesn't exist)
4. Click on your app

---

## 🎯 STEP 2: Complete Required Information

### A. App Information Tab

**Required Fields:**
- [ ] **Name**: KINETIC FLOW AI
- [ ] **Subtitle**: (Optional - short tagline)
- [ ] **Category**: 
  - Primary: **Health & Fitness**
  - Secondary: (Optional)
- [ ] **Privacy Policy URL**: **REQUIRED!** ⚠️
  - See section below for hosting options
- [ ] **Support URL**: (Optional but recommended)
  - Can use your email or a support page

---

### B. Pricing and Availability

- [ ] **Price**: Free (or set your price)
- [ ] **Availability**: Select countries (or "All countries")
- [ ] **Pre-Order**: Disable (unless launching as pre-order)

---

### C. App Privacy Tab

**Required for App Review:**
- [ ] Complete privacy questionnaire
- [ ] Answer questions about data collection
- [ ] Common answers for fitness apps:
  - **Health & Fitness Data**: Yes (workout logs, nutrition)
  - **User ID**: Yes (account info)
  - **Analytics**: Yes (app usage)
  - **Advertising**: No (unless you show ads)

---

## 📸 STEP 3: Upload Screenshots (REQUIRED!)

**You MUST have at least 3-5 screenshots for each device size.**

### Screenshot Requirements:
- **iPhone 6.7" Display** (iPhone 14 Pro Max, 15 Pro Max)
  - Size: 1290 x 2796 pixels
  - Need: 3-10 screenshots
  
- **iPhone 6.5" Display** (iPhone XS Max, 11 Pro Max)
  - Size: 1242 x 2688 pixels
  - Need: 3-10 screenshots

- **iPhone 5.5" Display** (iPhone 8 Plus)
  - Size: 1242 x 2208 pixels
  - Need: 3-10 screenshots

**What to Screenshot:**
1. Home screen / Dashboard
2. Workout logging screen
3. Nutrition logging screen
4. Progress tracking screen
5. Onboarding (optional)

**How to Take Screenshots:**
- **Option 1**: Use iOS Simulator (if you have Mac)
- **Option 2**: Use a real iPhone (Command + S on Mac, or screenshot gesture)
- **Option 3**: Use tools like [fastlane frameit](https://docs.fastlane.tools/actions/frameit/) for device frames

---

## ✍️ STEP 4: Write App Description

**App Description** (Up to 4,000 characters):

### Example Structure:
```
KINETIC FLOW AI - Your AI-Powered Fitness Companion

Transform your fitness journey with KINETIC FLOW AI, the ultimate workout and nutrition tracking app powered by artificial intelligence.

KEY FEATURES:

💪 Smart Workout Tracking
- Log your workouts with detailed exercise tracking
- Track sets, reps, and weight for every exercise
- Monitor your progress and personal records

🍎 Nutrition Logging
- Track your meals and macros
- Monitor daily nutrition goals
- Get personalized meal recommendations

🏆 Gamified Experience
- Earn points (GP) for logging workouts and meals
- Unlock advanced features as you progress
- Build streaks and achieve fitness goals

📊 Progress Tracking
- View your workout history
- Track personal records and improvements
- Visualize your fitness journey

🤖 AI-Powered Plans
- Get personalized workout plans
- Receive customized nutrition guidance
- AI coach to help you reach your goals

Whether you're a beginner or experienced athlete, KINETIC FLOW AI helps you stay motivated, track your progress, and achieve your fitness goals.

Download now and start your fitness journey!
```

**Keywords** (100 characters max):
```
fitness, workout, gym, training, exercise, nutrition, macros, health, ai, coach
```

---

## 🔐 STEP 5: Host Your Privacy Policy (REQUIRED!)

**You MUST have a publicly accessible privacy policy URL.**

### Option A: Firebase Hosting (Recommended)

1. **Update PRIVACY_POLICY.md** with your email:
   ```markdown
   [YOUR_EMAIL] → max.douglass713@gmail.com
   [DATE] → November 24, 2025
   ```

2. **Deploy to Firebase Hosting:**
   ```bash
   # Create hosting directory
   mkdir hosting
   cp PRIVACY_POLICY.md hosting/index.html
   
   # Convert markdown to HTML (or create simple HTML page)
   # Then deploy:
   firebase deploy --only hosting
   ```

3. **Your URL will be:** `https://[your-project-id].web.app/privacy-policy`

### Option B: GitHub Pages (Free & Easy)

1. **Create a new repository** (e.g., `kinetic-flow-ai-privacy`)
2. **Upload PRIVACY_POLICY.md** as `index.html` (convert to HTML)
3. **Enable GitHub Pages** in repository settings
4. **Your URL will be:** `https://[username].github.io/kinetic-flow-ai-privacy/`

### Option C: Simple HTML Page (Any Host)

Create a simple HTML page with your privacy policy and host it anywhere (your website, Netlify, Vercel, etc.)

---

## 📋 STEP 6: Version Information

When you're ready to submit:

1. Click **"+ Version or Platform"** (create new version 1.0)
2. Select your uploaded build (should show "Processing" or "Ready to Submit")
3. Fill in:
   - **What's New in This Version**: 
     ```
     Initial release of KINETIC FLOW AI!
     
     - Workout tracking and logging
     - Nutrition tracking and meal logging
     - Progress tracking and personal records
     - Gamified points system
     - AI-powered workout and nutrition plans
     ```
   - **Review Information**:
     - **Contact Information**: Your name, phone, email
     - **Demo Account**: (Optional - create test account if needed)
     - **Notes**: (Optional - any special instructions for reviewers)

---

## ✅ STEP 7: Submit for Review

1. **Complete all required fields** (marked with *)
2. **Ensure build is "Ready to Submit"** (not processing)
3. **Click "Submit for Review"** button
4. **Answer Export Compliance** questions:
   - Usually: "No" to encryption questions (unless you use custom encryption)
5. **Submit!**

---

## ⏱️ What Happens Next?

1. **Processing**: Build processes (usually 10-30 minutes)
2. **Waiting for Review**: In queue for Apple review (1-7 days)
3. **In Review**: Apple is reviewing your app (1-3 days)
4. **Pending Developer Release**: Approved! (you can release manually)
5. **Ready for Sale**: Live in App Store! 🎉

**Timeline**: Typically 1-2 weeks from submission to approval

---

## 🚨 Common Issues & Fixes

### "Missing Privacy Policy URL"
- **Fix**: Add a publicly accessible URL in App Information → Privacy Policy URL

### "Build Not Showing"
- **Fix**: Wait 10-30 minutes for processing. Refresh the page.

### "Missing Screenshots"
- **Fix**: Upload at least 3 screenshots for required device sizes (6.7", 6.5", 5.5")

### "Incomplete App Privacy"
- **Fix**: Go to App Privacy tab and complete all required questions

### "Missing Age Rating"
- **Fix**: Complete age rating questionnaire (usually 4+ for fitness apps)

---

## 🎯 Quick Checklist

Before submitting, verify:
- [ ] Privacy policy URL is publicly accessible
- [ ] Screenshots uploaded (at least 3 for each required size)
- [ ] App description written
- [ ] Keywords added
- [ ] Age rating completed
- [ ] App privacy questionnaire completed
- [ ] Build is "Ready to Submit" (not processing)
- [ ] Contact information filled in
- [ ] "What's New" release notes written

---

## 💡 Pro Tips

1. **TestFlight First** (Optional but Recommended):
   - Submit as TestFlight beta first
   - Invite testers to find bugs
   - Then submit for App Store review

2. **First Screenshot is Most Important**:
   - This is the featured image
   - Make it eye-catching and clear

3. **Description SEO**:
   - Include keywords users might search
   - Front-load important features
   - Keep it scannable (use bullet points)

4. **Screenshot Tips**:
   - Show real content (not placeholders)
   - Use device frames for professional look
   - Show your best features first

---

## 📞 Need Help?

- **Apple Support**: https://developer.apple.com/contact/
- **Expo Docs**: https://docs.expo.dev/submit/ios/
- **App Store Connect Help**: https://help.apple.com/app-store-connect/

---

**You're almost there! Complete these steps and you'll be in the App Store! 🚀**

