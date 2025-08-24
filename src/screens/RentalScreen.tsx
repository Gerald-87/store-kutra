import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../store';
import { Listing, ListingType, RentalRequest } from '../types';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

const RentalScreen: React.FC = () => {
  const [rentalListings, setRentalListings] = useState<Listing[]>([]);
  const [myRentalListings, setMyRentalListings] = useState<Listing[]>([]);
  const [rentalRequests, setRentalRequests] = useState<RentalRequest[]>([]);
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [rentalMessage, setRentalMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'browse' | 'my_rentals' | 'bookings'>('browse');

  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    loadRentalData();
  }, []);

  const loadRentalData = async () => {
    try {
      await Promise.all([
        loadRentalListings(),
        loadMyRentalListings(),
        loadRentalRequests(),
      ]);
    } catch (error) {
      console.error('Error loading rental data:', error);
    }
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

  const handleRentalRequest = (listing: Listing) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to book rentals');
      return;
    }

    setSelectedListing(listing);
    setShowRentalModal(true);
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        <Text style={styles.price}>K{item.price.toFixed(2)}/day</Text>
        <View style={styles.listingFooter}>
          <Text style={styles.sellerName}>by {item.sellerName}</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => {/* Navigate to chat */}}
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'browse':
        return (
          <FlatList
            data={rentalListings}
            renderItem={renderRentalListing}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={64} color="#D2B48C" />
                <Text style={styles.emptyTitle}>No rental items available</Text>
                <Text style={styles.emptyText}>Items for rent will appear here</Text>
              </View>
            }
          />
        );
      default:
        return <View style={styles.emptyState}><Text>Feature coming soon!</Text></View>;
    }
  };

  return (
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
            // Navigate to create listing screen
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
    </View>
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
});

export default RentalScreen;