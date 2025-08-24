# KUTRA - Campus Marketplace App

KUTRA is a comprehensive React Native eCommerce application designed for campus communities. It enables users to buy, sell, swap, and rent items within their campus ecosystem.

## Features

### 🛒 **Core Commerce**
- **Store Listings**: Browse and search stores by category
- **Product Catalog**: View detailed product information with images
- **Shopping Cart**: Add/remove items with quantity management
- **Checkout Process**: Secure order placement with multiple payment options

### 🔄 **Swap System**
- **Item Trading**: List items for swap with other users
- **Match Engine**: Smart matching for trade opportunities
- **Swap Requests**: Send and receive trade proposals
- **Status Tracking**: Monitor swap request status

### 🏠 **Rental Platform**
- **Rental Listings**: List items for rent with daily rates
- **Booking System**: Request rentals with date selection
- **Terms Management**: Automated rental agreement generation
- **Calendar Integration**: Date picker for rental periods

### 👤 **User Management**
- **Authentication**: Email/password registration and login
- **Profile Management**: User profiles with campus information
- **Favorites**: Save preferred items and stores
- **Order History**: Track purchase and rental history

### 💬 **Communication**
- **In-app Chat**: User-to-user and user-to-store messaging
- **Real-time Notifications**: Push notifications for orders, swaps, and rentals
- **Conversation Management**: Organized chat threads

### 🔍 **Discovery**
- **Search & Filters**: Advanced search with category filtering
- **Featured Items**: Promoted listings
- **Store Discovery**: Browse stores by location and category

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **State Management**: Redux Toolkit
- **Backend**: Firebase (Auth, Firestore, Cloud Messaging)
- **Navigation**: React Navigation 6
- **UI Components**: React Native + Expo Vector Icons
- **Image Handling**: Base64 encoding (no Firebase Storage needed)
- **Push Notifications**: Expo Notifications
- **Date/Time**: React Native Community DateTime Picker

## Project Structure

```
src/
├── components/          # Reusable UI components
├── config/             # Configuration files
│   └── firebase.ts     # Firebase configuration
├── navigation/         # Navigation setup
│   └── AppNavigator.tsx
├── screens/           # Screen components
│   ├── auth/          # Authentication screens
│   ├── HomeScreen.tsx
│   ├── StoreListScreen.tsx
│   ├── ProductDetailScreen.tsx
│   ├── CartScreen.tsx
│   ├── CheckoutScreen.tsx
│   ├── SwapScreen.tsx
│   ├── RentalScreen.tsx
│   └── ProfileScreen.tsx
├── services/          # Business logic services
│   └── NotificationService.ts
├── store/            # Redux store setup
│   ├── index.ts
│   └── slices/       # Redux slices
└── types/            # TypeScript type definitions
    └── index.ts
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Firebase project

### 1. Clone and Install
```bash
cd KUTRA
npm install
```

### 2. Firebase Configuration
1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Get your Firebase config object
5. Update `src/config/firebase.ts` with your Firebase configuration:

```typescript
const firebaseConfig = {
  apiKey: \"your-api-key\",
  authDomain: \"your-project-id.firebaseapp.com\",
  projectId: \"your-project-id\",
  storageBucket: \"your-project-id.appspot.com\",
  messagingSenderId: \"your-sender-id\",
  appId: \"your-app-id\"
};
```

### 3. Firestore Database Structure
Create these collections in Firestore:

```
- users/
- stores/
- listings/
- orders/
- swapRequests/
- rentalRequests/
- messages/
- favorites/
```

### 4. Run the Application
```bash
# Start the development server
npm start

# Run on specific platforms
npm run android
npm run ios
npm run web
```

## Key Features Implementation

### Authentication Flow
- Email/password registration and login
- User profile creation with campus information
- Secure session management with AsyncStorage

### Commerce System
- Product browsing with category filtering
- Shopping cart with quantity management
- Multi-step checkout with address and payment options
- Order tracking and history

### Swap & Rental Systems
- Item listing for trade/rent
- Request management with status tracking
- Automated matching for swap opportunities
- Calendar integration for rental bookings

### Real-time Features
- Push notifications for all major events
- In-app messaging system
- Live order status updates

## Environment Variables
Create a `.env` file in the root directory:

```
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

## Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android emulator/device
- `npm run ios` - Run on iOS simulator/device (macOS only)
- `npm run web` - Run in web browser
- `npm run build` - Build for production

## Data Models

The app uses comprehensive TypeScript interfaces for type safety:

- **User**: Authentication and profile data
- **Store**: Merchant information and settings
- **Listing**: Product/service listings with categories
- **Order**: Purchase transactions and fulfillment
- **SwapRequest**: Item trading proposals
- **RentalRequest**: Rental bookings and terms
- **Message**: Chat conversations
- **Favorite**: User saved items

## Security Considerations

- Firebase Authentication for secure user management
- Firestore security rules for data protection
- Input validation and sanitization
- Base64 image encoding to avoid external storage dependencies

## Future Enhancements

- [ ] Advanced search with filters
- [ ] Review and rating system
- [ ] Payment gateway integration
- [ ] Real-time chat with Socket.io
- [ ] Push notification improvements
- [ ] Analytics and reporting
- [ ] Admin dashboard
- [ ] Multi-language support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please create an issue in the repository.

---

**KUTRA** - Connecting campus communities through seamless commerce, trading, and rental experiences.", "original_text": "", "replace_all": false}]