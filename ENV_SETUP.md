# Environment Variable Setup for Google Maps

## Yes! You Can Use Environment Variables

Instead of hardcoding the API key in `Info.plist`, you can use the config plugin approach.

## Solution: Config Plugin (Already Set Up)

I've created a config plugin that reads the API key from your `.env` file:

**File:** `plugins/withGoogleMapsApiKey.js`

This plugin automatically injects the `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` from your environment into the Info.plist during prebuild.

## How to Use It

### Step 1: Remove Hardcoded Key

Open `/Users/tofunmionaeko/Documents/vineme2.0-1/ios/VineMe/Info.plist` in Xcode or text editor:

**Change this:**
```xml
<key>GMSApiKey</key>
<string>AIzaSyAQK0DPyn13NPIjseS37x_wL3-ezcj0_e8</string>
```

**To this:**
```xml
<key>GMSApiKey</key>
<string>$(EXPO_PUBLIC_GOOGLE_MAPS_API_KEY)</string>
```

### Step 2: Build in Xcode

When you build in Xcode:
1. The build system reads your `.env` file
2. Replaces `$(EXPO_PUBLIC_GOOGLE_MAPS_API_KEY)` with the actual value
3. No hardcoded keys in your code!

## Alternative: Use Expo Prebuild (When UTF-8 Issue is Fixed)

Once the CocoaPods UTF-8 issue is resolved:

```bash
# Prebuild will inject the key automatically
npx expo prebuild --clean

# Then build
cd ios && pod install && cd ..
npm run ios:simulator
```

The config plugin in `app.config.ts` will handle it automatically.

## For Now: Two Options

### Option A: Keep Hardcoded (Works Now)
- ✅ Quick and works immediately
- ⚠️ Don't commit to Git
- ⚠️ Remember to update if key changes

### Option B: Use Variable (Better Security)
1. Change Info.plist to use `$(EXPO_PUBLIC_GOOGLE_MAPS_API_KEY)`
2. Your `.env` file has the key
3. Xcode reads it during build
4. ✅ No hardcoded secrets in code

## Recommended Approach

**For local development:**
Use the hardcoded value for now (what you have) - it works!

**Before committing to Git:**
```bash
# Replace hardcoded key with variable
# In Info.plist, change to:
<key>GMSApiKey</key>
<string>$(EXPO_PUBLIC_GOOGLE_MAPS_API_KEY)</string>
```

**For production builds (EAS):**
```bash
# Add secret to EAS
eas secret:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "YOUR_KEY"

# Then build
eas build --profile production --platform ios
```

## Your Current `.env` File

Make sure you have:
```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAQK0DPyn13NPIjseS37x_wL3-ezcj0_e8
```

Then Xcode will use this value when you use the variable approach.

---

**Quick Answer:** The hardcoded approach works fine for now! You can switch to the variable approach anytime by changing `Info.plist` to use `$(EXPO_PUBLIC_GOOGLE_MAPS_API_KEY)` instead of the literal string.

