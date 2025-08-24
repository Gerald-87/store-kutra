import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState } from '../store';

// Screen imports (we'll create these)
import HomeScreen from '../screens/HomeScreen';
import StoreListScreen from '../screens/StoreListScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import SwapScreen from '../screens/SwapScreen';
import RentalScreen from '../screens/RentalScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import ConversationScreen from '../screens/ConversationScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import OrdersScreen from '../screens/OrdersScreen';
import SearchScreen from '../screens/SearchScreen';
import StoreDetailScreen from '../screens/StoreDetailScreen';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ProductDetail: { productId: string; listingId?: string };
  Cart: undefined;
  Checkout: undefined;
  Conversation: { 
    conversationId: string; 
    otherUserId: string; 
    otherUserName: string; 
    listingId?: string;
  };
  Search: { category?: string; query?: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Stores: undefined;
  Swap: undefined;
  Rental: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  Search: { category?: string; query?: string };
  ProductDetail: { productId: string; listingId?: string };
  StoreDetail: { store: any };
};

export type StoreStackParamList = {
  StoreList: undefined;
  StoreDetail: { store: any };
  ProductDetail: { productId: string; listingId?: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Favorites: undefined;
  Orders: undefined;
  Cart: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createStackNavigator<HomeStackParamList>();
const StoreStack = createStackNavigator<StoreStackParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();

// Auth Stack Navigator
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

// Home Stack Navigator
function HomeNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen 
        name="HomeMain" 
        component={HomeScreen} 
        options={{ title: 'KUTRA' }}
      />
      <HomeStack.Screen 
        name="Search" 
        component={SearchScreen} 
        options={{ title: 'Search' }}
      />
      <HomeStack.Screen 
        name="ProductDetail" 
        component={ProductDetailScreen} 
        options={{ title: 'Product Details' }}
      />
      <HomeStack.Screen 
        name="StoreDetail" 
        component={StoreDetailScreen} 
        options={{ headerShown: false }}
      />
    </HomeStack.Navigator>
  );
}

// Store Stack Navigator
function StoreNavigator() {
  return (
    <StoreStack.Navigator>
      <StoreStack.Screen 
        name="StoreList" 
        component={StoreListScreen} 
        options={{ title: 'Stores' }}
      />
      <StoreStack.Screen 
        name="StoreDetail" 
        component={StoreDetailScreen} 
        options={{ headerShown: false }}
      />
      <StoreStack.Screen 
        name="ProductDetail" 
        component={ProductDetailScreen} 
        options={{ title: 'Product Details' }}
      />
    </StoreStack.Navigator>
  );
}

// Profile Stack Navigator
function ProfileNavigator() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen 
        name="ProfileMain" 
        component={ProfileScreen} 
        options={{ title: 'Profile' }}
      />
      <ProfileStack.Screen 
        name="Favorites" 
        component={FavoritesScreen} 
        options={{ title: 'Favorites' }}
      />
      <ProfileStack.Screen 
        name="Orders" 
        component={OrdersScreen} 
        options={{ title: 'My Orders' }}
      />
      <ProfileStack.Screen 
        name="Cart" 
        component={CartScreen} 
        options={{ title: 'Shopping Cart' }}
      />
    </ProfileStack.Navigator>
  );
}

// Main Tab Navigator
function MainNavigator() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Stores':
              iconName = focused ? 'storefront' : 'storefront-outline';
              break;
            case 'Swap':
              iconName = focused ? 'swap-horizontal' : 'swap-horizontal-outline';
              break;
            case 'Rental':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Chat':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#8B4513',
        tabBarInactiveTintColor: '#8B7355',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E8E2DD',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen name="Stores" component={StoreNavigator} />
      <Tab.Screen name="Swap" component={SwapScreen} />
      <Tab.Screen name="Rental" component={RentalScreen} />
      {isAuthenticated && (
        <Tab.Screen name="Chat" component={ChatScreen} />
      )}
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}

// Root Navigator
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainNavigator} />
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen 
          name="ProductDetail" 
          component={ProductDetailScreen} 
          options={{ headerShown: true, title: 'Product Details' }}
        />
        <Stack.Screen 
          name="Cart" 
          component={CartScreen} 
          options={{ headerShown: true, title: 'Shopping Cart' }}
        />
        <Stack.Screen 
          name="Checkout" 
          component={CheckoutScreen} 
          options={{ headerShown: true, title: 'Checkout' }}
        />
        <Stack.Screen 
          name="Conversation" 
          component={ConversationScreen} 
          options={{ headerShown: true, title: 'Chat' }}
        />
        <Stack.Screen 
          name="Search" 
          component={SearchScreen} 
          options={{ headerShown: true, title: 'Search' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}