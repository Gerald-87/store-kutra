import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchStoreProducts, updateStoreProduct, deleteStoreProduct } from '../store/slices/dashboardSlice';
import { Listing, ListingCategory, ListingType } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type ProductManagementNavigationProp = StackNavigationProp<RootStackParamList>;

const ProductManagementScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Listing[]>([]);

  const navigation = useNavigation<ProductManagementNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth) as any;
  
  // Get real products from Redux store
  const dashboardState = useSelector((state: RootState) => state.dashboard);
  const {
    storeProducts: products,
    isLoading,
    error,
    stats
  } = dashboardState;

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery]);
  
  // Show error if there's one
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  const loadProducts = async () => {
    try {
      if (!user?.uid) {
        console.error('No user ID available');
        return;
      }
      
      console.log('Loading products for seller:', user.uid);
      await dispatch(fetchStoreProducts(user.uid));
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    }
  };

  const filterProducts = () => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }

    const filtered = products.filter(product =>
      (product.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.category || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProducts(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const handleAddProduct = () => {
    navigation.navigate('AddProduct');
  };

  const handleEditProduct = (product: Listing) => {
    navigation.navigate('EditProduct', { product });
  };

  const handleDeleteProduct = (productId: string) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteProduct(productId),
        },
      ]
    );
  };

  const deleteProduct = async (productId: string) => {
    try {
      await dispatch(deleteStoreProduct(productId));
      Alert.alert('Success', 'Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      Alert.alert('Error', 'Failed to delete product');
    }
  };

  const toggleProductStatus = async (productId: string) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      
      await dispatch(updateStoreProduct({
        productId,
        updateData: { isActive: !product.isActive }
      }));
    } catch (error) {
      console.error('Error updating product status:', error);
      Alert.alert('Error', 'Failed to update product status');
    }
  };

  const renderProductItem = ({ item }: { item: Listing }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => handleEditProduct(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{
          uri: item.imageBase64
            ? `data:image/jpeg;base64,${item.imageBase64}`
            : item.imageUrl || 'https://placehold.co/200x200.png?text=Product'
        }}
        style={styles.productImage}
        resizeMode="cover"
      />
      
      <View style={styles.productInfo}>
        <View style={styles.productHeader}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => showProductActions(item)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#8B7355" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.productDetails}>
          <Text style={styles.productPrice}>K{item.price.toFixed(2)}</Text>
          <Text style={styles.productStock}>
            Stock: {item.stock || 0}
          </Text>
        </View>
        
        <View style={styles.productFooter}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.isActive !== false ? '#E8F5E8' : '#FEF2F2' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: item.isActive !== false ? '#059669' : '#DC2626' }
            ]}>
              {item.isActive !== false ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const showProductActions = (product: Listing) => {
    Alert.alert(
      product.title,
      'Choose an action',
      [
        { text: 'Edit', onPress: () => handleEditProduct(product) },
        {
          text: product.isActive !== false ? 'Deactivate' : 'Activate',
          onPress: () => toggleProductStatus(product.id),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteProduct(product.id),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="cube-outline" size={64} color="#D2B48C" />
      <Text style={styles.emptyStateTitle}>No Products Yet</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery
          ? 'No products match your search'
          : 'Start by adding your first product'}
      </Text>
      {!searchQuery && (
        <TouchableOpacity style={styles.addFirstProductButton} onPress={handleAddProduct}>
          <Text style={styles.addFirstProductText}>Add Product</Text>
        </TouchableOpacity>
      )}
    </View>
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
        <Text style={styles.headerTitle}>Product Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#8B7355" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8B7355"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#8B7355" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Product Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{String(stats.totalProducts)}</Text>
          <Text style={styles.statLabel}>Total Products</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{String(stats.activeProducts)}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {String(products.reduce((sum, p) => sum + (p.stock || 0), 0))}
          </Text>
          <Text style={styles.statLabel}>Total Stock</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{String(stats.outOfStockProducts)}</Text>
          <Text style={styles.statLabel}>Out of Stock</Text>
        </View>
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          filteredProducts.length === 0 && styles.emptyListContainer,
        ]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#8B4513']}
            tintColor="#8B4513"
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
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
  addButton: {
    backgroundColor: '#8B4513',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F3F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E8E2DD',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#2D1810',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  statItem: {
    alignItems: 'center',
    flex: 0.25,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#8B4513',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#8B7355',
    fontWeight: '500',
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  productImage: {
    width: 100,
    height: 120,
    backgroundColor: '#F7F3F0',
  },
  productInfo: {
    flex: 1,
    padding: 16,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1810',
    flex: 1,
    marginRight: 8,
  },
  moreButton: {
    padding: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#8B7355',
    marginBottom: 12,
    lineHeight: 18,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#8B4513',
  },
  productStock: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: '#F5F1ED',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#8B4513',
    fontWeight: '600',
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  addFirstProductButton: {
    backgroundColor: '#8B4513',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  addFirstProductText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProductManagementScreen;