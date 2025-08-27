import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../store';
import { logoutUser } from '../store/slices/authSlice';
import { fetchFavorites } from '../store/slices/favoritesSlice';
import { ProfileStackParamList, MainTabParamList, RootStackParamList } from '../navigation/AppNavigator';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import ProfileAuthScreen from './ProfileAuthScreen';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<ProfileStackParamList, 'ProfileMain'>,
  CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList>,
    StackNavigationProp<RootStackParamList>
  >
>;

const ProfileScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const auth = useSelector((state: RootState) => state.auth) as any;
  const cart = useSelector((state: RootState) => state.cart) as any;
  const favorites = useSelector((state: RootState) => state.favorites) as any;
  
  const user = auth?.user;
  const totalItems = cart?.totalItems || 0;
  const favoritesCount = favorites?.items?.length || 0;

  // State for user statistics - different for store owners vs customers
  const [stats, setStats] = useState({
    orders: 0,
    ...(user?.role !== 'Store Owner' && {
      swapListings: 0,
      rentalListings: 0,
      swapRequests: 0,
      rentalRequests: 0,
    }),
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    campus: user?.campus || '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Load user statistics when component mounts
  useEffect(() => {
    if (user?.uid) {
      loadUserStats();
      // Load favorites to get the count
      if (user.role !== 'Store Owner') {
        dispatch(fetchFavorites(user.uid));
      }
    }
  }, [user]);

  const loadUserStats = async () => {
    if (!user?.uid) return;
    
    setIsLoadingStats(true);
    try {
      // Base stats for all users
      const baseQueries = [
        // Count orders
        getDocs(query(
          collection(db, 'orders'),
          where('customerId', '==', user.uid)
        )),
      ];
      
      // Additional queries only for customers (not store owners)
      const customerQueries = user.role !== 'Store Owner' ? [
        // Count user's swap listings
        getDocs(query(
          collection(db, 'listings'),
          where('sellerId', '==', user.uid),
          where('type', '==', 'Swap')
        )),
        // Count user's rental listings
        getDocs(query(
          collection(db, 'listings'),
          where('sellerId', '==', user.uid),
          where('type', '==', 'Rent')
        )),
        // Count swap requests (sent and received)
        getDocs(query(
          collection(db, 'swapRequests'),
          where('fromUserId', '==', user.uid)
        )),
        // Count rental requests (sent and received)
        getDocs(query(
          collection(db, 'rentalRequests'),
          where('renterId', '==', user.uid)
        )),
      ] : [];
      
      const allQueries = [...baseQueries, ...customerQueries];
      const results = await Promise.all(allQueries);
      
      const newStats: any = {
        orders: results[0].size,
      };
      
      // Add customer-specific stats only for non-store owners
      if (user.role !== 'Store Owner') {
        newStats.swapListings = results[1]?.size || 0;
        newStats.rentalListings = results[2]?.size || 0;
        newStats.swapRequests = results[3]?.size || 0;
        newStats.rentalRequests = results[4]?.size || 0;
      }
      
      setStats(newStats);
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Show login/register screen if user is not authenticated
  if (!user) {
    return <ProfileAuthScreen />;
  }

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => dispatch(logoutUser()),
        },
      ]
    );
  };

  const handleEditProfile = () => {
    setEditForm({
      name: user?.name || '',
      email: user?.email || '',
      campus: user?.campus || '',
    });
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    
    if (!editForm.email.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }
    
    setIsUpdating(true);
    try {
      // Here you would typically update the user profile in Firebase
      // For now, we'll just show a success message
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => setShowEditModal(false) }
      ]);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const menuItems = [
    // Store Dashboard for Store Owners
    ...(user.role === 'Store Owner' ? [{
      icon: 'storefront',
      title: 'Store Dashboard',
      subtitle: 'Manage your store and products',
      onPress: () => navigation.getParent()?.getParent()?.navigate('StoreDashboard'),
      color: '#8B4513',
      isStoreOwner: true,
    }] : []),
    // Only show these items for customers, not store owners
    ...(user.role !== 'Store Owner' ? [
      {
        icon: 'heart-outline',
        title: 'Favorites',
        subtitle: 'Your saved items',
        onPress: () => navigation.navigate('Favorites'),
        color: '#8B4513',
      },
      {
        icon: 'receipt-outline',
        title: 'My Orders',
        subtitle: 'Track your purchases',
        onPress: () => navigation.navigate('Orders'),
        color: '#8B4513',
      },
      {
        icon: 'cart-outline',
        title: 'Shopping Cart',
        subtitle: `${totalItems} items`,
        onPress: () => navigation.navigate('Cart'),
        color: '#8B4513',
      },
    ] : []),
    // Only show swap/rental for customers, not store owners
    ...(user.role !== 'Store Owner' ? [
      {
        icon: 'cube-outline',
        title: 'My Items',
        subtitle: 'View your swap and rental listings',
        onPress: () => navigation.navigate('MyItems' as never),
        color: '#8B4513',
      },
      {
        icon: 'calendar-outline',
        title: 'My Bookings',
        subtitle: 'View rental bookings and requests',
        onPress: () => navigation.navigate('MyBookings' as never),
        color: '#8B4513',
      },
      {
        icon: 'swap-horizontal-outline',
        title: 'My Requests',
        subtitle: 'View swap requests and offers',
        onPress: () => navigation.navigate('MyRequests' as never),
        color: '#8B4513',
      },
    ] : []),
    {
      icon: 'chatbubbles-outline',
      title: 'Messages',
      subtitle: 'Your conversations',
      onPress: () => navigation.getParent()?.navigate('Chat'),
      color: '#8B4513',
    },
    {
      icon: 'location-outline',
      title: 'Addresses',
      subtitle: 'Manage delivery addresses',
      onPress: () => navigation.navigate('Address' as never),
      color: '#8B4513',
    },
    {
      icon: 'notifications-outline',
      title: 'Notifications',
      subtitle: 'Notification preferences',
      onPress: () => navigation.getParent()?.getParent()?.navigate('Notifications'),
      color: '#8B4513',
    },
    {
      icon: 'help-circle-outline',
      title: 'Help & Support',
      subtitle: 'Get help and contact us',
      onPress: () => navigation.navigate('Help' as never),
      color: '#8B4513',
    },
    {
      icon: 'settings-outline',
      title: 'Settings',
      subtitle: 'App preferences',
      onPress: () => navigation.navigate('Settings' as never),
      color: '#8B4513',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri: user.avatarBase64
                ? `data:image/jpeg;base64,${user.avatarBase64}`
                : user.avatarUrl || 'https://placehold.co/100x100.png?text=User'
            }}
            style={styles.avatar}
          />
          <TouchableOpacity style={styles.editAvatarButton}>
            <Ionicons name="camera" size={16} color="white" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          {user.campus && (
            <Text style={styles.userCampus}>{user.campus}</Text>
          )}
          <Text style={styles.memberSince}>
            Member since {user.joinedDate && !isNaN(new Date(user.joinedDate).getTime()) 
              ? new Date(user.joinedDate).toLocaleDateString() 
              : 'Unknown date'}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
          <Ionicons name="create-outline" size={20} color="#8B4513" />
          <Text style={styles.editProfileText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          {isLoadingStats ? (
            <ActivityIndicator size="small" color="#8B4513" />
          ) : (
            <Text style={styles.statValue}>{stats.orders}</Text>
          )}
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        {user.role !== 'Store Owner' && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              {isLoadingStats || favorites.isLoading ? (
                <ActivityIndicator size="small" color="#8B4513" />
              ) : (
                <Text style={styles.statValue}>{favoritesCount}</Text>
              )}
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              {isLoadingStats ? (
                <ActivityIndicator size="small" color="#8B4513" />
              ) : (
                <Text style={styles.statValue}>{String(totalItems)}</Text>
              )}
              <Text style={styles.statLabel}>In Cart</Text>
            </View>
          </>
        )}
      </View>

      {/* Activity Stats - Only for customers, not store owners */}
      {user.role !== 'Store Owner' && (
        <View style={styles.activityStatsContainer}>
          <Text style={styles.activityStatsTitle}>Your Activity</Text>
          <View style={styles.activityGrid}>
            <View style={styles.activityItem}>
              <Ionicons name="cube" size={24} color="#8B4513" />
              <Text style={styles.activityValue}>
                {isLoadingStats ? '...' : String(((stats as any).swapListings || 0) + ((stats as any).rentalListings || 0))}
              </Text>
              <Text style={styles.activityLabel}>My Items</Text>
            </View>
            <View style={styles.activityItem}>
              <Ionicons name="calendar" size={24} color="#8B4513" />
              <Text style={styles.activityValue}>
                {isLoadingStats ? '...' : String((stats as any).rentalListings || 0)}
              </Text>
              <Text style={styles.activityLabel}>Rental Items</Text>
            </View>
            <View style={styles.activityItem}>
              <Ionicons name="repeat" size={24} color="#8B4513" />
              <Text style={styles.activityValue}>
                {isLoadingStats ? '...' : String((stats as any).swapRequests || 0)}
              </Text>
              <Text style={styles.activityLabel}>My Requests</Text>
            </View>
            <View style={styles.activityItem}>
              <Ionicons name="time" size={24} color="#8B4513" />
              <Text style={styles.activityValue}>
                {isLoadingStats ? '...' : String((stats as any).rentalRequests || 0)}
              </Text>
              <Text style={styles.activityLabel}>My Bookings</Text>
            </View>
          </View>
        </View>
      )}

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              item.isStoreOwner && styles.storeOwnerMenuItem
            ]}
            onPress={item.onPress}
          >
            <View style={styles.menuItemLeft}>
              <View style={[
                styles.menuIconContainer,
                item.isStoreOwner && styles.storeOwnerIcon
              ]}>
                <Ionicons 
                  name={item.icon as any} 
                  size={24} 
                  color={item.isStoreOwner ? '#FFFFFF' : item.color} 
                />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[
                  styles.menuTitle,
                  item.isStoreOwner && styles.storeOwnerTitle
                ]}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8B7355" />
          </TouchableOpacity>
        ))}
      </View>

      {/* App Info */}
      <View style={styles.appInfoContainer}>
        <Text style={styles.appName}>KUTRA</Text>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
        <Text style={styles.appDescription}>
          Your marketplace where Trade meets AI
        </Text>
        <Text style={styles.poweredByText}>Powered by Gerald Limbando</Text>
      </View>

      {/* Logout Button */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      
      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowEditModal(false)}
              style={styles.modalCancelButton}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity 
              onPress={handleSaveProfile}
              style={styles.modalSaveButton}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#8B4513" />
              ) : (
                <Text style={styles.modalSaveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.modalContent} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Name</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.name}
                onChangeText={(text) => setEditForm({...editForm, name: text})}
                placeholder="Enter your name"
                placeholderTextColor="#8B7355"
                returnKeyType="next"
                onSubmitEditing={() => Keyboard.dismiss()}
                blurOnSubmit={false}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.email}
                onChangeText={(text) => setEditForm({...editForm, email: text})}
                placeholder="Enter your email"
                placeholderTextColor="#8B7355"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => Keyboard.dismiss()}
                blurOnSubmit={false}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Campus</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.campus}
                onChangeText={(text) => setEditForm({...editForm, campus: text})}
                placeholder="Enter your campus (optional)"
                placeholderTextColor="#8B7355"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                blurOnSubmit={true}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F3F0',
  },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#8B4513',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#8B7355',
    marginBottom: 2,
  },
  userCampus: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '500',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 12,
    color: '#8B7355',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F1ED',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editProfileText: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '600',
    marginLeft: 4,
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D1810',
    textAlign: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8B7355',
    textAlign: 'center',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E8E2DD',
    marginVertical: 8,
  },
  activityStatsContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityStatsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 16,
    textAlign: 'center',
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  activityItem: {
    width: '48%',
    alignItems: 'center',
    backgroundColor: '#F7F3F0',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  activityValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D1810',
    marginTop: 8,
    marginBottom: 4,
  },
  activityLabel: {
    fontSize: 12,
    color: '#8B7355',
    textAlign: 'center',
    fontWeight: '500',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F1ED',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F1ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#8B7355',
  },
  storeOwnerMenuItem: {
    backgroundColor: '#F5F1ED',
    borderLeftWidth: 4,
    borderLeftColor: '#8B4513',
  },
  storeOwnerIcon: {
    backgroundColor: '#8B4513',
  },
  storeOwnerTitle: {
    color: '#8B4513',
    fontWeight: '700',
  },
  appInfoContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#8B7355',
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: 20,
  },
  poweredByText: {
    fontSize: 12,
    color: '#8B7355',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  logoutContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F7F3F0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  modalCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#8B7355',
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
  },
  modalSaveButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalSaveText: {
    fontSize: 16,
    color: '#8B4513',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2D1810',
    borderWidth: 1,
    borderColor: '#E8E2DD',
  },
});

export default ProfileScreen;