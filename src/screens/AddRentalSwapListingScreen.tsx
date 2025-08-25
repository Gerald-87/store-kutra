import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
  Modal,
  FlatList,
  Switch,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { 
  ListingCategory, 
  ListingType, 
  PropertyType, 
  LocationInfo, 
  ContactInfo, 
  HouseDetails, 
  CarDetails,
  Listing
} from '../types';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import LocationService from '../services/LocationService';
import LocationPicker from '../components/LocationPicker';

interface ListingForm {
  title: string;
  description: string;
  price: string;
  category: ListingCategory | '';
  type: ListingType;
  propertyType: PropertyType | '';
  images: string[];
  condition: string;
  // Location and contact
  location: LocationInfo | null;
  contactInfo: ContactInfo;
  // Rental specific
  rentalPeriod: 'hourly' | 'daily' | 'weekly' | 'monthly';
  minimumRentalPeriod: string;
  securityDeposit: string;
  // Swap specific
  swapPreferences: string[];
  swapValue: string;
  // Property specific
  houseDetails: HouseDetails;
  carDetails: CarDetails;
}

const AddRentalSwapListingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { listingType } = route.params as { listingType: 'rent' | 'swap' };
  
  const [loading, setLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPropertyTypeModal, setShowPropertyTypeModal] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  
  const [listingForm, setListingForm] = useState<ListingForm>({
    title: '',
    description: '',
    price: '',
    category: '',
    type: listingType === 'rent' ? ListingType.RENT : ListingType.SWAP,
    propertyType: '',
    images: [],
    condition: 'Good',
    location: null,
    contactInfo: {
      phone: '',
      whatsapp: '',
      email: '',
      preferredContactMethod: 'chat',
      availableHours: '9:00 AM - 6:00 PM',
    },
    rentalPeriod: 'daily',
    minimumRentalPeriod: '1',
    securityDeposit: '',
    swapPreferences: [],
    swapValue: '',
    houseDetails: {
      bedrooms: undefined,
      bathrooms: undefined,
      furnished: false,
      parking: false,
      garden: false,
      petFriendly: false,
      utilities: [],
      amenities: [],
    },
    carDetails: {
      make: '',
      model: '',
      year: undefined,
      color: '',
      fuelType: 'petrol',
      transmission: 'manual',
      seatingCapacity: undefined,
      features: [],
      insuranceIncluded: false,
      driverIncluded: false,
    },
  });

  const { user } = useSelector((state: RootState) => state.auth) as any;

  const categories = [
    { key: ListingCategory.ELECTRONICS, label: 'Electronics', icon: 'phone-portrait' },
    { key: ListingCategory.FURNITURE, label: 'Furniture', icon: 'bed' },
    { key: ListingCategory.CLOTHING, label: 'Clothing', icon: 'shirt' },
    { key: ListingCategory.BOOKS, label: 'Books', icon: 'library' },
    { key: ListingCategory.OTHER, label: 'Other', icon: 'ellipsis-horizontal' },
  ];

  const propertyTypes = [
    { key: PropertyType.HOUSE, label: 'House', icon: 'home' },
    { key: PropertyType.APARTMENT, label: 'Apartment', icon: 'business' },
    { key: PropertyType.ROOM, label: 'Room', icon: 'bed' },
    { key: PropertyType.CAR, label: 'Car', icon: 'car' },
    { key: PropertyType.MOTORCYCLE, label: 'Motorcycle', icon: 'bicycle' },
    { key: PropertyType.ELECTRONICS, label: 'Electronics', icon: 'phone-portrait' },
    { key: PropertyType.FURNITURE, label: 'Furniture', icon: 'cube' },
    { key: PropertyType.OTHER, label: 'Other', icon: 'ellipsis-horizontal' },
  ];

  const handleImagePicker = async () => {
    if (listingForm.images.length >= 8) {
      Alert.alert('Limit Reached', 'You can add up to 8 images');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setListingForm(prev => ({
        ...prev,
        images: [...prev.images, result.assets[0].uri],
      }));
    }
  };

  const removeImage = (index: number) => {
    setListingForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const location = await LocationService.getCurrentLocationWithAddress();
      if (location) {
        setListingForm(prev => ({
          ...prev,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address || '',
            city: location.city || '',
            country: location.country || '',
          }
        }));
        Alert.alert('Success', 'Location added successfully!');
      } else {
        Alert.alert('Error', 'Could not get your current location');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get location');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSaveListing = async () => {
    // Validation
    if (!listingForm.title.trim() || !listingForm.description.trim() || 
        !listingForm.price || !listingForm.category || !listingForm.propertyType ||
        listingForm.images.length === 0) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!listingForm.location) {
      Alert.alert('Error', 'Location is required for rentals and swaps');
      return;
    }

    setLoading(true);
    try {
      const listingData: Omit<Listing, 'id'> = {
        title: listingForm.title.trim(),
        description: listingForm.description.trim(),
        price: parseFloat(listingForm.price),
        category: listingForm.category as ListingCategory,
        type: listingForm.type,
        propertyType: listingForm.propertyType as PropertyType,
        imageUrl: listingForm.images[0],
        imageBase64: listingForm.images[0],
        additionalImages: listingForm.images.slice(1),
        condition: listingForm.condition as any,
        sellerId: user?.uid || '',
        sellerName: user?.name || 'User',
        postedDate: new Date().toISOString(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        location: listingForm.location,
        contactInfo: listingForm.contactInfo,
        isActive: true,
        views: 0,
        // Rental specific fields
        ...(listingForm.type === ListingType.RENT && {
          rentalPeriod: listingForm.rentalPeriod,
          minimumRentalPeriod: parseInt(listingForm.minimumRentalPeriod) || 1,
          securityDeposit: parseFloat(listingForm.securityDeposit) || 0,
        }),
        // Swap specific fields
        ...(listingForm.type === ListingType.SWAP && {
          swapPreferences: listingForm.swapPreferences,
          swapValue: parseFloat(listingForm.swapValue) || 0,
        }),
        // Property specific details
        ...(listingForm.propertyType === PropertyType.HOUSE && {
          houseDetails: listingForm.houseDetails,
        }),
        ...(listingForm.propertyType === PropertyType.CAR && {
          carDetails: listingForm.carDetails,
        }),
      };

      await addDoc(collection(db, 'listings'), listingData);
      
      Alert.alert('Success', 
        `${listingForm.type === ListingType.RENT ? 'Rental' : 'Swap'} listing created successfully!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error creating listing:', error);
      Alert.alert('Error', 'Failed to create listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPropertySpecificFields = () => {
    if (listingForm.propertyType === PropertyType.HOUSE) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Details</Text>
          
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Bedrooms</Text>
              <TextInput
                style={styles.textInput}
                value={listingForm.houseDetails.bedrooms?.toString() || ''}
                onChangeText={(text) => setListingForm(prev => ({
                  ...prev,
                  houseDetails: { ...prev.houseDetails, bedrooms: parseInt(text) || undefined }
                }))}
                placeholder="0"
                keyboardType="number-pad"
              />
            </View>
            
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Bathrooms</Text>
              <TextInput
                style={styles.textInput}
                value={listingForm.houseDetails.bathrooms?.toString() || ''}
                onChangeText={(text) => setListingForm(prev => ({
                  ...prev,
                  houseDetails: { ...prev.houseDetails, bathrooms: parseInt(text) || undefined }
                }))}
                placeholder="0"
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Furnished</Text>
            <Switch
              value={listingForm.houseDetails.furnished}
              onValueChange={(value) => setListingForm(prev => ({
                ...prev,
                houseDetails: { ...prev.houseDetails, furnished: value }
              }))}
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Parking Available</Text>
            <Switch
              value={listingForm.houseDetails.parking}
              onValueChange={(value) => setListingForm(prev => ({
                ...prev,
                houseDetails: { ...prev.houseDetails, parking: value }
              }))}
            />
          </View>
        </View>
      );
    }

    if (listingForm.propertyType === PropertyType.CAR) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Details</Text>
          
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Make</Text>
              <TextInput
                style={styles.textInput}
                value={listingForm.carDetails.make || ''}
                onChangeText={(text) => setListingForm(prev => ({
                  ...prev,
                  carDetails: { ...prev.carDetails, make: text }
                }))}
                placeholder="e.g. Toyota"
              />
            </View>
            
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Model</Text>
              <TextInput
                style={styles.textInput}
                value={listingForm.carDetails.model || ''}
                onChangeText={(text) => setListingForm(prev => ({
                  ...prev,
                  carDetails: { ...prev.carDetails, model: text }
                }))}
                placeholder="e.g. Camry"
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Year</Text>
              <TextInput
                style={styles.textInput}
                value={listingForm.carDetails.year?.toString() || ''}
                onChangeText={(text) => setListingForm(prev => ({
                  ...prev,
                  carDetails: { ...prev.carDetails, year: parseInt(text) || undefined }
                }))}
                placeholder="2020"
                keyboardType="number-pad"
              />
            </View>
            
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Seating</Text>
              <TextInput
                style={styles.textInput}
                value={listingForm.carDetails.seatingCapacity?.toString() || ''}
                onChangeText={(text) => setListingForm(prev => ({
                  ...prev,
                  carDetails: { ...prev.carDetails, seatingCapacity: parseInt(text) || undefined }
                }))}
                placeholder="5"
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2D1810" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Add {listingType === 'rent' ? 'Rental' : 'Swap'} Listing
        </Text>
        <TouchableOpacity onPress={handleSaveListing} disabled={loading}>
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Images Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos *</Text>
          <Text style={styles.sectionSubtitle}>Add up to 8 photos</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {listingForm.images.map((image, index) => (
              <View key={index} style={styles.imageItem}>
                <Image source={{ uri: image }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            
            {listingForm.images.length < 8 && (
              <TouchableOpacity style={styles.addImageButton} onPress={handleImagePicker}>
                <Ionicons name="camera" size={32} color="#8B7355" />
                <Text style={styles.addImageText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.textInput}
              value={listingForm.title}
              onChangeText={(text) => setListingForm(prev => ({ ...prev, title: text }))}
              placeholder="Enter listing title"
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={listingForm.description}
              onChangeText={(text) => setListingForm(prev => ({ ...prev, description: text }))}
              placeholder="Describe your listing in detail"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {listingType === 'rent' ? 'Price per day (K) *' : 'Estimated Value (K) *'}
            </Text>
            <TextInput
              style={styles.textInput}
              value={listingForm.price}
              onChangeText={(text) => setListingForm(prev => ({ ...prev, price: text }))}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Category & Property Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category & Type</Text>
          
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={listingForm.category ? styles.selectorText : styles.placeholderText}>
              {listingForm.category ? 
                categories.find(c => c.key === listingForm.category)?.label :
                'Select Category'
              }
            </Text>
            <Ionicons name="chevron-down" size={20} color="#8B7355" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowPropertyTypeModal(true)}
          >
            <Text style={listingForm.propertyType ? styles.selectorText : styles.placeholderText}>
              {listingForm.propertyType ? 
                propertyTypes.find(p => p.key === listingForm.propertyType)?.label :
                'Select Property Type'
              }
            </Text>
            <Ionicons name="chevron-down" size={20} color="#8B7355" />
          </TouchableOpacity>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location *</Text>
          
          {listingForm.location ? (
            <View style={styles.locationDisplay}>
              <Ionicons name="location" size={20} color="#8B4513" />
              <Text style={styles.locationText}>{listingForm.location.address}</Text>
              <TouchableOpacity onPress={() => setListingForm(prev => ({ ...prev, location: null }))}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.locationButtons}>
              <TouchableOpacity style={styles.locationButton} onPress={handleUseCurrentLocation}>
                <Ionicons name={locationLoading ? "refresh" : "locate"} size={20} color="#8B4513" />
                <Text style={styles.locationButtonText}>
                  {locationLoading ? 'Getting location...' : 'Current Location'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.locationButton, styles.searchLocationButton]} 
                onPress={() => setShowLocationPicker(true)}
              >
                <Ionicons name="search" size={20} color="#8B4513" />
                <Text style={styles.locationButtonText}>Search Location</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Property Specific Fields */}
        {renderPropertySpecificFields()}

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.textInput}
              value={listingForm.contactInfo.phone}
              onChangeText={(text) => setListingForm(prev => ({
                ...prev,
                contactInfo: { ...prev.contactInfo, phone: text }
              }))}
              placeholder="+260 97 123 4567"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>WhatsApp (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={listingForm.contactInfo.whatsapp}
              onChangeText={(text) => setListingForm(prev => ({
                ...prev,
                contactInfo: { ...prev.contactInfo, whatsapp: text }
              }))}
              placeholder="+260 97 123 4567"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Available Hours</Text>
            <TextInput
              style={styles.textInput}
              value={listingForm.contactInfo.availableHours}
              onChangeText={(text) => setListingForm(prev => ({
                ...prev,
                contactInfo: { ...prev.contactInfo, availableHours: text }
              }))}
              placeholder="9:00 AM - 6:00 PM"
            />
          </View>
        </View>
      </ScrollView>

      {/* Category Modal */}
      <Modal visible={showCategoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <FlatList
              data={categories}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    setListingForm(prev => ({ ...prev, category: item.key }));
                    setShowCategoryModal(false);
                  }}
                >
                  <Ionicons name={item.icon as any} size={24} color="#8B4513" />
                  <Text style={styles.modalOptionText}>{item.label}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.key}
            />
          </View>
        </View>
      </Modal>

      {/* Property Type Modal */}
      <Modal visible={showPropertyTypeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select Property Type</Text>
            <FlatList
              data={propertyTypes}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    setListingForm(prev => ({ ...prev, propertyType: item.key }));
                    setShowPropertyTypeModal(false);
                  }}
                >
                  <Ionicons name={item.icon as any} size={24} color="#8B4513" />
                  <Text style={styles.modalOptionText}>{item.label}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.key}
            />
          </View>
        </View>
      </Modal>

      {/* Location Picker Modal */}
      <LocationPicker
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onLocationSelect={(location) => {
          setListingForm(prev => ({ ...prev, location }));
        }}
        currentLocation={listingForm.location}
        title="Select Property Location"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F3F0' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#2D1810' },
  saveButtonText: { color: '#8B4513', fontSize: 16, fontWeight: '600' },
  scrollView: { flex: 1 },
  section: { backgroundColor: '#FFFFFF', marginBottom: 8, padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2D1810', marginBottom: 8 },
  sectionSubtitle: { fontSize: 14, color: '#8B7355', marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#2D1810', marginBottom: 8 },
  textInput: {
    borderWidth: 1,
    borderColor: '#E8E2DD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F7F3F0',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  inputRow: { flexDirection: 'row' },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E2DD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  selectorText: { fontSize: 16, color: '#2D1810' },
  placeholderText: { fontSize: 16, color: '#8B7355' },
  imageItem: { position: 'relative', marginRight: 12 },
  image: { width: 80, height: 80, borderRadius: 8 },
  removeButton: { position: 'absolute', top: -8, right: -8 },
  addImageButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E8E2DD',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: { fontSize: 10, color: '#8B7355', marginTop: 4 },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  locationText: { flex: 1, marginLeft: 8, color: '#0C4A6E' },
  locationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  locationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F7F3F0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  searchLocationButton: {
    backgroundColor: '#FFFFFF',
  },
  locationButtonText: { marginLeft: 8, color: '#8B4513', fontWeight: '600' },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabel: { fontSize: 16, color: '#2D1810' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '60%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  modalOptionText: { marginLeft: 12, fontSize: 16 },
});

export default AddRentalSwapListingScreen;