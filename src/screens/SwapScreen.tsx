import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../store';
import { fetchListings } from '../store/slices/listingsSlice';
import { Listing, ListingType, SwapRequest } from '../types';
import { collection, addDoc, query, where, getDocs, orderBy, Timestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import AuthGuard from '../components/AuthGuard';

const SwapScreen: React.FC = () => {
  const navigation = useNavigation();
  const [swapListings, setSwapListings] = useState<Listing[]>([]);
  const [mySwapListings, setMySwapListings] = useState<Listing[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedMyListing, setSelectedMyListing] = useState<Listing | null>(null);
  const [swapMessage, setSwapMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'browse' | 'my_swaps' | 'requests'>('browse');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth) as any;
  const listings = useSelector((state: RootState) => state.listings) as any;
  const isListingsLoading = listings?.isLoading || false;

  useEffect(() => {
    loadSwapData();
  }, []);

  useEffect(() => {
    // Reset tab when user logs out and they're on a restricted tab
    if (!user && (activeTab === 'my_swaps' || activeTab === 'requests')) {
      setActiveTab('browse');
      setMySwapListings([]);
    }
    // Clear user-specific data when logged out
    if (!user) {
      setMySwapListings([]);
    }
  }, [user, activeTab]);

  const handleListingPress = (listing: Listing) => {
    (navigation as any).navigate('ProductDetail', {
      listingId: listing.id,
      productId: listing.id
    });
  };

  const loadSwapData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadSwapListings(),
        loadMySwapListings(),
        loadSwapRequests(),
      ]);
    } catch (error: any) {
      console.error('Error loading swap data:', error);
      setError('Failed to load swap data. Please try again.');
      Alert.alert('Error', 'Failed to load swap data. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSwapData();
    setRefreshing(false);
  };

  const loadSwapListings = async () => {
    try {
      const q = query(
        collection(db, 'listings'),
        where('type', '==', ListingType.SWAP),
        orderBy('postedDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const listings: Listing[] = [];
      
      querySnapshot.forEach((doc) => {
        const listing = { id: doc.id, ...doc.data() } as Listing;
        // Exclude user's own listings and include only active listings
        if (listing.sellerId !== user?.uid && listing.isActive !== false) {
          listings.push(listing);
        }
      });
      
      setSwapListings(listings);
    } catch (error) {
      console.error('Error loading swap listings:', error);
    }
  };

  const loadMySwapListings = async () => {
    if (!user) return;
    
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
      
      setMySwapListings(listings);
    } catch (error) {
      console.error('Error loading my swap listings:', error);
    }
  };

  const loadSwapRequests = async () => {
    if (!user) return;
    
    try {
      const q1 = query(
        collection(db, 'swapRequests'),
        where('fromUserId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const q2 = query(
        collection(db, 'swapRequests'),
        where('toUserId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(q1),
        getDocs(q2)
      ]);
      
      const requests: SwapRequest[] = [];
      
      sentSnapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() } as SwapRequest);
      });
      
      receivedSnapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() } as SwapRequest);
      });
      
      setSwapRequests(requests);
    } catch (error) {
      console.error('Error loading swap requests:', error);
    }
  };

  const initializeChat = async (listing: Listing) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to start a chat');
      return;
    }

    if (!listing.sellerId || listing.sellerId === user.uid) {
      Alert.alert('Error', 'Cannot chat with yourself');
      return;
    }

    try {
      // Create conversation ID based on user IDs
      const conversationId = [user.uid, listing.sellerId].sort().join('_');
      
      // Navigate to conversation screen
      (navigation as any).navigate('Conversation', {
        conversationId,
        otherUserId: listing.sellerId,
        otherUserName: listing.sellerName || 'User',
        listingId: listing.id,
      });
    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Error', 'Failed to start chat. Please try again.');
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this swap listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'listings', listingId));
              Alert.alert('Success', 'Listing deleted successfully!');
              loadMySwapListings();
            } catch (error) {
              console.error('Error deleting listing:', error);
              Alert.alert('Error', 'Failed to delete listing. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleEditListing = async (listing: Listing) => {
    Alert.alert(
      'Edit Listing',
      'What would you like to update?',
      [
        {
          text: 'Update Description',
          onPress: () => handleUpdateDescription(listing)
        },
        {
          text: 'Mark as Unavailable',
          onPress: () => handleToggleAvailability(listing)
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleUpdateDescription = (listing: Listing) => {
    Alert.prompt(
      'Update Description',
      'Enter new description:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async (newDescription) => {
            if (newDescription && newDescription.trim()) {
              try {
                await updateDoc(doc(db, 'listings', listing.id), {
                  description: newDescription.trim(),
                  updatedAt: Timestamp.now()
                });
                Alert.alert('Success', 'Description updated successfully!');
                loadMySwapListings();
              } catch (error) {
                console.error('Error updating description:', error);
                Alert.alert('Error', 'Failed to update description.');
              }
            }
          }
        }
      ],
      'plain-text',
      listing.description
    );
  };

  const handleToggleAvailability = async (listing: Listing) => {
    try {
      const newStatus = listing.isActive ? false : true;
      await updateDoc(doc(db, 'listings', listing.id), {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      Alert.alert('Success', `Listing marked as ${newStatus}!`);
      loadMySwapListings();
    } catch (error) {
      console.error('Error updating availability:', error);
      Alert.alert('Error', 'Failed to update availability.');
    }
  };

  const handleCancelSwapRequest = async (requestId: string) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this swap request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'swapRequests', requestId), {
                status: 'cancelled',
                updatedAt: Timestamp.now()
              });
              Alert.alert('Success', 'Swap request cancelled.');
              loadSwapRequests();
            } catch (error) {
              console.error('Error cancelling request:', error);
              Alert.alert('Error', 'Failed to cancel request.');
            }
          }
        }
      ]
    );
  };

  const handleAcceptSwapRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'swapRequests', requestId), {
        status: 'accepted',
        updatedAt: Timestamp.now()
      });
      Alert.alert('Success', 'Swap request accepted!');
      loadSwapRequests();
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Failed to accept request.');
    }
  };

  const handleRejectSwapRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'swapRequests', requestId), {
        status: 'rejected',
        updatedAt: Timestamp.now()
      });
      Alert.alert('Success', 'Swap request rejected.');
      loadSwapRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject request.');
    }
  };

  const handleSwapRequest = (listing: Listing) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to request swaps');
      return;
    }

    if (mySwapListings.length === 0) {
      Alert.alert(
        'No Swap Items',
        'You need to have items listed for swap to make a trade request. Would you like to list an item for swap?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'List Item', onPress: () => {/* Navigate to create listing */} },
        ]
      );
      return;
    }

    setSelectedListing(listing);
    setShowSwapModal(true);
  };

  const handleSubmitSwapRequest = async () => {
    if (!user || !selectedListing || !selectedMyListing) {
      Alert.alert('Error', 'Please select an item to swap');
      return;
    }

    try {
      const swapRequestData: Omit<SwapRequest, 'id'> = {
        fromUserId: user.uid,
        toUserId: selectedListing.sellerId,
        fromListingId: selectedMyListing.id,
        toListingId: selectedListing.id,
        fromListingTitle: selectedMyListing.title,
        toListingTitle: selectedListing.title,
        status: 'pending',
        message: swapMessage.trim(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'swapRequests'), swapRequestData);

      Alert.alert('Swap Request Sent', 'Your swap request has been sent successfully!');
      setShowSwapModal(false);
      setSelectedListing(null);
      setSelectedMyListing(null);
      setSwapMessage('');
      
      // Reload swap requests
      loadSwapRequests();
    } catch (error) {
      console.error('Error submitting swap request:', error);
      Alert.alert('Error', 'Failed to send swap request. Please try again.');
    }
  };

  const renderSwapListing = ({ item }: { item: Listing }) => (
    <TouchableOpacity 
      style={styles.listingCard}
      onPress={() => handleListingPress(item)}
    >
      <Image
        source={{
          uri: item.imageBase64
            ? `data:image/jpeg;base64,${item.imageBase64}`
            : item.imageUrl || 'https://placehold.co/150x150.png?text=No+Image'
        }}
        style={styles.listingImage}
        resizeMode="cover"
      />
      <View style={styles.listingContent}>
        <Text style={styles.listingTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.listingDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        {/* Enhanced property and location information */}
        {item.propertyType && (
          <View style={styles.propertyTypeContainer}>
            <Ionicons 
              name={item.propertyType === 'House' ? 'home-outline' : 
                   item.propertyType === 'Car' ? 'car-outline' : 'cube-outline'} 
              size={12} 
              color="#8B4513" 
            />
            <Text style={styles.propertyType}>{item.propertyType}</Text>
          </View>
        )}
        
        {/* Location information */}
        {item.location && item.location.city && (
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={12} color="#8B7355" />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location.city}
            </Text>
          </View>
        )}
        
        {/* Swap value */}
        {item.swapValue && (
          <View style={styles.valueContainer}>
            <Text style={styles.swapValue}>
              Est. Value: K{item.swapValue.toFixed(2)}
            </Text>
          </View>
        )}
        
        {/* Swap preferences preview */}
        {item.swapPreferences && item.swapPreferences.length > 0 && (
          <View style={styles.preferencesContainer}>
            <Text style={styles.preferencesLabel}>Looking for:</Text>
            <Text style={styles.preferencesText} numberOfLines={1}>
              {item.swapPreferences.join(', ')}
            </Text>
          </View>
        )}
        
        <View style={styles.listingFooter}>
          <Text style={styles.sellerName}>by {item.sellerName}</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => initializeChat(item)}
            >
              <Ionicons name="chatbubble-outline" size={14} color="#8B4513" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.swapButton}
              onPress={() => handleSwapRequest(item)}
            >
              <Ionicons name="swap-horizontal" size={14} color="white" />
              <Text style={styles.swapButtonText}>Swap</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMySwapListing = ({ item }: { item: Listing }) => (
    <TouchableOpacity 
      style={styles.listingCard}
      onPress={() => handleListingPress(item)}
    >
      <Image
        source={{
          uri: item.imageBase64
            ? `data:image/jpeg;base64,${item.imageBase64}`
            : item.imageUrl || 'https://placehold.co/150x150.png?text=No+Image'
        }}
        style={styles.listingImage}
        resizeMode="cover"
      />
      <View style={styles.listingContent}>
        <Text style={styles.listingTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.listingDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        {/* Enhanced information for my swap listings */}
        {item.propertyType && (
          <View style={styles.propertyTypeContainer}>
            <Ionicons 
              name={item.propertyType === 'House' ? 'home-outline' : 
                   item.propertyType === 'Car' ? 'car-outline' : 'cube-outline'} 
              size={12} 
              color="#8B4513" 
            />
            <Text style={styles.propertyType}>{item.propertyType}</Text>
          </View>
        )}
        
        {/* Location for my listings */}
        {item.location && item.location.address && (
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={12} color="#8B7355" />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location.address}
            </Text>
          </View>
        )}
        
        {/* Swap value and preferences */}
        {item.swapValue && (
          <View style={styles.valueContainer}>
            <Text style={styles.swapValue}>
              Est. Value: K{item.swapValue.toFixed(2)}
            </Text>
          </View>
        )}
        
        {/* Views and status */}
        <View style={styles.statsContainer}>
          <Ionicons name="eye-outline" size={12} color="#8B7355" />
          <Text style={styles.viewsText}>{item.views || 0} views</Text>
          {item.isActive === false && (
            <Text style={styles.inactiveText}>• Inactive</Text>
          )}
        </View>
        
        <View style={styles.listingFooter}>
          <Text style={styles.listingDate}>
            Posted {(() => {
              try {
                if (item.postedDate) {
                  const date = new Date(item.postedDate);
                  return !isNaN(date.getTime()) ? date.toLocaleDateString() : 'Unknown date';
                }
                return 'Unknown date';
              } catch {
                return 'Unknown date';
              }
            })()}
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditListing(item)}
            >
              <Ionicons name="create-outline" size={14} color="#8B4513" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteListing(item.id)}
            >
              <Ionicons name="trash-outline" size={14} color="#E74C3C" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSwapRequest = ({ item }: { item: SwapRequest }) => {
    const isIncoming = item.toUserId === user?.uid;
    
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <Text style={styles.requestType}>
            {isIncoming ? 'Incoming Request' : 'Outgoing Request'}
          </Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) }
          ]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        
        <View style={styles.swapDetails}>
          <View style={styles.swapItem}>
            <Text style={styles.swapItemTitle}>
              {isIncoming ? 'They want:' : 'You offered:'}
            </Text>
            <Text style={styles.swapItemName}>
              {isIncoming ? item.toListingTitle : item.fromListingTitle}
            </Text>
          </View>
          
          <Ionicons name="swap-horizontal" size={24} color="#007AFF" />
          
          <View style={styles.swapItem}>
            <Text style={styles.swapItemTitle}>
              {isIncoming ? 'They offered:' : 'You want:'}
            </Text>
            <Text style={styles.swapItemName}>
              {isIncoming ? item.fromListingTitle : item.toListingTitle}
            </Text>
          </View>
        </View>
        
        {item.message && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Message:</Text>
            <Text style={styles.messageText}>{item.message}</Text>
          </View>
        )}
        
        <Text style={styles.requestDate}>
          {(() => {
            try {
              if (item.createdAt) {
                const date = new Date(item.createdAt);
                return !isNaN(date.getTime()) ? date.toLocaleDateString() : 'Unknown date';
              }
              return 'Unknown date';
            } catch {
              return 'Unknown date';
            }
          })()}
        </Text>
        
        {/* Action buttons for incoming requests */}
        {isIncoming && item.status === 'pending' && (
          <View style={styles.requestActions}>
            <TouchableOpacity 
              style={styles.rejectButton}
              onPress={() => handleRejectSwapRequest(item.id!)}
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.acceptButton}
              onPress={() => handleAcceptSwapRequest(item.id!)}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Cancel button for outgoing requests */}
        {!isIncoming && ['pending', 'accepted'].includes(item.status) && (
          <View style={styles.requestActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => handleCancelSwapRequest(item.id!)}
            >
              <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'accepted': return '#27AE60';
      case 'rejected': return '#E74C3C';
      case 'completed': return '#007AFF';
      default: return '#666';
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'browse':
        return (
          <FlatList
            key={`swap-${activeTab}-list`}
            data={swapListings}
            renderItem={renderSwapListing}
            keyExtractor={(item) => item.id || Math.random().toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
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
                  <Text style={styles.loadingText}>Loading swap items...</Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="swap-horizontal-outline" size={64} color="#D2B48C" />
                  <Text style={styles.emptyTitle}>No swap items available</Text>
                  <Text style={styles.emptyText}>
                    Items available for swap will appear here
                  </Text>
                </View>
              )
            }
          />
        );
        
      case 'my_swaps':
        return (
          <FlatList
            key={`swap-${activeTab}-list`}
            data={mySwapListings}
            renderItem={renderMySwapListing}
            keyExtractor={(item) => item.id || Math.random().toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
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
                <View style={styles.emptyState}>
                  <Ionicons name="add-circle-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyTitle}>No swap items listed</Text>
                  <Text style={styles.emptyText}>
                    List items you want to swap with others
                  </Text>
                  <TouchableOpacity style={styles.addButton}>
                    <Text style={styles.addButtonText}>List Item for Swap</Text>
                  </TouchableOpacity>
                </View>
              )
            }
          />
        );
        
      case 'requests':
        return (
          <FlatList
            key={`swap-${activeTab}-list`}
            data={swapRequests}
            renderItem={renderSwapRequest}
            keyExtractor={(item) => item.id! || Math.random().toString()}
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
                  <Text style={styles.loadingText}>Loading requests...</Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyTitle}>No swap requests</Text>
                  <Text style={styles.emptyText}>
                    Your swap requests will appear here
                  </Text>
                </View>
              )
            }
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Swap Items</Text>
        <TouchableOpacity 
          style={styles.addItemButton}
          onPress={() => {
            if (!user) {
              Alert.alert('Login Required', 'Please login to list items for swap');
              return;
            }
            (navigation as any).navigate('AddRentalSwapListing', { listingType: 'swap' });
          }}
        >
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' && styles.activeTab, !user && styles.singleTab]}
          onPress={() => setActiveTab('browse')}
        >
          <Text style={[styles.tabText, activeTab === 'browse' && styles.activeTabText]}>
            Browse
          </Text>
        </TouchableOpacity>
        
        {user && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'my_swaps' && styles.activeTab]}
            onPress={() => setActiveTab('my_swaps')}
          >
            <Text style={[styles.tabText, activeTab === 'my_swaps' && styles.activeTabText]}>
              My Items
            </Text>
          </TouchableOpacity>
        )}
        
        {user && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              Requests
            </Text>
            {swapRequests.filter(r => r.toUserId === user?.uid && r.status === 'pending').length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>
                  {String(swapRequests.filter(r => r.toUserId === user?.uid && r.status === 'pending').length)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {renderTabContent()}

      {/* Swap Request Modal */}
      <Modal
        visible={showSwapModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSwapModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Request Swap</Text>
            <TouchableOpacity
              onPress={handleSubmitSwapRequest}
              disabled={!selectedMyListing}
            >
              <Text style={[
                styles.modalSubmit,
                !selectedMyListing && styles.disabledText
              ]}>
                Send
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedListing && (
              <View style={styles.selectedItemContainer}>
                <Text style={styles.sectionTitle}>Item you want:</Text>
                <View style={styles.selectedItem}>
                  <Image
                    source={{
                      uri: selectedListing.imageBase64
                        ? `data:image/jpeg;base64,${selectedListing.imageBase64}`
                        : selectedListing.imageUrl || 'https://placehold.co/60x60.png?text=No+Image'
                    }}
                    style={styles.selectedItemImage}
                  />
                  <Text style={styles.selectedItemTitle}>{selectedListing.title}</Text>
                </View>
              </View>
            )}

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Select your item to offer:</Text>
              <FlatList
                key="swap-modal-my-items"
                data={mySwapListings}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.selectableItem,
                      selectedMyListing?.id === item.id && styles.selectedSelectableItem
                    ]}
                    onPress={() => setSelectedMyListing(item)}
                  >
                    <Image
                      source={{
                        uri: item.imageBase64
                          ? `data:image/jpeg;base64,${item.imageBase64}`
                          : item.imageUrl || 'https://placehold.co/50x50.png?text=No+Image'
                      }}
                      style={styles.selectableItemImage}
                    />
                    <Text style={styles.selectableItemTitle}>{item.title}</Text>
                    {selectedMyListing?.id === item.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id || Math.random().toString()}
                scrollEnabled={false}
              />
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Message (optional):</Text>
              <TextInput
                style={styles.messageInput}
                value={swapMessage}
                onChangeText={setSwapMessage}
                placeholder="Add a message to your swap request..."
                multiline
                numberOfLines={4}
                placeholderTextColor="#999"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F3F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D1810',
  },
  addItemButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#8B4513',
  },
  tabText: {
    fontSize: 16,
    color: '#8B7355',
  },
  activeTabText: {
    color: '#8B4513',
    fontWeight: '600',
  },
  singleTab: {
    flex: 1,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: '30%',
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  listingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 4,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    flex: 0.48,
  },
  listingImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#F5F1ED',
  },
  listingContent: {
    padding: 12,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 4,
    lineHeight: 18,
  },
  listingDescription: {
    fontSize: 12,
    color: '#8B7355',
    marginBottom: 8,
    lineHeight: 16,
  },
  listingFooter: {
    marginTop: 4,
  },
  sellerName: {
    fontSize: 11,
    color: '#8B7355',
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatButton: {
    backgroundColor: '#F5F1ED',
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E8E2DD',
  },
  swapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B4513',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  swapButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  editButton: {
    backgroundColor: '#E8E2DD',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  deleteButton: {
    backgroundColor: '#FFE5E5',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cancelButton: {
    backgroundColor: '#E74C3C',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 1,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  listingDate: {
    fontSize: 12,
    color: '#666',
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  swapDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  swapItem: {
    flex: 1,
    alignItems: 'center',
  },
  swapItemTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  swapItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  messageContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  messageLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
  },
  requestDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rejectButton: {
    flex: 0.48,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#E74C3C',
    fontSize: 14,
    fontWeight: '500',
  },
  acceptButton: {
    flex: 0.48,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  authRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  authRequiredTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  authRequiredText: {
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'center',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#8B4513',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalCancel: {
    color: '#007AFF',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubmit: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledText: {
    color: '#ccc',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  selectedItemContainer: {
    marginBottom: 20,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  selectedItemImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 12,
  },
  selectedItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  selectableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  selectedSelectableItem: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  selectableItemImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 12,
  },
  selectableItemTitle: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#8B7355',
    marginTop: 12,
  },
  // Enhanced styling for new features
  propertyTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  propertyType: {
    fontSize: 11,
    color: '#8B4513',
    marginLeft: 4,
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 11,
    color: '#8B7355',
    marginLeft: 4,
    flex: 1,
  },
  valueContainer: {
    marginBottom: 4,
  },
  swapValue: {
    fontSize: 11,
    color: '#8B4513',
    fontWeight: '600',
  },
  preferencesContainer: {
    marginBottom: 4,
  },
  preferencesLabel: {
    fontSize: 10,
    color: '#8B7355',
    fontWeight: '600',
  },
  preferencesText: {
    fontSize: 10,
    color: '#8B7355',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  viewsText: {
    fontSize: 11,
    color: '#8B7355',
    marginLeft: 4,
  },
  inactiveText: {
    fontSize: 11,
    color: '#EF4444',
    marginLeft: 8,
    fontWeight: '600',
  },
});

export default SwapScreen;