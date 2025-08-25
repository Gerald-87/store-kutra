import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState } from '../store';

// Screen imports (we'll create these)
import HomeScreen from '../screens/HomeScreen';
import StoreListScreen from '../screens/StoreListScreen';
import StoreDetailScreen from '../screens/StoreDetailScreen';
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
import FeaturedProductsScreen from '../screens/FeaturedProductsScreen';
import StoreDashboardScreen from '../screens/StoreDashboardScreen';
import StoreManagementScreen from '../screens/StoreManagementScreen';
import ProductManagementScreen from '../screens/ProductManagementScreen';
import OrderManagementScreen from '../screens/OrderManagementScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import AddProductScreen from '../screens/AddProductScreen';
import AddRentalSwapListingScreen from '../screens/AddRentalSwapListingScreen';
import EditProductScreen from '../screens/EditProductScreen';
import StoreAnalyticsScreen from '../screens/StoreAnalyticsScreen';
import NotificationScreen from '../screens/NotificationScreen';
import AddressScreen from '../screens/AddressScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HelpScreen from '../screens/HelpScreen';
import MyItemsScreen from '../screens/MyItemsScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';
import MyRequestsScreen from '../screens/MyRequestsScreen';
import { UserRole } from '../types';

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
  StoreDashboard: undefined;
  StoreManagement: undefined;
  ProductManagement: undefined;
  OrderManagement: undefined;
  AddProduct: undefined;
  EditProduct: { product: any };
  AddRentalSwapListing: { listingType: 'rent' | 'swap' };
  OrderDetail: { order: any };
  StoreAnalytics: undefined;
  Notifications: undefined;
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

export type StoreOwnerTabParamList = {
  Dashboard: undefined;
  Products: undefined;
  Orders: undefined;
  Analytics: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type StoreDashboardStackParamList = {
  DashboardMain: undefined;
  StoreManagement: undefined;
  AddProduct: undefined;
  EditProduct: { product: any };
};

export type StoreProductsStackParamList = {
  ProductsMain: undefined;
  AddProduct: undefined;
  EditProduct: { product: any };
};

export type StoreOrdersStackParamList = {
  OrdersMain: undefined;
  OrderDetail: { order: any };
};

export type HomeStackParamList = {
  HomeMain: undefined;
  Search: { category?: string; query?: string };
  ProductDetail: { productId: string; listingId?: string };
  StoreDetail: { store: any };
  FeaturedProducts: undefined;
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
  Address: undefined;
  Settings: undefined;
  Help: undefined;
  MyItems: undefined;
  MyBookings: undefined;
  MyRequests: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const StoreOwnerTab = createBottomTabNavigator<StoreOwnerTabParamList>();
const StoreDashboardStack = createStackNavigator<StoreDashboardStackParamList>();
const StoreProductsStack = createStackNavigator<StoreProductsStackParamList>();
const StoreOrdersStack = createStackNavigator<StoreOrdersStackParamList>();
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
      <HomeStack.Screen 
        name="FeaturedProducts" 
        component={FeaturedProductsScreen} 
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
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen 
        name="Cart" 
        component={CartScreen} 
        options={{ title: 'Shopping Cart' }}
      />
      <ProfileStack.Screen 
        name="Address" 
        component={AddressScreen} 
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen 
        name="Help" 
        component={HelpScreen} 
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen 
        name="MyItems" 
        component={MyItemsScreen} 
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen 
        name="MyBookings" 
        component={MyBookingsScreen} 
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen 
        name="MyRequests" 
        component={MyRequestsScreen} 
        options={{ headerShown: false }}
      />
    </ProfileStack.Navigator>
  );
}

