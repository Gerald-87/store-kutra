import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../store';
import { fetchFavorites, removeFromFavorites } from '../store/slices/favoritesSlice';
import { Favorite, Listing } from '../types';
import { collection, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface FavoriteWithListing extends Favorite {
  listing: Listing;
}

const FavoritesScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth) as any;
  const { items: favorites, isLoading } = useSelector((state: RootState) => state.favorites);
  
  const [favoritesWithListings, setFavoritesWithListings] = useState<FavoriteWithListing[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingListings, setLoadingListings] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadFavorites();
    }
  }, [user]);

  useEffect(() => {
    if (favorites.length > 0) {
      loadListingDetails();
    } else {
      setFavoritesWithListings([]);
    }
  }, [favorites]);

  const loadFavorites = async () => {
    if (!user?.uid) return;
    try {
      await dispatch(fetchFavorites(user.uid));
    } catch (error) {
      console.error('Error loading favorites:', error);
      Alert.alert('Error', 'Failed to load favorites');
    }
  };

  const loadListingDetails = async () => {
    setLoadingListings(true);
    try {
      const favoritesWithDetails: (Favorite & { listing?: Listing })[] = await Promise.all(
        favorites.map(async (favorite) => {
          try {
            const listingDoc = await getDoc(doc(db, 'listings', favorite.listingId));
            if (listingDoc.exists()) {
              const listing = { id: listingDoc.id, ...listingDoc.data() } as Listing;
              return { ...favorite, listing };
            }
            return favorite;
          } catch (error) {
            console.error('Error fetching listing:', favorite.listingId, error);
            return favorite;
          }
        })
      );
      setFavoritesWithListings(favoritesWithDetails.filter((f): f is FavoriteWithListing => !!f.listing));
    } catch (error) {
      console.error('Error loading listing details:', error);
    } finally {
      setLoadingListings(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const handleRemoveFromFavorites = (favoriteId: string, listingTitle: string) => {
    Alert.alert(
      'Remove from Favorites',
      `Remove "${listingTitle}" from your favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(removeFromFavorites(favoriteId));
            } catch (error) {
              console.error('Error removing favorite:', error);
              Alert.alert('Error', 'Failed to remove from favorites');
            }
          },
        },
      ]
    );
  };

  const handleListingPress = (listing: Listing) => {
    (navigation as any).navigate('ProductDetail', { 
      productId: listing.id,
      listing: listing 
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(price).replace('UGX', 'UGX ');
  };

  const renderFavoriteItem = ({ item }: { item: FavoriteWithListing }) => {
    if (!item.listing) return null;
    
    return (
      <TouchableOpacity
        style={styles.favoriteCard}
        onPress={() => handleListingPress(item.listing!)}
        activeOpacity={0.7}
      >
        <Image
          source={{
            uri: item.listing.imageUrl || 'https://placehold.co/80x80.png?text=No+Image'
          }}
          style={styles.listingImage}
        />
        
        <View style={styles.listingInfo}>
          <Text style={styles.listingTitle} numberOfLines={2}>
            {item.listing.title}
          </Text>
          <Text style={styles.listingPrice}>
            {formatPrice(item.listing.price)}
          </Text>
          <Text style={styles.listingCategory}>
            {item.listing.category} • {item.listing.condition || 'New'}
          </Text>
          <Text style={styles.addedDate}>
            Added {new Date(item.addedAt).toLocaleDateString()}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFromFavorites(item.id!, item.listing!.title)}
        >
          <Ionicons name="heart" size={24} color="#EF4444" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="heart-outline" size={64} color="#D2B48C" />
      <Text style={styles.emptyTitle}>No Favorites Yet</Text>
      <Text style={styles.emptyText}>
        Items you favorite will appear here. Start exploring and tap the heart icon on items you love!
      </Text>
      <TouchableOpacity 
        style={styles.exploreButton}
        onPress={() => (navigation as any).navigate('Home')}
      >
        <Text style={styles.exploreButtonText}>Start Exploring</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <FlatList
        data={favoritesWithListings}
        renderItem={renderFavoriteItem}
        keyExtractor={(item) => item.id || Math.random().toString()}
        contentContainerStyle={[
          styles.listContainer,
          favoritesWithListings.length === 0 && styles.emptyListContainer,
        ]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing || isLoading || loadingListings} 
            onRefresh={onRefresh}
            colors={['#8B4513']}
            tintColor="#8B4513"
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#F3F4F6' }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F3F0',
  },
  listContainer: {
    paddingVertical: 8,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  favoriteCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  listingImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  listingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B4513',
    marginBottom: 4,
  },
  listingCategory: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  addedDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D1810',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FavoritesScreen;