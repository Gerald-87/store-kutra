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
import { Listing, ListingType, RentalRequest } from '../types';
import { collection, addDoc, query, where, getDocs, orderBy, Timestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import AuthGuard from '../components/AuthGuard';
import MapView from '../components/MapView';

const RentalScreen: React.FC = () => {
  const navigation = useNavigation();
  const [rentalListings, setRentalListings] = useState<Listing[]>([]);
  const [myRentalListings, setMyRentalListings] = useState<Listing[]>([]);
  const [rentalRequests, setRentalRequests] = useState<RentalRequest[]>([]);
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [rentalMessage, setRentalMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'browse' | 'my_rentals' | 'bookings'>('browse');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMapView, setShowMapView] = useState(false);
  const [selectedListingForMap, setSelectedListingForMap] = useState<Listing | null>(null);

  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    loadRentalData();
  }, []);

  const loadRentalData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadRentalListings(),
        loadMyRentalListings(),
        loadRentalRequests(),
      ]);
    } catch (error: any) {
      console.error('Error loading rental data:', error);
      setError('Failed to load rental data. Please try again.');
      Alert.alert('Error', 'Failed to load rental data. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRentalData();
    setRefreshing(false);
  };

  const loadRentalListings = async () => {
    try {
      const q = query(
        collection(db, 'listings'),
        where('type', '==', ListingType.RENT),
        orderBy('postedDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const listings: Listing[] = [];
      
      querySnapshot.forEach((doc) => {
        const listing = { id: doc.id, ...doc.data() } as Listing;
        if (listing.sellerId !== user?.uid) {
          listings.push(listing);
        }
      });
      
      setRentalListings(listings);
    } catch (error) {
      console.error('Error loading rental listings:', error);
    }
  };

  const loadMyRentalListings = async () => {
    if (!user) return;
    
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
      
      setMyRentalListings(listings);
    } catch (error) {
      console.error('Error loading my rental listings:', error);
    }
  };

  const loadRentalRequests = async () => {
    if (!user) return;
    
    try {
      const q1 = query(
        collection(db, 'rentalRequests'),
        where('renterId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const q2 = query(
        collection(db, 'rentalRequests'),
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const [renterSnapshot, ownerSnapshot] = await Promise.all([
        getDocs(q1),
        getDocs(q2)
      ]);
      
      const requests: RentalRequest[] = [];
      
      renterSnapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() } as RentalRequest);
      });
      
      ownerSnapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() } as RentalRequest);
      });
      
      setRentalRequests(requests);
    } catch (error) {
      console.error('Error loading rental requests:', error);
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
      'Are you sure you want to delete this rental listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'listings', listingId));
              Alert.alert('Success', 'Listing deleted successfully!');
              loadMyRentalListings();
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
    // Navigate to edit screen or show edit modal
    Alert.alert(
      'Edit Listing',
      'What would you like to update?',
      [
        {
          text: 'Update Price',
          onPress: () => handleUpdatePrice(listing)
        },
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

  const handleUpdatePrice = (listing: Listing) => {
    Alert.prompt(
      'Update Price',
      'Enter new daily rental price:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async (newPrice) => {
            if (newPrice && !isNaN(Number(newPrice))) {
              try {
                await updateDoc(doc(db, 'listings', listing.id), {
                  price: Number(newPrice),
                  updatedAt: Timestamp.now()
                });
                Alert.alert('Success', 'Price updated successfully!');
                loadMyRentalListings();
              } catch (error) {
                console.error('Error updating price:', error);
                Alert.alert('Error', 'Failed to update price.');
              }
            } else {
              Alert.alert('Error', 'Please enter a valid price.');
            }
          }
        }
      ],
      'plain-text',
      listing.price.toString()
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
                loadMyRentalListings();
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
        isActive: newStatus,
        updatedAt: Timestamp.now()
      });
      Alert.alert('Success', `Listing marked as ${newStatus ? 'active' : 'inactive'}!`);
      loadMyRentalListings();
    } catch (error) {
      console.error('Error updating availability:', error);
      Alert.alert('Error', 'Failed to update availability.');
    }
  };

  const handleCancelRentalRequest = async (requestId: string) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this rental request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'rentalRequests', requestId), {
                status: 'cancelled',
                updatedAt: Timestamp.now()
              });
              Alert.alert('Success', 'Rental request cancelled.');
              loadRentalRequests();
            } catch (error) {
              console.error('Error cancelling request:', error);
              Alert.alert('Error', 'Failed to cancel request.');
            }
          }
        }
      ]
    );
  };

  const handleAcceptRentalRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'rentalRequests', requestId), {
        status: 'approved',
        updatedAt: Timestamp.now()
      });
      Alert.alert('Success', 'Rental request approved!');
      loadRentalRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      Alert.alert('Error', 'Failed to approve request.');
    }
  };

  const handleRejectRentalRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'rentalRequests', requestId), {
        status: 'rejected',
        updatedAt: Timestamp.now()
      });
      Alert.alert('Success', 'Rental request rejected.');
      loadRentalRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject request.');
    }
  };

  const handleRentalRequest = (listing: Listing) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to book rentals');
      return;
    }

    setSelectedListing(listing);
    setShowRentalModal(true);
  };

  const getRequestStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'approved':
        return '#27AE60';
      case 'rejected':
        return '#E74C3C';
      case 'cancelled':
        return '#95A5A6';
      default:
        return '#95A5A6';
    }
  };

  const calculateRentalCost = () => {
    if (!selectedListing) return 0;
    
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return selectedListing.price * Math.max(1, days);
  };

  const handleSubmitRentalRequest = async () => {
    if (!user || !selectedListing) return;

    if (startDate >= endDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    try {
      const totalCost = calculateRentalCost();
      
      const rentalRequestData: Omit<RentalRequest, 'id'> = {
        listingId: selectedListing.id,
        renterId: user.uid,
        ownerId: selectedListing.sellerId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalCost,
        status: 'pending',
        message: rentalMessage.trim(),
        terms: `Rental period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}. Total cost: K${totalCost.toFixed(2)}`,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'rentalRequests'), rentalRequestData);

      Alert.alert('Rental Request Sent', 'Your rental request has been sent successfully!');
      setShowRentalModal(false);
      setSelectedListing(null);
      setRentalMessage('');
      
      loadRentalRequests();
    } catch (error) {
      console.error('Error submitting rental request:', error);
      Alert.alert('Error', 'Failed to send rental request. Please try again.');
    }
  };

  const renderRentalListing = ({ item }: { item: Listing }) => (
    <TouchableOpacity style={styles.listingCard}>
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
        
        {/* Enhanced property information */}
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
        {item.location && (
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={12} color="#8B7355" />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location.city}
            </Text>
            <TouchableOpacity 
              style={styles.mapButton}
              onPress={() => {
                setSelectedListingForMap(item);
                setShowMapView(true);
              }}
            >
              <Ionicons name="map-outline" size={10} color="#8B4513" />
            </TouchableOpacity>
          </View>
        )}
        
        <Text style={styles.price}>
          K{item.price.toFixed(2)}/{item.rentalPeriod || 'day'}
        </Text>
        
        {/* Contact info preview */}
        {item.contactInfo?.preferredContactMethod && (
          <View style={styles.contactPreview}>
            <Ionicons 
              name={item.contactInfo.preferredContactMethod === 'phone' ? 'call-outline' : 
                   item.contactInfo.preferredContactMethod === 'whatsapp' ? 'logo-whatsapp' : 
                   'chatbubble-outline'} 
              size={10} 
              color="#8B7355" 
            />
            <Text style={styles.contactMethod}>
              {item.contactInfo.preferredContactMethod}
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
              style={styles.rentButton}
              onPress={() => handleRentalRequest(item)}
            >
              <Ionicons name="calendar" size={14} color="white" />
              <Text style={styles.rentButtonText}>Book</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMyRentalListing = ({ item }: { item: Listing }) => (
    <TouchableOpacity style={styles.listingCard}>
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
        
        {/* Enhanced property information for my listings */}
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
        {item.location && (
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={12} color="#8B7355" />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location.address}
            </Text>
            <TouchableOpacity 
              style={styles.mapButton}
              onPress={() => {
                setSelectedListingForMap(item);
                setShowMapView(true);
              }}
            >
              <Ionicons name="map-outline" size={10} color="#8B4513" />
            </TouchableOpacity>
          </View>
        )}
        
        <Text style={styles.price}>
          K{item.price.toFixed(2)}/{item.rentalPeriod || 'day'}
        </Text>
        
        {/* Views counter */}
        <View style={styles.statsContainer}>
          <Ionicons name="eye-outline" size={12} color="#8B7355" />
          <Text style={styles.viewsText}>{item.views || 0} views</Text>
          {item.isActive === false && (
            <Text style={styles.inactiveText}>• Inactive</Text>
          )}
        </View>
        
        <View style={styles.listingFooter}>
          <Text style={styles.listingDate}>
            Posted {new Date(item.postedDate).toLocaleDateString()}
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'browse':
        return (
          <FlatList
            key={`rental-${activeTab}-list`}
            data={rentalListings}
            renderItem={renderRentalListing}
            keyExtractor={(item) => item.id}
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
                  <Text style={styles.loadingText}>Loading rental items...</Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={64} color="#D2B48C" />
                  <Text style={styles.emptyTitle}>No rental items available</Text>
                  <Text style={styles.emptyText}>Items for rent will appear here</Text>
                </View>
              )
            }
          />
        );
        
      case 'my_rentals':
        return (
          <FlatList
            key={`rental-${activeTab}-list`}
            data={myRentalListings}
            renderItem={renderMyRentalListing}
            keyExtractor={(item) => item.id}
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
                  <Text style={styles.loadingText}>Loading your rentals...</Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="add-circle-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyTitle}>No rental items listed</Text>
                  <Text style={styles.emptyText}>
                    List items you want to rent out
                  </Text>
                </View>
              )
            }
          />
        );
        
      case 'bookings':
        return (
          <FlatList
            key={`rental-${activeTab}-list`}
            data={rentalRequests}
            renderItem={({ item }) => {
              const isIncoming = item.ownerId === user?.uid;
              const canManage = isIncoming && item.status === 'pending';
              const canCancel = item.renterId === user?.uid && ['pending', 'approved'].includes(item.status);
              
              return (
                <View style={styles.bookingCard}>
                  <View style={styles.requestHeader}>
                    <Text style={styles.bookingTitle}>
                      {isIncoming ? 'Incoming Request' : 'Your Request'}
                    </Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getRequestStatusColor(item.status) }
                    ]}>
                      <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.bookingCost}>
                    Cost: K{item.totalCost?.toFixed(2) || '0.00'}
                  </Text>
                  <Text style={styles.bookingDate}>
                    {item.startDate && item.endDate 
                      ? `${new Date(item.startDate).toLocaleDateString()} - ${new Date(item.endDate).toLocaleDateString()}`
                      : 'Date TBD'
                    }
                  </Text>
                  {item.message && (
                    <Text style={styles.requestMessage}>
                      Message: {item.message}
                    </Text>
                  )}
                  
                  {/* Action buttons for incoming requests */}
                  {canManage && (
                    <View style={styles.requestActions}>
                      <TouchableOpacity 
                        style={styles.rejectButton}
                        onPress={() => handleRejectRentalRequest(item.id!)}
                      >
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.acceptButton}
                        onPress={() => handleAcceptRentalRequest(item.id!)}
                      >
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  {/* Cancel button for outgoing requests */}
                  {canCancel && (
                    <View style={styles.requestActions}>
                      <TouchableOpacity 
                        style={styles.cancelButton}
                        onPress={() => handleCancelRentalRequest(item.id!)}
                      >
                        <Text style={styles.cancelButtonText}>Cancel Request</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }}
            keyExtractor={(item) => item.id!}
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
                  <Text style={styles.loadingText}>Loading bookings...</Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyTitle}>No bookings</Text>
                  <Text style={styles.emptyText}>
                    Your rental bookings will appear here
                  </Text>
                </View>
              )
            }
          />
        );
        
      default:
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Feature coming soon!</Text>
          </View>
        );
    }
  };

  return (
    <AuthGuard
      fallbackTitle="Access Your Rentals"
      fallbackMessage="Sign in to view and manage your rental items, bookings, and rental requests"
      fallbackIcon="calendar-outline"
      showBackButton={false}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Rentals</Text>
          <TouchableOpacity 
            style={styles.addItemButton}
            onPress={() => {
              if (!user) {
                Alert.alert('Login Required', 'Please login to list items for rent');
                return;
              }
              (navigation as any).navigate('AddRentalSwapListing', { listingType: 'rent' });
            }}
          >
            <Ionicons name="add" size={24} color="#8B4513" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'browse' && styles.activeTab]}
            onPress={() => setActiveTab('browse')}
          >
            <Text style={[styles.tabText, activeTab === 'browse' && styles.activeTabText]}>
              Browse
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'my_rentals' && styles.activeTab]}
            onPress={() => setActiveTab('my_rentals')}
          >
            <Text style={[styles.tabText, activeTab === 'my_rentals' && styles.activeTabText]}>
              My Rentals
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'bookings' && styles.activeTab]}
            onPress={() => setActiveTab('bookings')}
          >
            <Text style={[styles.tabText, activeTab === 'bookings' && styles.activeTabText]}>
              Bookings
            </Text>
          </TouchableOpacity>
        </View>

        {renderTabContent()}

        <Modal
          visible={showRentalModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowRentalModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Book Rental</Text>
              <TouchableOpacity onPress={handleSubmitRentalRequest}>
                <Text style={styles.modalSubmit}>Book</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {selectedListing && (
                <View style={styles.selectedItemContainer}>
                  <Text style={styles.sectionTitle}>Item to rent:</Text>
                  <View style={styles.selectedItem}>
                    <Image
                      source={{
                        uri: selectedListing.imageBase64
                          ? `data:image/jpeg;base64,${selectedListing.imageBase64}`
                          : selectedListing.imageUrl || 'https://placehold.co/60x60.png?text=No+Image'
                      }}
                      style={styles.selectedItemImage}
                    />
                    <View>
                      <Text style={styles.selectedItemTitle}>{selectedListing.title}</Text>
                      <Text style={styles.selectedItemPrice}>K{selectedListing.price.toFixed(2)}/day</Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.costSummary}>
                <Text style={styles.sectionTitle}>Cost Summary</Text>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>
                    Duration: {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days
                  </Text>
                </View>
                <View style={styles.totalCostRow}>
                  <Text style={styles.totalCostLabel}>Total Cost:</Text>
                  <Text style={styles.totalCostValue}>
                    K{calculateRentalCost().toFixed(2)}
                  </Text>
                </View>
              </View>

              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Message (optional):</Text>
                <TextInput
                  style={styles.messageInput}
                  value={rentalMessage}
                  onChangeText={setRentalMessage}
                  placeholder="Add a message..."
                  multiline
                  numberOfLines={4}
                  placeholderTextColor="#999"
                />
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Map View Modal */}
        {selectedListingForMap?.location && (
          <MapView
            visible={showMapView}
            onClose={() => setShowMapView(false)}
            location={selectedListingForMap.location}
            title={selectedListingForMap.title}
            propertyType={selectedListingForMap.propertyType}
            showDirections={true}
          />
        )}
      </View>
    </AuthGuard>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F7F3F0' 
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
    color: '#2D1810' 
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
    alignItems: 'center' 
  },
  activeTab: { 
    borderBottomWidth: 2, 
    borderBottomColor: '#8B4513' 
  },
  tabText: { 
    fontSize: 16, 
    color: '#8B7355' 
  },
  activeTabText: { 
    color: '#8B4513', 
    fontWeight: '600' 
  },
  listContainer: { 
    paddingHorizontal: 12, 
    paddingVertical: 8 
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
    marginBottom: 6,
    lineHeight: 16,
  },
  price: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#8B4513', 
    marginBottom: 6 
  },
  listingFooter: { 
    marginTop: 4,
  },
  sellerName: { 
    fontSize: 11, 
    color: '#8B7355', 
    marginBottom: 6,
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
  rentButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#8B4513', 
    borderRadius: 6, 
    paddingHorizontal: 8, 
    paddingVertical: 4 
  },
  rentButtonText: { 
    color: 'white', 
    fontSize: 11, 
    fontWeight: '600', 
    marginLeft: 4 
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
  listingDate: {
    fontSize: 12,
    color: '#8B7355',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  requestMessage: {
    fontSize: 12,
    color: '#8B7355',
    fontStyle: 'italic',
    marginTop: 4,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  acceptButton: {
    backgroundColor: '#27AE60',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 1,
    marginLeft: 4,
  },
  rejectButton: {
    backgroundColor: '#E74C3C',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 1,
    marginRight: 4,
  },
  cancelButton: {
    backgroundColor: '#E74C3C',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 1,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyState: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 60 
  },
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#2D1810', 
    marginTop: 16, 
    marginBottom: 8 
  },
  emptyText: { 
    fontSize: 14, 
    color: '#8B7355', 
    textAlign: 'center' 
  },
  modalContainer: { flex: 1, backgroundColor: 'white' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalCancel: { color: '#007AFF', fontSize: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalSubmit: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  modalContent: { flex: 1, paddingHorizontal: 20 },
  selectedItemContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  selectedItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12 },
  selectedItemImage: { width: 60, height: 60, borderRadius: 6, marginRight: 12 },
  selectedItemTitle: { fontSize: 16, fontWeight: '500', color: '#333' },
  selectedItemPrice: { fontSize: 14, color: '#007AFF', fontWeight: '600' },
  costSummary: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 16, marginBottom: 20 },
  costRow: { marginBottom: 8 },
  costLabel: { fontSize: 16, color: '#333' },
  totalCostRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 12, marginTop: 8 },
  totalCostLabel: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  totalCostValue: { fontSize: 18, fontWeight: 'bold', color: '#007AFF' },
  sectionContainer: { marginBottom: 20 },
  messageInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, color: '#333', textAlignVertical: 'top', minHeight: 80 },
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
  mapButton: {
    padding: 2,
    borderRadius: 4,
    backgroundColor: '#F7F3F0',
  },
  contactPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactMethod: {
    fontSize: 10,
    color: '#8B7355',
    marginLeft: 4,
    textTransform: 'capitalize',
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
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 8,
  },
  bookingStatus: {
    fontSize: 14,
    color: '#8B4513',
    marginBottom: 4,
  },
  bookingCost: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1810',
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: 12,
    color: '#8B7355',
  },
});

export default RentalScreen;