// Store Dashboard Stack Navigator
function StoreDashboardNavigator() {
  return (
    <StoreDashboardStack.Navigator>
      <StoreDashboardStack.Screen 
        name="DashboardMain" 
        component={StoreDashboardScreen} 
        options={{ headerShown: false }}
      />
      <StoreDashboardStack.Screen 
        name="StoreManagement" 
        component={StoreManagementScreen} 
        options={{ headerShown: false }}
      />
      <StoreDashboardStack.Screen 
        name="AddProduct" 
        component={AddProductScreen} 
        options={{ headerShown: false }}
      />
      <StoreDashboardStack.Screen 
        name="EditProduct" 
        component={EditProductScreen} 
        options={{ headerShown: false }}
      />
    </StoreDashboardStack.Navigator>
  );
}

// Store Products Stack Navigator
function StoreProductsNavigator() {
  return (
    <StoreProductsStack.Navigator>
      <StoreProductsStack.Screen 
        name="ProductsMain" 
        component={ProductManagementScreen} 
        options={{ headerShown: false }}
      />
      <StoreProductsStack.Screen 
        name="AddProduct" 
        component={AddProductScreen} 
        options={{ headerShown: false }}
      />
      <StoreProductsStack.Screen 
        name="EditProduct" 
        component={EditProductScreen} 
        options={{ headerShown: false }}
      />
    </StoreProductsStack.Navigator>
  );
}

// Store Orders Stack Navigator
function StoreOrdersNavigator() {
  return (
    <StoreOrdersStack.Navigator>
      <StoreOrdersStack.Screen 
        name="OrdersMain" 
        component={OrderManagementScreen} 
        options={{ headerShown: false }}
      />
      <StoreOrdersStack.Screen 
        name="OrderDetail" 
        component={OrderDetailScreen} 
        options={{ headerShown: false }}
      />
    </StoreOrdersStack.Navigator>
  );
}

// Store Owner Tab Navigator
function StoreOwnerNavigator() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const insets = useSafeAreaInsets();

  return (
    <StoreOwnerTab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'analytics' : 'analytics-outline';
              break;
            case 'Products':
              iconName = focused ? 'cube' : 'cube-outline';
              break;
            case 'Orders':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            case 'Analytics':
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
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
          paddingBottom: Math.max(insets.bottom, 8),
          height: 64 + Math.max(insets.bottom, 8),
          paddingTop: 4,
        },
        headerShown: false,
      })}
    >
      <StoreOwnerTab.Screen name="Dashboard" component={StoreDashboardNavigator} />
      <StoreOwnerTab.Screen name="Products" component={StoreProductsNavigator} />
      <StoreOwnerTab.Screen name="Orders" component={StoreOrdersNavigator} />
      <StoreOwnerTab.Screen name="Analytics" component={StoreAnalyticsScreen} />
      {isAuthenticated && (
        <StoreOwnerTab.Screen name="Chat" component={ChatScreen} />
      )}
      <StoreOwnerTab.Screen name="Profile" component={ProfileNavigator} />
    </StoreOwnerTab.Navigator>
  );
}

// Main Tab Navigator
function MainNavigator() {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth) as any;
  const insets = useSafeAreaInsets();
  
  // Check if user is a store owner
  const isStoreOwner = user?.role === UserRole.STORE_OWNER;
  
  // If user is a store owner, show store owner navigation
  if (isStoreOwner) {
    return <StoreOwnerNavigator />;
  }

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
          paddingBottom: Math.max(insets.bottom, 8),
          height: 64 + Math.max(insets.bottom, 8),
          paddingTop: 4,
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
        <Stack.Screen 
          name="StoreDashboard" 
          component={StoreDashboardScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="StoreManagement" 
          component={StoreManagementScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ProductManagement" 
          component={ProductManagementScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="OrderManagement" 
          component={OrderManagementScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="AddProduct" 
          component={AddProductScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="AddRentalSwapListing" 
          component={AddRentalSwapListingScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="EditProduct" 
          component={EditProductScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="OrderDetail" 
          component={OrderDetailScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Notifications" 
          component={NotificationScreen} 
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}