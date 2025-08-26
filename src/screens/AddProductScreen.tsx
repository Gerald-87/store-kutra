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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { addStoreProduct } from '../store/slices/dashboardSlice';
import { ListingCategory, ListingType } from '../types';
import NotificationService from '../services/NotificationService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ProductForm {
  title: string;
  description: string;
  price: string;
  category: ListingCategory | '';
  type: ListingType;
  stock: string;
  images: string[];
  condition: string;
  tags: string[];
}

const AddProductScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [productForm, setProductForm] = useState<ProductForm>({
    title: '',
    description: '',
    price: '',
    category: '',
    type: ListingType.SELL,
    stock: '',
    images: [],
    condition: 'New',
    tags: [],
  });
  const insets = useSafeAreaInsets();

  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth) as any;

  const categories = [
    { key: ListingCategory.ELECTRONICS, label: 'Electronics', icon: 'phone-portrait' },
    { key: ListingCategory.FURNITURE, label: 'Furniture', icon: 'bed' },
    { key: ListingCategory.CLOTHING, label: 'Clothing & Fashion', icon: 'shirt' },
    { key: ListingCategory.BOOKS, label: 'Books & Media', icon: 'library' },
    { key: ListingCategory.GROCERIES, label: 'Groceries & Food', icon: 'basket' },
    { key: ListingCategory.VEGETABLES, label: 'Fresh Produce', icon: 'leaf' },
    { key: ListingCategory.AGRO, label: 'Agriculture', icon: 'flower' },
    { key: ListingCategory.PHARMACY, label: 'Health & Pharmacy', icon: 'medical' },
  ];

  const conditions = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

  const handleImagePicker = async () => {
    if (productForm.images.length >= 5) {
      Alert.alert('Limit Reached', 'You can only add up to 5 images');
      return;
    }

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
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      setProductForm(prev => ({
        ...prev,
        images: [...prev.images, result.assets[0].uri],
      }));
    }
  };

  const removeImage = (index: number) => {
    setProductForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSaveProduct = async () => {
    // Validation
    if (!productForm.title.trim()) {
      Alert.alert('Error', 'Product title is required');
      return;
    }
    if (!productForm.description.trim()) {
      Alert.alert('Error', 'Product description is required');
      return;
    }
    if (!productForm.price || isNaN(parseFloat(productForm.price))) {
      Alert.alert('Error', 'Valid price is required');
      return;
    }
    if (!productForm.category) {
      Alert.alert('Error', 'Product category is required');
      return;
    }
    if (productForm.type === ListingType.SELL && (!productForm.stock || isNaN(parseInt(productForm.stock)))) {
      Alert.alert('Error', 'Valid stock quantity is required for products');
      return;
    }
    if (productForm.images.length === 0) {
      Alert.alert('Error', 'At least one product image is required');
      return;
    }

    setLoading(true);
    try {
      // Create product data for the listing
      const productData = {
        title: productForm.title.trim(),
        description: productForm.description.trim(),
        price: parseFloat(productForm.price),
        category: productForm.category as any,
        type: productForm.type,
        stock: productForm.type === ListingType.SELL ? parseInt(productForm.stock) : undefined,
        imageUrl: productForm.images[0], // Primary image
        imageBase64: productForm.images[0], // For now, using the same as imageUrl
        condition: productForm.condition as any,
        sellerId: user?.uid || '',
        sellerName: user?.storeName || user?.name || 'Store Owner',
        storeId: user?.storeId || '',
        postedDate: new Date().toISOString(),
        // Generate search keywords for better searchability
        searchKeywords: [
          ...(productForm.title?.toLowerCase() || '').split(' '),
          ...(productForm.description?.toLowerCase() || '').split(' '),
          (productForm.category?.toLowerCase() || ''),
          ...(productForm.tags?.map(tag => tag?.toLowerCase()) || []),
        ].filter(keyword => keyword && keyword.length > 2),
      };

      const resultAction = await dispatch(addStoreProduct(productData));
      
      // Send notification about new product to customers
      try {
        const createdProduct = resultAction.payload as any;
        const notificationService = NotificationService.getInstance();
        await notificationService.notifyNewProduct(
          createdProduct?.id || '',
          user?.storeId || '',
          productForm.title,
          parseFloat(productForm.price),
          user?.storeName || 'New Store'
        );
        console.log('New product notifications sent to customers');
      } catch (notificationError) {
        console.warn('Failed to send new product notifications:', notificationError);
        // Don't fail the product creation if notification fails
      }
      
      Alert.alert('Success', 'Product added successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error adding product:', error);
      Alert.alert('Error', 'Failed to add product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderCategoryModal = () => (
    <Modal
      visible={showCategoryModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCategoryModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity
              onPress={() => setShowCategoryModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            key="add-product-category-modal"
            data={categories}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.categoryOption}
                onPress={() => {
                  setProductForm(prev => ({ ...prev, category: item.key }));
                  setShowCategoryModal(false);
                }}
              >
                <Ionicons name={item.icon as any} size={24} color="#8B4513" />
                <Text style={styles.categoryOptionText}>{item.label}</Text>
                {productForm.category === item.key && (
                  <Ionicons name="checkmark" size={20} color="#8B4513" />
                )}
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.key}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2D1810" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Product</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveProduct}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Product Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Images *</Text>
          <Text style={styles.sectionSubtitle}>Add up to 5 images</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
            {productForm.images.map((image, index) => (
              <View key={index} style={styles.imageItem}>
                <Image source={{ uri: image }} style={styles.productImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            
            {productForm.images.length < 5 && (
              <TouchableOpacity style={styles.addImageButton} onPress={handleImagePicker}>
                <Ionicons name="camera" size={32} color="#8B7355" />
                <Text style={styles.addImageText}>Add Image</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Product Title *</Text>
            <TextInput
              style={styles.textInput}
              value={productForm.title}
              onChangeText={(text) => setProductForm(prev => ({ ...prev, title: text }))}
              placeholder="Enter product title"
              placeholderTextColor="#8B7355"
              maxLength={100}
            />
            <Text style={styles.charCount}>{String(productForm.title.length)}/100</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={productForm.description}
              onChangeText={(text) => setProductForm(prev => ({ ...prev, description: text }))}
              placeholder="Describe your product in detail"
              placeholderTextColor="#8B7355"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{String(productForm.description.length)}/500</Text>
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Price (K) *</Text>
              <TextInput
                style={styles.textInput}
                value={productForm.price}
                onChangeText={(text) => setProductForm(prev => ({ ...prev, price: text }))}
                placeholder="0.00"
                placeholderTextColor="#8B7355"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Stock Quantity</Text>
              <TextInput
                style={styles.textInput}
                value={productForm.stock}
                onChangeText={(text) => setProductForm(prev => ({ ...prev, stock: text }))}
                placeholder="0"
                placeholderTextColor="#8B7355"
                keyboardType="number-pad"
                editable={productForm.type === ListingType.SELL}
              />
            </View>
          </View>
        </View>

        {/* Category and Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category & Type</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category *</Text>
            <TouchableOpacity
              style={styles.categorySelector}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={[
                styles.categorySelectorText,
                !productForm.category && styles.placeholderText
              ]}>
                {productForm.category 
                  ? categories.find(c => c.key === productForm.category)?.label 
                  : 'Select a category'
                }
              </Text>
              <Ionicons name="chevron-down" size={20} color="#8B7355" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Product Type</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  productForm.type === ListingType.SELL && styles.activeTypeButton,
                ]}
                onPress={() => setProductForm(prev => ({ ...prev, type: ListingType.SELL }))}
              >
                <Text style={[
                  styles.typeButtonText,
                  productForm.type === ListingType.SELL && styles.activeTypeButtonText,
                ]}>
                  Product
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  productForm.type === 'Service' && styles.activeTypeButton,
                ]}
                onPress={() => setProductForm(prev => ({ ...prev, type: ListingType.SERVICE }))}
              >
                <Text style={[
                  styles.typeButtonText,
                  productForm.type === 'Service' && styles.activeTypeButtonText,
                ]}>
                  Service
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Condition</Text>
            <View style={styles.conditionSelector}>
              {conditions.map((condition) => (
                <TouchableOpacity
                  key={condition}
                  style={[
                    styles.conditionButton,
                    productForm.condition === condition && styles.activeConditionButton,
                  ]}
                  onPress={() => setProductForm(prev => ({ ...prev, condition }))}
                >
                  <Text style={[
                    styles.conditionButtonText,
                    productForm.condition === condition && styles.activeConditionButtonText,
                  ]}>
                    {condition}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {renderCategoryModal()}
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
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8B7355',
    marginBottom: 16,
  },
  imagesContainer: {
    marginTop: 8,
  },
  imageItem: {
    position: 'relative',
    marginRight: 12,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E2DD',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E8E2DD',
    borderStyle: 'dashed',
    backgroundColor: '#F7F3F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    fontSize: 12,
    color: '#8B7355',
    marginTop: 4,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
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
  charCount: {
    fontSize: 12,
    color: '#8B7355',
    textAlign: 'right',
    marginTop: 4,
  },
  categorySelector: {
    borderWidth: 1,
    borderColor: '#E8E2DD',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  categorySelectorText: {
    fontSize: 16,
    color: '#2D1810',
  },
  placeholderText: {
    color: '#8B7355',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E2DD',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  activeTypeButton: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B7355',
  },
  activeTypeButtonText: {
    color: '#FFFFFF',
  },
  conditionSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E2DD',
    backgroundColor: '#FFFFFF',
  },
  activeConditionButton: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  conditionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8B7355',
  },
  activeConditionButtonText: {
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
  },
  modalCloseButton: {
    padding: 4,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F1ED',
  },
  categoryOptionText: {
    fontSize: 16,
    color: '#2D1810',
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
});

export default AddProductScreen;