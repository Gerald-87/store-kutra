import React, { useState } from 'react';
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
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

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

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<CheckoutScreenNavigationProp>();
  const { items, totalAmount } = useSelector((state: RootState) => state.cart) as any;
  const { user } = useSelector((state: RootState) => state.auth);

  const deliveryFee = deliveryMethod === 'delivery' ? 5.00 : 0;
  const taxAmount = totalAmount * 0.1; // 10% tax
  const finalTotal = totalAmount + deliveryFee + taxAmount;

  const handleAddressChange = (field: keyof DeliveryAddress, value: string) => {
    setAddress(prev => ({
      ...prev,
      [field]: value,
    }));
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

    if (deliveryMethod === 'delivery') {
      if (!address.street.trim() || !address.city.trim() || !address.phone.trim()) {
        Alert.alert('Error', 'Please fill in address and phone number');
        return false;
      }
    }

    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateOrder()) return;

    setIsPlacingOrder(true);

    try {
      // Create order items
      const orderItems: OrderItem[] = items.map((item: any) => ({
        listingId: item.listing.id,
        sellerId: item.listing.sellerId,
        storeId: item.listing.storeId,
        title: item.listing.title,
        priceAtPurchase: item.listing.price,
        quantity: item.quantity,
        imageUrl: item.listing.imageUrl,
        sellerName: item.listing.sellerName,
      }));

      // Create order object
      const orderData: Omit<Order, 'id'> = {
        customerId: user!.uid,
        storeId: items[0]?.listing.storeId, // Assuming single store for now
        items: orderItems,
        totalAmount: finalTotal,
        itemSubtotal: totalAmount,
        deliveryCost: deliveryFee,
        status: OrderStatus.PENDING,
        shippingAddress: deliveryMethod === 'delivery' 
          ? `${address.street}, ${address.city}`
          : 'Pickup',
        contactPhone: address.phone || user!.phone || '',
        deliveryMethod,
        paymentMethod,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save order to Firestore
      const docRef = await addDoc(collection(db, 'orders'), orderData);

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

    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', 'Failed to place order. Please try again.');
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
              {items.length} item{items.length !== 1 ? 's' : ''}
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
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            
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
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax (10%)</Text>
              <Text style={styles.totalValue}>K{taxAmount.toFixed(2)}</Text>
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