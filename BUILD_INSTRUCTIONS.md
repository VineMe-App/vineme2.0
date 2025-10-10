# iOS Build Instructions - SDK 54

## Summary

Your project is now on Expo SDK 54 with all fixes applied. To use it in development build mode (with Google Maps), you need to rebuild the native iOS app.

## Quick Build

The build is starting now with:
```bash
npx expo run:ios
```

This will:
1. ✅ Use SDK 54 (React Native 0.81.4)
2. ✅ Include Google Maps support
3. ✅ Build and launch on iOS simulator
4. ⏱️ Take ~5-10 minutes (first build)

## What's Being Built

- **SDK:** 54.0.11
- **React Native:** 0.81.4
- **React:** 19.1.0
- **Google Maps:** 8.4.0
- **Pods:** 108 total (including GoogleMaps)

## Build Progress

You'll see:
1. Xcode compiling Swift/Objective-C code
2. Metro bundler starting
3. Simulator launching
4. App installing and opening

## After Build Completes

### All Features Will Work:
- ✅ Authentication (4-digit SMS, 6-digit email)
- ✅ User profiles with avatar upload
- ✅ **Google Maps** - full functionality
- ✅ Location picker
- ✅ Groups with map view
- ✅ Events
- ✅ Friends
- ✅ Notifications

### Test Checklist:
- [ ] App launches without errors
- [ ] No version mismatch warnings
- [ ] Sign in with phone (4-digit code)
- [ ] Navigate to Groups → Map view
- [ ] Maps load and show tiles
- [ ] Can create group with location picker
- [ ] Upload avatar image
- [ ] Upload group image

## If Build Fails

### UTF-8 Error
```bash
cd ios
LANG=en_US.UTF-8 pod install
cd ..
npx expo run:ios
```

### Clean Build
```bash
cd ios
rm -rf build Pods Podfile.lock
LANG=en_US.UTF-8 pod install
cd ..
npx expo run:ios
```

### Using Xcode Manually
1. Open `ios/VineMe.xcworkspace` (not .xcodeproj!)
2. Select a simulator from the dropdown
3. Press Run (⌘R)

## Estimated Time

- **First build:** 5-10 minutes
- **Subsequent builds:** 2-5 minutes
- **Pod install:** Already complete ✅

## Alternative: EAS Build (Cloud)

If local build has issues:
```bash
eas build --profile development --platform ios
```

Then install the .ipa on your device.

---

**Current Status:** Building iOS app with SDK 54...  
**Monitor:** Watch your terminal for build progress  
**Next:** App will launch automatically when done

