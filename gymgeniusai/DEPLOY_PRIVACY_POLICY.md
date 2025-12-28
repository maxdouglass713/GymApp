# Deploy Privacy Policy to Firebase Hosting

Your privacy policy HTML files have been created! Now let's deploy them.

## Quick Deploy Steps

### 1. Make sure Firebase CLI is installed
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase (if not already logged in)
```bash
firebase login
```

### 3. Deploy to Firebase Hosting
```bash
firebase deploy --only hosting
```

### 4. Get Your Privacy Policy URL

After deployment, your privacy policy will be available at:
```
https://[your-firebase-project-id].web.app/privacy-policy.html
```

Or:
```
https://[your-firebase-project-id].firebaseapp.com/privacy-policy.html
```

**Note:** Replace `[your-firebase-project-id]` with your actual Firebase project ID.

---

## What Files Were Created

✅ `dist/privacy-policy.html` - Your privacy policy page
✅ `dist/index.html` - Redirect page
✅ `firebase.json` - Updated with privacy policy route

---

## Next Steps After Deployment

1. Copy your privacy policy URL
2. Go to App Store Connect
3. Add the URL in: **App Information** → **Privacy Policy URL**

---

## Troubleshooting

### "Firebase project not found"
- Make sure you're in the correct Firebase project
- Run `firebase use --add` to select your project

### "Hosting not enabled"
- Go to Firebase Console → Hosting
- Click "Get Started" to enable hosting

### "Permission denied"
- Make sure you're logged in: `firebase login`
- Verify you have access to the Firebase project

---

Need help? Let me know!

