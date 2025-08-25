import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import LocationService, { LocationData } from '../services/LocationService';

interface Address {
  id: string;
  label: string;
  fullAddress: string;
  city: string;
  phone: string;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
}

const AddressScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth) as any;
  
  const [addresses, setAddresses] = useState<Address[]>([
    {
      id: '1',
      label: 'Home',
      fullAddress: '123 Main Street, Apartment 4B',
      city: 'Lusaka',
      phone: '+260 97 123 4567',
      isDefault: true,
    },
    {
      id: '2',
      label: 'University',
      fullAddress: 'University of Zambia, Student Hostel Block A',
      city: 'Lusaka',
      phone: '+260 97 123 4567',
      isDefault: false,
    },
  ]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [newAddress, setNewAddress] = useState({
    label: '',
    fullAddress: '',
    city: '',
    phone: '',
  });
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const handleAddAddress = () => {
    setEditingAddress(null);
    setNewAddress({
      label: '',
      fullAddress: '',
      city: '',
      phone: user?.phone || '',
    });
    setShowAddModal(true);
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setNewAddress({
      label: address.label,
      fullAddress: address.fullAddress,
      city: address.city,
      phone: address.phone,
    });
    setShowAddModal(true);
  };

  const handleSaveAddress = () => {
    if (!newAddress.label.trim() || !newAddress.fullAddress.trim() || !newAddress.city.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (editingAddress) {
      // Update existing address
      setAddresses(addresses.map(addr => 
        addr.id === editingAddress.id 
          ? { ...addr, ...newAddress }
          : addr
      ));
    } else {
      // Add new address
      const newAddr: Address = {
        id: Date.now().toString(),
        ...newAddress,
        isDefault: addresses.length === 0,
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
      };
      setAddresses([...addresses, newAddr]);
    }
    
    setShowAddModal(false);
    setCurrentLocation(null);
  };

  const handleDeleteAddress = (addressId: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const addressToDelete = addresses.find(addr => addr.id === addressId);
            let updatedAddresses = addresses.filter(addr => addr.id !== addressId);
            
            // If deleted address was default and there are other addresses, make the first one default
            if (addressToDelete?.isDefault && updatedAddresses.length > 0) {
              updatedAddresses[0].isDefault = true;
            }
            
            setAddresses(updatedAddresses);
          },
        },
      ]
    );
  };

  const handleSetDefault = (addressId: string) => {
    setAddresses(addresses.map(addr => ({
      ...addr,
      isDefault: addr.id === addressId,
    })));
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const location = await LocationService.getCurrentLocationWithAddress();
      if (location) {
        setCurrentLocation(location);
        setNewAddress(prev => ({
          ...prev,
          fullAddress: location.address || prev.fullAddress,
          city: location.city || prev.city,
        }));
        Alert.alert('Success', 'Location filled automatically!');
      } else {
        Alert.alert('Error', 'Could not get your current location.');
      }
    } catch (error) {
      console.error('Error using current location:', error);
      Alert.alert('Error', 'Unable to get your location.');
    } finally {
      setLocationLoading(false);
    }
  };

  const renderAddressItem = (address: Address) => (
    <View key={address.id} style={styles.addressCard}>
      <View style={styles.addressHeader}>
        <View style={styles.addressLabelContainer}>
          <Text style={styles.addressLabel}>{address.label}</Text>
          {address.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
        </View>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => handleEditAddress(address)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#8B7355" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.addressDetails}>
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={16} color="#8B7355" />
          <Text style={styles.addressText}>{address.fullAddress}</Text>
        </View>
        <View style={styles.addressRow}>
          <Ionicons name="business-outline" size={16} color="#8B7355" />
          <Text style={styles.addressText}>{address.city}</Text>
        </View>
        <View style={styles.addressRow}>
          <Ionicons name="call-outline" size={16} color="#8B7355" />
          <Text style={styles.addressText}>{address.phone}</Text>
        </View>
      </View>
      
      <View style={styles.addressActions}>
        {!address.isDefault && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleSetDefault(address.id)}
          >
            <Text style={styles.actionButtonText}>Set as Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteAddress(address.id)}
        >
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAddModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowAddModal(false)}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {editingAddress ? 'Edit Address' : 'Add Address'}
          </Text>
          <TouchableOpacity onPress={handleSaveAddress}>
            <Text style={styles.modalSaveText}>Save</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Label *</Text>
            <TextInput
              style={styles.textInput}
              value={newAddress.label}
              onChangeText={(text) => setNewAddress(prev => ({ ...prev, label: text }))}
              placeholder="e.g. Home, Office, University"
              placeholderTextColor="#8B7355"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <View style={styles.inputHeaderWithButton}>
              <Text style={styles.inputLabel}>Full Address *</Text>
              <TouchableOpacity 
                style={styles.locationButton}
                onPress={handleUseCurrentLocation}
                disabled={locationLoading}
              >
                <Ionicons 
                  name={locationLoading ? "refresh" : "location"} 
                  size={16} 
                  color="#8B4513" 
                />
                <Text style={styles.locationButtonText}>
                  {locationLoading ? 'Getting...' : 'Use Current'}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={newAddress.fullAddress}
              onChangeText={(text) => setNewAddress(prev => ({ ...prev, fullAddress: text }))}
              placeholder="Enter full address with street, apartment/house number"
              placeholderTextColor="#8B7355"
              multiline
              numberOfLines={3}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>City *</Text>
            <TextInput
              style={styles.textInput}
              value={newAddress.city}
              onChangeText={(text) => setNewAddress(prev => ({ ...prev, city: text }))}
              placeholder="e.g. Lusaka, Kitwe, Ndola"
              placeholderTextColor="#8B7355"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.textInput}
              value={newAddress.phone}
              onChangeText={(text) => setNewAddress(prev => ({ ...prev, phone: text }))}
              placeholder="Contact phone number"
              keyboardType="phone-pad"
              placeholderTextColor="#8B7355"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
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
        <Text style={styles.headerTitle}>Delivery Addresses</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddAddress}
        >
          <Ionicons name="add" size={24} color="#8B4513" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={64} color="#D2B48C" />
            <Text style={styles.emptyTitle}>No Addresses</Text>
            <Text style={styles.emptyText}>
              Add your delivery addresses to make checkout faster
            </Text>
            <TouchableOpacity style={styles.emptyAddButton} onPress={handleAddAddress}>
              <Text style={styles.emptyAddButtonText}>Add First Address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Saved Addresses</Text>
              <Text style={styles.sectionSubtitle}>
                Manage your delivery addresses for faster checkout
              </Text>
            </View>
            
            {addresses.map(renderAddressItem)}
          </>
        )}
      </ScrollView>
      
      {renderAddModal()}
    </SafeAreaView>
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
  addButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8B7355',
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E2DD',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
    marginRight: 8,
  },
  defaultBadge: {
    backgroundColor: '#8B4513',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  menuButton: {
    padding: 4,
  },
  addressDetails: {
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  addressText: {
    fontSize: 14,
    color: '#2D1810',
    marginLeft: 8,
    flex: 1,
  },
  addressActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '500',
  },
  deleteButton: {
    borderColor: '#DC2626',
  },
  deleteButtonText: {
    color: '#DC2626',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
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
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyAddButton: {
    backgroundColor: '#8B4513',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyAddButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F7F3F0',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#8B7355',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
  },
  modalSaveText: {
    fontSize: 16,
    color: '#8B4513',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputHeaderWithButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1810',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E8E2DD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2D1810',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  locationButtonText: {
    fontSize: 14,
    color: '#8B4513',
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default AddressScreen;