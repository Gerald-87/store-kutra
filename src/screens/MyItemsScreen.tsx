import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Listing, ListingType } from '../types';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import AuthGuard from '../components/AuthGuard';

const MyItemsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth) as any;
  
  const [activeTab, setActiveTab] = useState<'swap' | 'rental'>('swap');
  const [swapListings, setSwapListings] = useState<Listing[]>([]);
  const [rentalListings, setRentalListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMyItems();
  }, [user]);

  const loadMyItems = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      await Promise.all([
        loadMySwapItems(),
        loadMyRentalItems(),
      ]);
    } catch (error) {
      console.error('Error loading my items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMySwapItems = async () => {
    if (!user?.uid) return;
    
    try {
      const q = query(
        collection(db, 'listings'),
        where('type', '==', ListingType.SWAP),
        where('sellerId', '==', user.uid),
        orderBy('postedDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const listings: Listing[] = [];
      
      querySnapshot.forEach((doc) => {
        listings.push({ id: doc.id, ...doc.data() } as Listing);
      });
      
      setSwapListings(listings);
    } catch (error) {
      console.error('Error loading swap items:', error);
    }
  };

  const loadMyRentalItems = async () => {
    if (!user?.uid) return;
    
    try {
      const q = query(
        collection(db, 'listings'),
        where('type', '==', ListingType.RENT),
        where('sellerId', '==', user.uid),
        orderBy('postedDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const listings: Listing[] = [];
      
      querySnapshot.forEach((doc) => {
        listings.push({ id: doc.id, ...doc.data() } as Listing);
      });
      
      setRentalListings(listings);
    } catch (error) {
      console.error('Error loading rental items:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMyItems();
    setRefreshing(false);
  };

  const renderItemCard = ({ item }: { item: Listing }) => (
    <TouchableOpacity style={styles.itemCard} activeOpacity={0.7}>
      <Image
        source={{
          uri: item.imageBase64
            ? `data:image/jpeg;base64,${item.imageBase64}`
            : item.imageUrl || 'https://placehold.co/120x120.png?text=No+Image'
        }}
        style={styles.itemImage}
        resizeMode="cover"
      />
      
      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-vertical" size={16} color="#8B7355" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.itemDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.itemDetails}>
          <View style={styles.priceContainer}>
            <Text style={styles.itemPrice}>
              {item.type === ListingType.RENT 
                ? `K${item.price}/day` 
                : `K${item.price}`
              }
            </Text>
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: item.isActive !== false ? '#10B981' : '#F59E0B' }
            ]}>
              <Text style={styles.statusText}>
                {item.isActive !== false ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.itemMeta}>
          <Text style={styles.itemDate}>
            Posted {new Date(item.postedDate).toLocaleDateString()}
          </Text>
          <Text style={styles.itemCategory}>
            {item.category}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = (type: string) => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={type === 'swap' ? 'swap-horizontal-outline' : 'calendar-outline'} 
        size={64} 
        color="#D1D5DB" 
      />
      <Text style={styles.emptyTitle}>
        No {type} items listed
      </Text>
      <Text style={styles.emptyText}>
        {type === 'swap' 
          ? 'Start listing items you want to swap with others'
          : 'List items you want to rent out to earn money'
        }
      </Text>
      <TouchableOpacity style={styles.addButton}>
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.addButtonText}>List Item</Text>
      </TouchableOpacity>
    </View>
  );

  const currentData = activeTab === 'swap' ? swapListings : rentalListings;

  return (
    <AuthGuard
      fallbackTitle="Manage Your Items"
      fallbackMessage="Sign in to view and manage your listed items for swap and rental"
      fallbackIcon="list-outline"
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#2D1810" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Items</Text>
          <TouchableOpacity style={styles.addHeaderButton}>
            <Ionicons name="add" size={24} color="#8B4513" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'swap' && styles.activeTab]}
            onPress={() => setActiveTab('swap')}
          >
            <Ionicons 
              name="swap-horizontal" 
              size={18} 
              color={activeTab === 'swap' ? '#8B4513' : '#8B7355'} 
            />
            <Text style={[styles.tabText, activeTab === 'swap' && styles.activeTabText]}>
              Swap Items ({String(swapListings.length)})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'rental' && styles.activeTab]}
            onPress={() => setActiveTab('rental')}
          >
            <Ionicons 
              name="calendar" 
              size={18} 
              color={activeTab === 'rental' ? '#8B4513' : '#8B7355'} 
            />
            <Text style={[styles.tabText, activeTab === 'rental' && styles.activeTabText]}>
              Rental Items ({String(rentalListings.length)})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <FlatList
          key={`myitems-${activeTab}`}
          data={currentData}
          renderItem={renderItemCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#8B4513']}
              tintColor="#8B4513"
            />
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B4513" />
                <Text style={styles.loadingText}>Loading your items...</Text>
              </View>
            ) : (
              renderEmptyState(activeTab)
            )
          }
        />
      </SafeAreaView>
    </AuthGuard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F3F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
    flex: 1,
    textAlign: 'center',
  },
  addHeaderButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#8B4513',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B7355',
  },
  activeTabText: {
    color: '#8B4513',
  },
  listContainer: {
    padding: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    flex: 0.48,
  },
  itemImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#F3F4F6',
  },
  itemInfo: {
    padding: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D1810',
    flex: 1,
    marginRight: 8,
    lineHeight: 18,
  },
  moreButton: {
    padding: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 16,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceContainer: {
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B4513',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemDate: {
    fontSize: 10,
    color: '#8B7355',
  },
  itemCategory: {
    fontSize: 10,
    color: '#8B4513',
    fontWeight: '600',
    backgroundColor: '#F5F1ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B4513',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 12,
  },
});

export default MyItemsScreen;