import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Image,
  Switch,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import NotificationService from '../services/NotificationService';

interface StoreDetails {
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  isActive: boolean;
  operatingHours: {
    [key: string]: {
      isOpen: boolean;
      openTime: string;
      closeTime: string;
    };
  };
}

const StoreManagementScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [storeDetails, setStoreDetails] = useState<StoreDetails>({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    logoUrl: '',
    isActive: true,
    operatingHours: {
      monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      saturday: { isOpen: true, openTime: '10:00', closeTime: '16:00' },
      sunday: { isOpen: false, openTime: '10:00', closeTime: '16:00' },
    },
  });

  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth) as any;

  useEffect(() => {
    loadStoreDetails();
  }, []);

  const loadStoreDetails = async () => {
    try {
      // TODO: Load actual store details from Firestore
      // For now, using placeholder data
      setStoreDetails(prevState => ({
        ...prevState,
        name: user?.storeName || 'My Store',
        description: 'Premium quality products for your needs',
        address: '123 Main Street, City, Country',
        phone: '+1234567890',
        email: 'store@example.com',
      }));
    } catch (error) {
      console.error('Error loading store details:', error);
      Alert.alert('Error', 'Failed to load store details');
    }
  };

  const handleSaveStore = async () => {
    if (!storeDetails.name.trim()) {
      Alert.alert('Error', 'Store name is required');
      return;
    }

    setLoading(true);
    try {
      const storeId = user?.storeId || 'temp-store-id';
      const isNewStore = storeId === 'temp-store-id';
      
      const storeData = {
        name: storeDetails.name,
        description: storeDetails.description,
        address: storeDetails.address,
        phone: storeDetails.phone,
        email: storeDetails.email,
        logoUrl: storeDetails.logoUrl,
        isActive: storeDetails.isActive,
        operatingHours: storeDetails.operatingHours,
        updatedAt: new Date().toISOString(),
        ownerId: user?.uid,
      };
      
      if (isNewStore) {
        // Create new store
        const newStoreData = {
          ...storeData,
          createdAt: new Date().toISOString(),
          totalRatingSum: 0,
          numberOfRatings: 0,
          averageRating: 0,
          campusCoverage: [],
          categories: [],
        };
        
        const docRef = await addDoc(collection(db, 'stores'), newStoreData);
        
        // Send notifications to customers about new store
        try {
          const notificationService = NotificationService.getInstance();
          await notificationService.notifyNewStore(
            docRef.id,
            storeDetails.name,
            storeDetails.description || '',
            user?.uid || ''
          );
          console.log('New store notifications sent to customers');
        } catch (notificationError) {
          console.warn('Failed to send new store notifications:', notificationError);
          // Don't fail the store creation if notification fails
        }
        
        Alert.alert('Success', 'Store created successfully!');
      } else {
        // Update existing store
        const storeRef = doc(db, 'stores', storeId);
        await updateDoc(storeRef, storeData);
        Alert.alert('Success', 'Store details updated successfully');
      }
      
      navigation.goBack();
    } catch (error) {
      const storeId = user?.storeId || 'temp-store-id';
      console.error('Error saving store:', error);
      Alert.alert('Error', storeId === 'temp-store-id' ? 'Failed to create store' : 'Failed to update store details');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setStoreDetails(prev => ({
        ...prev,
        logoUrl: result.assets[0].uri,
      }));
    }
  };

  const updateOperatingHours = (day: string, field: string, value: any) => {
    setStoreDetails(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [field]: value,
        },
      },
    }));
  };

  const dayNames = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ];

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
        <Text style={styles.headerTitle}>Store Management</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveStore}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Store Logo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Store Logo</Text>
          <TouchableOpacity style={styles.logoContainer} onPress={handleImagePicker}>
            {storeDetails.logoUrl ? (
              <Image source={{ uri: storeDetails.logoUrl }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="camera" size={32} color="#8B7355" />
                <Text style={styles.logoPlaceholderText}>Add Logo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Store Name *</Text>
            <TextInput
              style={styles.textInput}
              value={storeDetails.name}
              onChangeText={(text) => setStoreDetails(prev => ({ ...prev, name: text }))}
              placeholder="Enter store name"
              placeholderTextColor="#8B7355"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={storeDetails.description}
              onChangeText={(text) => setStoreDetails(prev => ({ ...prev, description: text }))}
              placeholder="Describe your store"
              placeholderTextColor="#8B7355"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Address</Text>
            <TextInput
              style={styles.textInput}
              value={storeDetails.address}
              onChangeText={(text) => setStoreDetails(prev => ({ ...prev, address: text }))}
              placeholder="Store address"
              placeholderTextColor="#8B7355"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={styles.textInput}
              value={storeDetails.phone}
              onChangeText={(text) => setStoreDetails(prev => ({ ...prev, phone: text }))}
              placeholder="Phone number"
              placeholderTextColor="#8B7355"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.textInput}
              value={storeDetails.email}
              onChangeText={(text) => setStoreDetails(prev => ({ ...prev, email: text }))}
              placeholder="Email address"
              placeholderTextColor="#8B7355"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Store Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Store Status</Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>Store Active</Text>
              <Text style={styles.statusDescription}>
                Controls whether your store is visible to customers
              </Text>
            </View>
            <Switch
              value={storeDetails.isActive}
              onValueChange={(value) => setStoreDetails(prev => ({ ...prev, isActive: value }))}
              trackColor={{ false: '#D1D5DB', true: '#8B4513' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Operating Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operating Hours</Text>
          {dayNames.map((day) => (
            <View key={day.key} style={styles.dayContainer}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{day.label}</Text>
                <Switch
                  value={storeDetails.operatingHours[day.key].isOpen}
                  onValueChange={(value) => updateOperatingHours(day.key, 'isOpen', value)}
                  trackColor={{ false: '#D1D5DB', true: '#8B4513' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              
              {storeDetails.operatingHours[day.key].isOpen && (
                <View style={styles.timeContainer}>
                  <View style={styles.timeInput}>
                    <Text style={styles.timeLabel}>Open</Text>
                    <TextInput
                      style={styles.timeTextInput}
                      value={storeDetails.operatingHours[day.key].openTime}
                      onChangeText={(text) => updateOperatingHours(day.key, 'openTime', text)}
                      placeholder="09:00"
                      placeholderTextColor="#8B7355"
                    />
                  </View>
                  <Text style={styles.timeSeparator}>to</Text>
                  <View style={styles.timeInput}>
                    <Text style={styles.timeLabel}>Close</Text>
                    <TextInput
                      style={styles.timeTextInput}
                      value={storeDetails.operatingHours[day.key].closeTime}
                      onChangeText={(text) => updateOperatingHours(day.key, 'closeTime', text)}
                      placeholder="18:00"
                      placeholderTextColor="#8B7355"
                    />
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
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
  },
  saveButton: {
    backgroundColor: '#8B4513',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 16,
  },
  logoContainer: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#F5F1ED',
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F1ED',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8E2DD',
    borderStyle: 'dashed',
  },
  logoPlaceholderText: {
    fontSize: 12,
    color: '#8B7355',
    marginTop: 4,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1810',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E8E2DD',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2D1810',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: '#8B7355',
  },
  dayContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F1ED',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeInput: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8B7355',
    marginBottom: 4,
  },
  timeTextInput: {
    borderWidth: 1,
    borderColor: '#E8E2DD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#2D1810',
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 14,
    color: '#8B7355',
    marginHorizontal: 16,
    fontWeight: '500',
  },
});

export default StoreManagementScreen;