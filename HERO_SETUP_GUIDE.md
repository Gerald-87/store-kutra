# KUTRA Hero Section & Store Display Setup Guide

## Overview
Your KUTRA app has been enhanced with a professional eCommerce design featuring:
- **Hero Carousel**: Displays advertisements, events, and promotions with auto-sliding functionality
- **Enhanced Store Display**: Professional store cards with ratings, categories, and delivery information
- **Real Firebase Integration**: Fetches data from actual Firestore collections

## Firebase Collections Setup

### 1. Advertisements Collection
Create a collection named `advertisements` in your Firebase Firestore with documents containing:
```
- title (string): Advertisement headline
- content (string): Advertisement description
- imageUrl (string): URL to advertisement image
- linkUrl (string): Optional URL to redirect when clicked
- displayDurationSeconds (number): How long to display (e.g., 300)
- isActive (boolean): Whether the ad is currently active
- startDate (timestamp): When the ad becomes active
- endDate (timestamp): When the ad expires
- storeId (string): Optional - associated store ID
- storeName (string): Optional - associated store name
- paid (boolean): Whether this is a paid advertisement
- cost (number): Cost of the advertisement
```

### 2. Events Collection
Create a collection named `events` with documents containing:
```
- name (string): Event name
- description (string): Event description
- date (timestamp): Event date
- time (string): Event time (e.g., "10:00 AM - 6:00 PM")
- location (string): Event location
- organizer (string): Who is organizing the event
- contact (string): Contact information
- imageUrl (string): URL to event image
- isFeatured (boolean): Whether to show in hero carousel
- startDate (timestamp): When to start showing the event
- endDate (timestamp): When to stop showing the event
- linkUrl (string): Optional URL for more information
```

### 3. Promotions Collection
Create a collection named `promotions` with documents containing:
```
- title (string): Promotion title
- description (string): Promotion description
- discountCode (string): Discount code (e.g., "STUDENT20")
- discountPercentage (number): Discount percentage (e.g., 20)
- startDate (timestamp): When promotion starts
- endDate (timestamp): When promotion ends
- isActive (boolean): Whether promotion is currently active
- applicableCategory (string): Which category it applies to
- imageUrl (string): URL to promotion image
- linkUrl (string): Optional URL for more details
- cost (number): Cost to run this promotion
- paid (boolean): Whether this promotion is paid
```

### 4. Stores Collection
Create a collection named `stores` with documents containing:
```
- ownerId (string): User ID of store owner
- name (string): Store name
- description (string): Store description
- logoUrl (string): URL to store logo
- campusCoverage (array): Areas the store covers
- categories (array): Store categories
- isActive (boolean): Whether store is currently active
- deliveryFee (number): Delivery fee amount
- averageRating (number): Average customer rating (1-5)
- numberOfRatings (number): Total number of ratings
- operatingHours (string): Store operating hours
- addressLabel (string): Store address/location
```

## How to Add Sample Data

1. **Open Firebase Console**: Go to https://console.firebase.google.com
2. **Select Your Project**: Choose your KUTRA project
3. **Go to Firestore Database**: Click on "Firestore Database" in the left menu
4. **Create Collections**: Create the four collections mentioned above
5. **Add Documents**: Use the sample data from `sample-firebase-data.json` to create documents

### Quick Setup Steps:
1. Copy the JSON data from `sample-firebase-data.json`
2. For each collection (`advertisements`, `events`, `promotions`, `stores`):
   - Click "Start collection" or "Add collection"
   - Enter the collection name
   - Add documents using the sample data
   - Convert date strings to Firestore Timestamps

## Features Implemented

### Hero Carousel
- **Auto-sliding**: Changes slides every 5 seconds
- **Manual Navigation**: Click pagination dots to navigate
- **Touch Support**: Swipe to change slides
- **Type Indicators**: Shows if item is advertisement, event, or promotion
- **External Links**: Tap items to open associated URLs
- **Fallback Display**: Shows KUTRA welcome message when no data available

### Store Display
- **Professional Cards**: Clean, modern design with shadows
- **Star Ratings**: Visual rating display with half-star support
- **Category Tags**: Shows store categories with color coding
- **Delivery Information**: Displays delivery fees and availability
- **Operating Hours**: Shows store operating hours
- **Active Status**: Visual indicator for active stores

### Professional Design Features
- **Consistent Color Scheme**: Indigo (#6366F1) primary color throughout
- **Modern Typography**: Proper font weights and sizes
- **Professional Shadows**: Subtle shadows for depth
- **Responsive Layout**: Works on different screen sizes
- **Loading States**: Proper loading indicators
- **Error Handling**: Graceful error handling for failed requests

## Testing Your Setup

1. **Start the App**: Run `expo start` in your KUTRA directory
2. **Check Firebase Connection**: Ensure your Firebase configuration is correct
3. **Verify Data**: The hero carousel should show your advertisements, events, and promotions
4. **Test Interactions**: Tap on hero items to test external links
5. **Check Stores**: Scroll to see your featured stores with ratings and categories

## Troubleshooting

### No Hero Content Showing
- Check if your Firebase collections exist
- Verify that documents have `isActive: true`
- Ensure date ranges are current (startDate <= now <= endDate)
- Check Firebase security rules allow reading

### Store Display Issues
- Verify `stores` collection exists with sample data
- Check that stores have `isActive: true`
- Ensure images URLs are accessible

### App Crashes
- Check Expo logs for specific error messages
- Verify all required fields are present in Firebase documents
- Ensure Firebase configuration is correct

## Next Steps

1. **Add Real Content**: Replace sample data with your actual content
2. **Custom Styling**: Modify colors and styling to match your brand
3. **Analytics**: Add analytics tracking for hero carousel interactions
4. **Admin Panel**: Consider building an admin interface to manage content
5. **Push Notifications**: Integrate with promotion announcements

Your KUTRA app now has a professional eCommerce interface with dynamic content management through Firebase!