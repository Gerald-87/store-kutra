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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { updateStoreProduct } from '../store/slices/dashboardSlice';
import { ListingCategory, ListingType, Listing, ItemCondition } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';

type EditProductScreenRouteProp = RouteProp<RootStackParamList, 'EditProduct'>;

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

const EditProductScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<EditProductScreenRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth) as any;
  
  const { product } = route.params as { product: Listing };

  const [loading, setLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [productForm, setProductForm] = useState<ProductForm>({
    title: product.title || '',
    description: product.description || '',
    price: product.price?.toString() || '',
    category: product.category || '',
    type: product.type || ListingType.SELL,
    stock: product.stock?.toString() || '',
    images: product.imageBase64 ? [`data:image/jpeg;base64,${product.imageBase64}`] : product.imageUrl ? [product.imageUrl] : [],
    condition: product.condition || 'New',
    tags: [],
  });

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

  const handleUpdateProduct = async () => {
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
      Alert.alert('Error', 'Valid stock quantity is required for selling items');
      return;
    }

    setLoading(true);
    try {
      // Convert image to base64 if it's a new image (starts with file://)
      let imageBase64 = '';
      let imageUrl = '';
      
      if (productForm.images.length > 0) {
        const imageUri = productForm.images[0];
        if (imageUri.startsWith('file://')) {
          // New image - convert to base64
          try {
            const response = await fetch(imageUri);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            await new Promise((resolve) => {
              reader.onloadend = () => {
                const base64data = reader.result as string;
                imageBase64 = base64data.split(',')[1]; // Remove data:image/jpeg;base64, prefix
                resolve(undefined);
              };
            });
          } catch (error) {
            console.error('Error converting image to base64:', error);
          }
        } else if (imageUri.startsWith('data:image')) {
          // Existing base64 image
          imageBase64 = imageUri.split(',')[1];
        } else {
          // Existing URL
          imageUrl = imageUri;
        }
      }

      const updateData: Partial<Listing> = {
        title: productForm.title.trim(),
        description: productForm.description.trim(),
        price: parseFloat(productForm.price),
        category: productForm.category as ListingCategory,
        type: productForm.type,
        condition: productForm.condition as ItemCondition,
        stock: productForm.type === ListingType.SELL ? parseInt(productForm.stock) : undefined,
      };

      // Add image data if available
      if (imageBase64) {
        updateData.imageBase64 = imageBase64;
        updateData.imageUrl = ''; // Clear URL if using base64
      } else if (imageUrl) {
        updateData.imageUrl = imageUrl;
        updateData.imageBase64 = ''; // Clear base64 if using URL
      }

      await dispatch(updateStoreProduct({
        productId: product.id,
        updateData
      }));

      Alert.alert('Success', 'Product updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Error', 'Failed to update product. Please try again.');
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
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <Ionicons name="close" size={24} color="#2D1810" />
            </TouchableOpacity>
          </View>
          <FlatList
            key="edit-product-category-modal"
            data={categories}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.categoryOption}
                onPress={() => {
                  setProductForm(prev => ({ ...prev, category: item.key }));
                  setShowCategoryModal(false);
                }}
              >
                <Ionicons name={item.icon as any} size={20} color="#8B4513" />
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
        <Text style={styles.headerTitle}>Edit Product</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleUpdateProduct}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Updating...' : 'Update'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Product Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Images *</Text>
          <View style={styles.imagesContainer}>
            {productForm.images.map((image, index) => (
              <View key={index} style={styles.imageContainer}>
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
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={handleImagePicker}
              >
                <Ionicons name="add" size={24} color="#8B4513" />
                <Text style={styles.addImageText}>Add Image</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Product Title *</Text>
            <TextInput
              style={styles.textInput}
              value={productForm.title}
              onChangeText={(text) => setProductForm(prev => ({ ...prev, title: text }))}
              placeholder="Enter product title"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={productForm.description}
              onChangeText={(text) => setProductForm(prev => ({ ...prev, description: text }))}
              placeholder="Describe your product"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Price (K) *</Text>
            <TextInput
              style={styles.textInput}
              value={productForm.price}
              onChangeText={(text) => setProductForm(prev => ({ ...prev, price: text }))}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Category *</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={[
                styles.selectButtonText,
                !productForm.category && styles.selectButtonPlaceholder
              ]}>
                {productForm.category ? 
                  categories.find(c => c.key === productForm.category)?.label : 
                  'Select Category'
                }
              </Text>
              <Ionicons name="chevron-down" size={20} color="#8B7355" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Condition</Text>
            <View style={styles.conditionsContainer}>
              {conditions.map((condition) => (
                <TouchableOpacity
                  key={condition}
                  style={[
                    styles.conditionButton,
                    productForm.condition === condition && styles.conditionButtonSelected
                  ]}
                  onPress={() => setProductForm(prev => ({ ...prev, condition }))}
                >
                  <Text style={[
                    styles.conditionButtonText,
                    productForm.condition === condition && styles.conditionButtonTextSelected
                  ]}>
                    {condition}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {productForm.type === ListingType.SELL && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Stock Quantity *</Text>
              <TextInput
                style={styles.textInput}
                value={productForm.stock}
                onChangeText={(text) => setProductForm(prev => ({ ...prev, stock: text }))}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>
          )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  saveButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 12,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  addImageButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#8B4513',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F1ED',
  },
  addImageText: {
    fontSize: 12,
    color: '#8B4513',
    marginTop: 4,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
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
    fontSize: 14,
    color: '#2D1810',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E2DD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  selectButtonText: {
    fontSize: 14,
    color: '#2D1810',
  },
  selectButtonPlaceholder: {
    color: '#9CA3AF',
  },
  conditionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E2DD',
    backgroundColor: '#FFFFFF',
  },
  conditionButtonSelected: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  conditionButtonText: {
    fontSize: 12,
    color: '#8B7355',
    fontWeight: '500',
  },
  conditionButtonTextSelected: {
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
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  categoryOptionText: {
    fontSize: 16,
    color: '#2D1810',
    marginLeft: 12,
    flex: 1,
  },
});

export default EditProductScreen;