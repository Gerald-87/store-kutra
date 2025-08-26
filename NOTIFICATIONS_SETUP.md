# KUTRA App - Notifications Setup Guide

## Issue: Expo Notifications Not Working in Expo Go

Starting with Expo SDK 53, push notifications are no longer supported in Expo Go. You'll see this error:

```
ERROR expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go with the release of SDK 53. Use a development build instead of Expo Go.
```

## Solutions

### Option 1: Create a Development Build (Recommended)

1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g @expo/eas-cli
   ```

2. **Login to your Expo account**:
   ```bash
   eas login
   ```

3. **Configure your project** (eas.json is already set up):
   ```bash
   eas build:configure
   ```

4. **Build for development**:
   ```bash
   # For Android
   eas build --platform android --profile development

   # For iOS
   eas build --platform ios --profile development
   ```

5. **Install the development build** on your device and test notifications.

### Option 2: Use Physical Device with Development Build

1. **Create a development build**:
   ```bash
   npx expo run:android --device
   # or
   npx expo run:ios --device
   ```

2. **Install on your physical device** and test.

### Option 3: Continue Development Without Push Notifications

The app has been updated to gracefully handle the absence of push notifications in Expo Go:

- Local notifications are skipped in Expo Go (with console warnings)
- In-app notifications still work through Firestore
- The NotificationService won't crash the app

## Current Status

✅ **Fixed**: App now handles Expo Go gracefully
✅ **Working**: In-app notifications via Firestore
❌ **Limited**: No push notifications in Expo Go
✅ **Solution**: Use development builds for full functionality

## Testing Notifications

### In Expo Go (Limited)
- In-app notifications work
- Push notifications are disabled
- No app crashes

### In Development Build (Full)
- Push notifications work
- Local notifications work
- All notification features available

## Next Steps

1. **For development**: Continue using Expo Go with limited notifications
2. **For testing notifications**: Create a development build
3. **For production**: Use EAS Build for app store deployment

## Need Help?

- [Expo Development Builds Documentation](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)