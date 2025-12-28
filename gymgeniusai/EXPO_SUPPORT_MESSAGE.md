# Message for Expo Support

---

**Subject: EAS Build Failing - EACCES Permission Denied Creating node_modules Directory**

**Message:**

Hi Expo Support Team,

I'm experiencing a persistent build failure with EAS Build that appears to be a server-side permissions issue. All of my builds are failing at the "Install dependencies" step with the same error.

**Error Details:**
```
EACCES: permission denied, mkdir '/Users/expo/workingdir/build/gymgeniusai/node_modules'
yarn install --frozen-lockfile exited with non-zero code: 1
```

**Project Information:**
- **Account:** @maxduggy713
- **Project:** kinetic-flow-ai
- **Project ID:** 7c0c75b6-ee70-4fc9-b87a-b27748e4046c
- **Platform:** iOS
- **SDK Version:** 54.0.0
- **Build Profiles Tried:** development, production (both fail with same error)

**What I've Already Tried:**
- ✅ Cleared build cache (`--clear-cache`)
- ✅ Retried builds multiple times (consistent failure)
- ✅ Tried both development and production profiles
- ✅ Verified `yarn.lock` file exists and is valid
- ✅ Verified `package.json` is correct
- ✅ Dependencies install successfully locally
- ✅ Removed conflicting npm configuration
- ✅ Waited and retried (issue persists)

**Build Examples (Recent Failed Builds):**
- Build IDs available in my dashboard: https://expo.dev/accounts/maxduggy713/projects/kinetic-flow-ai/builds

**Additional Context:**
- The error occurs consistently at the "Install dependencies" build phase
- The build never progresses past dependency installation
- This appears to be a server-side permissions issue on EAS build servers
- The project builds successfully locally without any issues

**What I Need:**
Could you please investigate and fix the permissions issue on your build servers? The error suggests that the build process cannot create the `node_modules` directory due to permission restrictions.

Thank you for your assistance!

Best regards,
Max Douglass

