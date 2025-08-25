# Location Setup Instructions

The app now includes location functionality but requires the expo-location package to be installed.

## Installation

Run the following command in the project root:

```bash
npx expo install expo-location
```

## What This Enables

1. **Real GPS Location**: Shows actual user location instead of "Campus"
2. **Auto-fill Addresses**: Automatically fills delivery addresses in checkout
3. **Location-based Services**: Can calculate distances to stores
4. **Permission Handling**: Properly requests location permissions

## Features Added

### HomeScreen
- Clickable location button in header
- Shows actual city/location name
- Refreshes location when tapped

### CheckoutScreen  
- "Use Current Location" button for delivery addresses
- Auto-fills city based on GPS location
- Saves GPS coordinates with orders

### LocationService
- GPS coordinate retrieval
- Address reverse geocoding
- Permission management
- Distance calculations

## After Installation

1. Install the package: `npx expo install expo-location`
2. Restart the development server: `npx expo start`
3. Test location features in the app

## Permissions

The app will request location permissions when:
- User taps location button in HomeScreen
- User taps "Use Current Location" in checkout
- App loads (for better UX)

Users can deny permissions and the app will still work with manual address entry.