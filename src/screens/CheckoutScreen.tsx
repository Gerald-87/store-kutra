import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../store';
import { clearCart } from '../store/slices/cartSlice';
import { Order, OrderItem, OrderStatus } from '../types';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import LocationService, { LocationData } from '../services/LocationService';
import NotificationService from '../services/NotificationService';

type CheckoutScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Checkout'>;

interface DeliveryAddress {
  street: string;
  city: string;
  phone: string;
}

const CheckoutScreen: React.FC = () => {
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'bank'>('cash');
  const [address, setAddress] = useState<DeliveryAddress>({
    street: '',
    city: '',
    phone: '',
  });
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<CheckoutScreenNavigationProp>();
  const { items, totalAmount } = useSelector((state: RootState) => state.cart) as any;
  const { user } = useSelector((state: RootState) => state.auth);

  const deliveryFee = deliveryMethod === 'delivery' ? 5.00 : 0;
  const finalTotal = totalAmount + deliveryFee;

  // Load location on component mount
  useEffect(() => {
    loadCurrentLocation();
  }, []);

  const loadCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const location = await LocationService.getCurrentLocationWithAddress();
      if (location) {
        setCurrentLocation(location);
        // Auto-fill city if available
        if (location.city && !address.city) {
          setAddress(prev => ({
            ...prev,
            city: location.city || ''
          }));
        }
      }
    } catch (error) {
      console.error('Error loading location:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleAddressChange = (field: keyof DeliveryAddress, value: string) => {
    setAddress(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const location = await LocationService.getCurrentLocationWithAddress();
      if (location) {
        setCurrentLocation(location);
        setAddress(prev => ({
          ...prev,
          street: location.address || prev.street,
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

  const validateOrder = () => {
    if (!user) {
      Alert.alert('Error', 'User not logged in');
      return false;
    }

    if (items.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return false;
    }

    // Validate cart items have required data
    for (const item of items) {
      if (!item.listing) {
        Alert.alert('Error', 'Cart contains invalid items. Please refresh your cart and try again.');
        return false;
      }
      if (!item.listing.id) {
        Alert.alert('Error', 'Cart item missing product ID. Please refresh your cart and try again.');
        return false;
      }
      if (!item.listing.title) {
        Alert.alert('Error', 'Cart item missing product title. Please refresh your cart and try again.');
        return false;
      }
      if (typeof item.listing.price !== 'number' || item.listing.price < 0) {
        Alert.alert('Error', 'Cart item has invalid price. Please refresh your cart and try again.');
        return false;
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        Alert.alert('Error', 'Cart item has invalid quantity. Please refresh your cart and try again.');
        return false;
      }
    }

    if (deliveryMethod === 'delivery') {
      if (!address.street.trim() || !address.city.trim() || !address.phone.trim()) {
        Alert.alert('Error', 'Please fill in address and phone number');
        return false;
      }
      
      // Validate phone number format
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (!phoneRegex.test(address.phone.trim())) {
        Alert.alert('Error', 'Please enter a valid phone number');
        return false;
      }
    }

    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateOrder()) return;

    setIsPlacingOrder(true);

    try {
      // Test Firebase connection
      if (!db) {
        throw new Error('Firebase database not initialized');
      }
      
      // Debug cart items structure
      console.log('Cart items before processing:', JSON.stringify(items, null, 2));
      
      // Create order items
      const orderItems: OrderItem[] = items.map((item: any, index: number) => {
        console.log(`Processing cart item ${index}:`, item);
        
        // Cart items should have a nested listing object based on CartItem type
        const listing = item.listing;
        
        if (!listing) {
          console.error(`Cart item ${index} missing listing object:`, item);
          throw new Error(`Cart item ${index + 1} is missing product information. Please refresh your cart.`);
        }
        
        if (!listing.id) {
          console.error(`Cart item ${index} listing missing ID:`, listing);
          throw new Error(`Cart item ${index + 1} is missing product ID. Please refresh your cart.`);
        }
        
        const orderItem = {
          listingId: listing.id,
          sellerId: listing.sellerId || '',
          storeId: listing.storeId || null,
          title: listing.title || 'Unknown Item',
          priceAtPurchase: Number(listing.price) || 0,
          quantity: Number(item.quantity) || 1,
          imageUrl: listing.imageUrl || (listing.imageBase64 ? `data:image/jpeg;base64,${listing.imageBase64}` : ''),
          sellerName: listing.sellerName || 'Unknown Seller',
        };
        
        console.log(`Processed order item ${index}:`, orderItem);
        return orderItem;
      });

      // Prepare shipping address
      const shippingAddress = deliveryMethod === 'delivery' 
        ? `${address.street.trim()}, ${address.city.trim()}`
        : 'Pickup from store';

      // Create order object with proper data types
      const orderData = {
        customerId: user!.uid,
        storeId: orderItems[0]?.storeId || null,
        items: orderItems,
        totalAmount: Number(finalTotal),
        itemSubtotal: Number(totalAmount),
        deliveryCost: Number(deliveryFee),
        status: OrderStatus.PENDING,
        shippingAddress,
        shippingLat: deliveryMethod === 'delivery' && currentLocation ? currentLocation.latitude : null,
        shippingLng: deliveryMethod === 'delivery' && currentLocation ? currentLocation.longitude : null,
        shippingLabel: shippingAddress,
        contactPhone: address.phone?.trim() || user!.phone || '',
        deliveryMethod,
        partnerId: null,
        deliveryPayee: deliveryMethod === 'delivery' ? 'store' : null,
        storeRevenueAmount: Number(totalAmount + (deliveryMethod === 'delivery' ? deliveryFee : 0)),
        partnerDeliveryAmount: deliveryMethod === 'delivery' ? Number(deliveryFee) : 0,
        paymentMethod,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      // Validate order data before saving
      console.log('Final order data:', JSON.stringify(orderData, null, 2));
      
      // Additional validation
      if (!orderData.customerId) {
        throw new Error('Customer ID is missing');
      }
      if (!orderData.items || orderData.items.length === 0) {
        throw new Error('Order has no items');
      }
      if (isNaN(orderData.totalAmount) || orderData.totalAmount <= 0) {
        throw new Error('Invalid order total amount');
      }

      // Save order to Firestore
      console.log('Attempting to save order:', orderData);
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      console.log('Order saved successfully with ID:', docRef.id);

      // Send notification to store owner about new order
      try {
        // Get all unique store owners from order items
        const storeOwnerIds = [...new Set(orderItems.map(item => item.sellerId).filter(Boolean))];
        console.log('Found store owner IDs from order items:', storeOwnerIds);
        console.log('Order items for debugging:', orderItems.map(item => ({
          listingId: item.listingId,
          sellerId: item.sellerId,
          storeId: item.storeId,
          title: item.title,
          sellerName: item.sellerName
        })));
        
        if (storeOwnerIds.length === 0) {
          console.warn('No store owner IDs found in order items');
          console.log('Original cart items before processing:', items.map((item: any) => ({
            id: item.id,
            listing: {
              id: item.listing?.id,
              sellerId: item.listing?.sellerId,
              storeId: item.listing?.storeId,
              title: item.listing?.title,
              sellerName: item.listing?.sellerName
            }
          })));
        } else {
          const notificationService = NotificationService.getInstance();
          
          // Send notification to each unique store owner
          for (const storeOwnerId of storeOwnerIds) {
            console.log('Sending new order notification to store owner:', storeOwnerId);
            console.log('Order notification details:', {
              orderId: docRef.id,
              storeOwnerId,
              customerId: user!.uid,
              finalTotal,
              itemCount: orderItems.filter(item => item.sellerId === storeOwnerId).length,
              totalItemCount: orderItems.length
            });
            
            await notificationService.notifyNewOrder(
              docRef.id,
              storeOwnerId,
              user!.uid,
              finalTotal,
              orderItems.filter(item => item.sellerId === storeOwnerId).length
            );
            console.log('New order notification sent successfully to store owner:', storeOwnerId);
          }
        }
      } catch (notificationError) {
        console.error('Failed to send new order notification:', notificationError);
        console.error('Notification error details:', {
          error: notificationError,
          message: (notificationError as any)?.message,
          stack: (notificationError as any)?.stack
        });
        // Don't fail the order if notification fails
      }

      // Clear cart
      dispatch(clearCart());

      // Show success message
      Alert.alert(
        'Order Placed Successfully!',
        `Your order #${docRef.id.slice(-6)} has been placed. You will receive updates on your order status.`,
        [
          {
            text: 'View Orders',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
              // Navigate to orders screen if available
            },
          },
          {
            text: 'Continue Shopping',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
            },
          },
        ]
      );

    } catch (error: any) {
      console.error('Error placing order:', error);
      console.error('Error details:', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack
      });
      
      let errorMessage = 'Failed to place order. Please try again.';
      
      if (error?.code === 'invalid-argument') {
        errorMessage = 'Invalid order data. Please check your information and try again.';
      } else if (error?.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please login and try again.';
      } else if (error?.code === 'unavailable') {
        errorMessage = 'Service temporarily unavailable. Please try again later.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              {String(items.length)} item{items.length !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.summaryAmount}>K{totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Delivery Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Method</Text>
          
          <TouchableOpacity
            style={[
              styles.optionButton,
              deliveryMethod === 'pickup' && styles.selectedOption
            ]}
            onPress={() => setDeliveryMethod('pickup')}
          >
            <View style={styles.optionContent}>
              <Ionicons name="walk-outline" size={24} color="#007AFF" />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Pickup</Text>
                <Text style={styles.optionSubtitle}>Collect from store</Text>
              </View>
            </View>
            <Text style={styles.optionPrice}>Free</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              deliveryMethod === 'delivery' && styles.selectedOption
            ]}
            onPress={() => setDeliveryMethod('delivery')}
          >
            <View style={styles.optionContent}>
              <Ionicons name="bicycle-outline" size={24} color="#007AFF" />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Delivery</Text>
                <Text style={styles.optionSubtitle}>Delivered to your address</Text>
              </View>
            </View>
            <Text style={styles.optionPrice}>K{deliveryFee.toFixed(2)}</Text>
          </TouchableOpacity>
        </View>

        {/* Delivery Address */}
        {deliveryMethod === 'delivery' && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderWithButton}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
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
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Street Address</Text>
              <TextInput
                style={styles.textInput}
                value={address.street}
                onChangeText={(text) => handleAddressChange('street', text)}
                placeholder="Enter street address"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                style={styles.textInput}
                value={address.city}
                onChangeText={(text) => handleAddressChange('city', text)}
                placeholder="Enter city"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={address.phone}
                onChangeText={(text) => handleAddressChange('phone', text)}
                placeholder="Contact phone number"
                keyboardType="phone-pad"
                placeholderTextColor="#999"
              />
            </View>
          </View>
        )}

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          <TouchableOpacity
            style={[
              styles.optionButton,
              paymentMethod === 'cash' && styles.selectedOption
            ]}
            onPress={() => setPaymentMethod('cash')}
          >
            <View style={styles.optionContent}>
              <Ionicons name="cash-outline" size={24} color="#007AFF" />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Cash on Delivery</Text>
                <Text style={styles.optionSubtitle}>Pay when you receive</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              paymentMethod === 'mobile_money' && styles.selectedOption
            ]}
            onPress={() => setPaymentMethod('mobile_money')}
          >
            <View style={styles.optionContent}>
              <Ionicons name="phone-portrait-outline" size={24} color="#007AFF" />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Mobile Money</Text>
                <Text style={styles.optionSubtitle}>M-Pesa, Airtel Money, etc.</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              paymentMethod === 'bank' && styles.selectedOption
            ]}
            onPress={() => setPaymentMethod('bank')}
          >
            <View style={styles.optionContent}>
              <Ionicons name="card-outline" size={24} color="#007AFF" />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Bank Transfer</Text>
                <Text style={styles.optionSubtitle}>Direct bank payment</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Order Total */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Total</Text>
          
          <View style={styles.totalContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>K{totalAmount.toFixed(2)}</Text>
            </View>
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Delivery</Text>
              <Text style={styles.totalValue}>K{deliveryFee.toFixed(2)}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.totalRow}>
              <Text style={styles.finalTotalLabel}>Total</Text>
              <Text style={styles.finalTotalValue}>K{finalTotal.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.placeOrderButton, isPlacingOrder && styles.buttonDisabled]}
          onPress={handlePlaceOrder}
          disabled={isPlacingOrder}
        >
          <Text style={styles.placeOrderText}>
            {isPlacingOrder ? 'Placing Order...' : `Place Order - K${finalTotal.toFixed(2)}`}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  sectionHeaderWithButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F1ED',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E2DD',
  },
  locationButtonText: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '600',
    marginLeft: 4,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 16,
    color: '#666',
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  selectedOption: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    marginLeft: 12,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  optionPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputHalf: {
    flex: 0.48,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  totalContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 12,
  },
  finalTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  finalTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  bottomContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  placeOrderButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  placeOrderText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CheckoutScreen;