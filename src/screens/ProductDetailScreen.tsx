import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Alert,
  Share,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../store';
import { fetchListingById } from '../store/slices/listingsSlice';
import { addToCart } from '../store/slices/cartSlice';
import { addToFavorites, removeFromFavorites } from '../store/slices/favoritesSlice';
import { RootStackParamList } from '../navigation/AppNavigator';
import { StackNavigationProp } from '@react-navigation/stack';
import { RatingDisplay } from '../components/Rating';
import RatingModal from '../components/RatingModal';
import { Listing, ListingType } from '../types';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';

type ProductDetailScreenRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;
type ProductDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ProductDetail'>;

const { width } = Dimensions.get('window');

const ProductDetailScreen: React.FC = () => {
  const [quantity, setQuantity] = useState(1);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<ProductDetailScreenNavigationProp>();
  const route = useRoute<ProductDetailScreenRouteProp>();
  
  const { productId, listingId } = route.params;
  const { currentListing, isLoading } = useSelector((state: RootState) => state.listings) as any;
  const { user } = useSelector((state: RootState) => state.auth);
  const { items: favoriteItems } = useSelector((state: RootState) => state.favorites) as any;

  useEffect(() => {
    if (listingId || productId) {
      dispatch(fetchListingById(listingId || productId));
    }
  }, [listingId, productId]);

  useEffect(() => {
    if (currentListing) {
      const favorite = favoriteItems.find(
        (fav: any) => fav.listingId === currentListing.id
      );
      setIsFavorited(!!favorite);
    }
  }, [currentListing, favoriteItems]);

  const handleAddToCart = () => {
    if (!currentListing) return;

    if (currentListing.stock !== undefined && currentListing.stock < quantity) {
      Alert.alert('Insufficient Stock', 'The requested quantity is not available.');
      return;
    }

    dispatch(addToCart({ listing: currentListing, quantity }));
    Alert.alert(
      'Added to Cart',
      `${quantity} ${currentListing.title} added to cart`,
      [
        { text: 'Continue Shopping', style: 'cancel' },
        { 
          text: 'View Cart', 
          onPress: () => navigation.navigate('Cart')
        },
      ]
    );
  };

  const handleToggleFavorite = async () => {
    if (!currentListing || !user) {
      Alert.alert('Error', 'Please login to add favorites');
      return;
    }

    try {
      if (isFavorited) {
        const favorite = favoriteItems.find(
          (fav: any) => fav.listingId === currentListing.id
        );
        if (favorite?.id) {
          await dispatch(removeFromFavorites(favorite.id));
        }
      } else {
        await dispatch(addToFavorites({
          userId: user.uid,
          listingId: currentListing.id,
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorites');
    }
  };

  const handleShare = async () => {
    if (!currentListing) return;

    try {
      await Share.share({
        message: `Check out this ${currentListing.title} for $${currentListing.price} on KUTRA!`,
        title: currentListing.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleContactSeller = () => {
    if (!currentListing || !user) {
      Alert.alert('Error', 'Please login to contact seller');
      return;
    }

    navigation.navigate('Conversation', {
      conversationId: [user.uid, currentListing.sellerId].sort().join('_'),
      otherUserId: currentListing.sellerId,
      otherUserName: currentListing.sellerName,
      listingId: currentListing.id,
    });
  };

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity < 1) return;
    
    if (currentListing?.stock !== undefined && newQuantity > currentListing.stock) {
      Alert.alert('Insufficient Stock', `Only ${currentListing.stock} items available`);
      return;
    }
    
    setQuantity(newQuantity);
  };

  const handleRateProduct = async (rating: number, review?: string) => {
    if (!user || !currentListing) {
      Alert.alert('Login Required', 'Please login to rate this product.');
      return;
    }

    try {
      // Add rating to Firestore
      await addDoc(collection(db, 'productRatings'), {
        listingId: currentListing.id,
        userId: user.uid,
        userName: user.name,
        rating,
        review: review || null,
        createdAt: new Date().toISOString(),
      });

      // Update product's rating statistics
      const listingRef = doc(db, 'listings', currentListing.id);
      await updateDoc(listingRef, {
        totalRatingSum: increment(rating),
        numberOfRatings: increment(1),
        averageRating: (currentListing.totalRatingSum + rating) / (currentListing.numberOfRatings + 1),
      });

      console.log('Product rating submitted successfully');
    } catch (error) {
      console.error('Error submitting product rating:', error);
      throw error;
    }
  };

  if (isLoading || !currentListing) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const isOwnListing = user?.uid === currentListing.sellerId;
  const isProductForSale = currentListing.type === ListingType.SELL;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: currentListing.imageBase64
                ? `data:image/jpeg;base64,${currentListing.imageBase64}`
                : currentListing.imageUrl || 'https://placehold.co/400x300.png?text=No+Image'
            }}
            style={styles.productImage}
            resizeMode="cover"
          />
          
          {/* Action buttons overlay */}
          <View style={styles.imageActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleToggleFavorite}
            >
              <Ionicons
                name={isFavorited ? "heart" : "heart-outline"}
                size={24}
                color={isFavorited ? "#E74C3C" : "#666"}
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Category and type badges */}
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{currentListing.category}</Text>
            </View>
            <View style={[styles.badge, styles.typeBadge]}>
              <Text style={styles.badgeText}>{currentListing.type}</Text>
            </View>
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.contentContainer}>
          <Text style={styles.productTitle}>{currentListing.title}</Text>
          
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              K{currentListing.price.toFixed(2)}
              {currentListing.type === ListingType.RENT && currentListing.rentalPeriod && (
                <Text>/{currentListing.rentalPeriod}</Text>
              )}
              {currentListing.type === ListingType.SWAP && (
                <Text> (Est. Value)</Text>
              )}
            </Text>
            {currentListing.condition && (
              <View style={styles.conditionContainer}>
                <Text style={styles.conditionText}>{currentListing.condition}</Text>
              </View>
            )}
          </View>

          {/* Stock info */}
          {currentListing.stock !== undefined && (
            <View style={styles.stockContainer}>
              <Ionicons 
                name="cube-outline" 
                size={16} 
                color={currentListing.stock > 0 ? "#27AE60" : "#E74C3C"} 
              />
              <Text style={[
                styles.stockText,
                { color: currentListing.stock > 0 ? "#27AE60" : "#E74C3C" }
              ]}>
                {currentListing.stock > 0 
                  ? `${currentListing.stock} in stock` 
                  : 'Out of stock'}
              </Text>
            </View>
          )}

          {/* Seller info */}
          <TouchableOpacity style={styles.sellerContainer}>
            <View style={styles.sellerInfo}>
              <Ionicons name="person-circle-outline" size={32} color="#007AFF" />
              <View style={styles.sellerDetails}>
                <Text style={styles.sellerName}>{currentListing.sellerName}</Text>
                <Text style={styles.sellerLabel}>Seller</Text>
              </View>
            </View>
            {!isOwnListing && (
              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleContactSeller}
              >
                <Ionicons name="chatbubble-outline" size={16} color="#007AFF" />
                <Text style={styles.contactButtonText}>Contact</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Rental specific info */}
          {currentListing.type === ListingType.RENT && (
            <View style={styles.rentalInfoContainer}>
              <Text style={styles.sectionTitle}>Rental Information</Text>
              {currentListing.rentalPeriod && (
                <Text style={styles.infoText}>Period: {currentListing.rentalPeriod}</Text>
              )}
              {currentListing.minimumRentalPeriod && (
                <Text style={styles.infoText}>Minimum: {currentListing.minimumRentalPeriod} {currentListing.rentalPeriod || 'days'}</Text>
              )}
              {currentListing.securityDeposit && (
                <Text style={styles.infoText}>Security Deposit: K{currentListing.securityDeposit.toFixed(2)}</Text>
              )}
            </View>
          )}

          {/* Swap specific info */}
          {currentListing.type === ListingType.SWAP && (
            <View style={styles.swapInfoContainer}>
              <Text style={styles.sectionTitle}>Swap Information</Text>
              {currentListing.swapValue && (
                <Text style={styles.infoText}>Estimated Value: K{currentListing.swapValue.toFixed(2)}</Text>
              )}
              {currentListing.swapPreferences && currentListing.swapPreferences.length > 0 && (
                <View>
                  <Text style={styles.infoText}>Looking for:</Text>
                  <Text style={styles.preferencesText}>{String(currentListing.swapPreferences.join(', '))}</Text>
                </View>
              )}
            </View>
          )}

          {/* Property type info */}
          {currentListing.propertyType && (
            <View style={styles.propertyInfoContainer}>
              <Text style={styles.sectionTitle}>Property Details</Text>
              <Text style={styles.infoText}>Type: {String(currentListing.propertyType)}</Text>
              
              {/* House specific details */}
              {currentListing.houseDetails && (
                <View>
                  {currentListing.houseDetails.bedrooms && (
                    <Text style={styles.infoText}>Bedrooms: {String(currentListing.houseDetails.bedrooms)}</Text>
                  )}
                  {currentListing.houseDetails.bathrooms && (
                    <Text style={styles.infoText}>Bathrooms: {String(currentListing.houseDetails.bathrooms)}</Text>
                  )}
                  {currentListing.houseDetails.squareFootage && (
                    <Text style={styles.infoText}>Area: {String(currentListing.houseDetails.squareFootage)} sq ft</Text>
                  )}
                  {currentListing.houseDetails.furnished !== undefined && (
                    <Text style={styles.infoText}>Furnished: {currentListing.houseDetails.furnished ? 'Yes' : 'No'}</Text>
                  )}
                </View>
              )}
              
              {/* Car specific details */}
              {currentListing.carDetails && (
                <View>
                  {currentListing.carDetails.make && currentListing.carDetails.model && (
                    <Text style={styles.infoText}>{String(currentListing.carDetails.make)} {String(currentListing.carDetails.model)}</Text>
                  )}
                  {currentListing.carDetails.year && (
                    <Text style={styles.infoText}>Year: {String(currentListing.carDetails.year)}</Text>
                  )}
                  {currentListing.carDetails.fuelType && (
                    <Text style={styles.infoText}>Fuel: {String(currentListing.carDetails.fuelType)}</Text>
                  )}
                  {currentListing.carDetails.transmission && (
                    <Text style={styles.infoText}>Transmission: {String(currentListing.carDetails.transmission)}</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Enhanced location */}
          {currentListing.location && (
            <View style={styles.locationContainer}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.locationText}>
                  {currentListing.location.address || ''}{currentListing.location.city ? `, ${currentListing.location.city}` : ''}
                </Text>
              </View>
              {currentListing.location.landmark && (
                <Text style={styles.infoText}>Near: {String(currentListing.location.landmark)}</Text>
              )}
            </View>
          )}

          {/* Contact info */}
          {currentListing.contactInfo && (
            <View style={styles.contactInfoContainer}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              {currentListing.contactInfo.preferredContactMethod && (
                <Text style={styles.infoText}>Preferred: {String(currentListing.contactInfo.preferredContactMethod)}</Text>
              )}
              {currentListing.contactInfo.availableHours && (
                <Text style={styles.infoText}>Available: {String(currentListing.contactInfo.availableHours)}</Text>
              )}
            </View>
          )}

          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{String(currentListing.description || '')}</Text>
          </View>

          {/* Rating */}
          <View style={styles.ratingContainer}>
            <Text style={styles.sectionTitle}>Rating</Text>
            <View style={styles.ratingRow}>
              <RatingDisplay 
                rating={currentListing.averageRating || 0} 
                size={16} 
                showNumber={true} 
              />
              {currentListing.numberOfRatings && currentListing.numberOfRatings > 0 && (
                <Text style={styles.ratingText}>
                  ({currentListing.numberOfRatings} review{currentListing.numberOfRatings !== 1 ? 's' : ''})
                </Text>
              )}
            </View>
            {!isOwnListing && (
              <TouchableOpacity 
                style={styles.rateButton}
                onPress={() => setShowRatingModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="star-outline" size={16} color="#8B4513" />
                <Text style={styles.rateButtonText}>Rate Product</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Rating Modal */}
      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleRateProduct}
        type="product"
        itemName={currentListing.title}
      />

      {/* Bottom action bar - only show for products that can be purchased */}
      {!isOwnListing && isProductForSale && currentListing.stock !== 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleQuantityChange(-1)}
            >
              <Ionicons name="remove" size={20} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleQuantityChange(1)}
            >
              <Ionicons name="add" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.addToCartButton}
              onPress={handleAddToCart}
            >
              <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
              <Text style={styles.addToCartText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F3F0',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F3F0',
  },
  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width: width,
    height: width * 0.75,
  },
  imageActions: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
  },
  actionButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 8,
    marginLeft: 8,
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
  },
  badge: {
    backgroundColor: '#8B4513',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  typeBadge: {
    backgroundColor: '#A0522D',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  contentContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  productTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D1810',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  conditionContainer: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  conditionText: {
    color: '#27AE60',
    fontSize: 12,
    fontWeight: '500',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  sellerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F1ED',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sellerDetails: {
    marginLeft: 12,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
  },
  sellerLabel: {
    fontSize: 12,
    color: '#8B7355',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F1ED',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  contactButtonText: {
    color: '#8B4513',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1810',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#8B7355',
    lineHeight: 24,
  },
  ratingContainer: {
    marginBottom: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#8B4513',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  rateButtonText: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '600',
    marginLeft: 4,
  },
  locationContainer: {
    marginBottom: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  rentalInfoContainer: {
    marginBottom: 20,
  },
  swapInfoContainer: {
    marginBottom: 20,
  },
  propertyInfoContainer: {
    marginBottom: 20,
  },
  contactInfoContainer: {
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  preferencesText: {
    fontSize: 14,
    color: '#8B4513',
    fontStyle: 'italic',
    marginLeft: 10,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E2DD',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  quantityButton: {
    backgroundColor: '#F5F1ED',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E8E2DD',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  actionButtons: {
    flex: 1,
    flexDirection: 'row',
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8B4513',
    borderRadius: 12,
    paddingVertical: 12,
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default ProductDetailScreen;