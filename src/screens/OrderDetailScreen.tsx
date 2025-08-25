import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type OrderDetailNavigationProp = StackNavigationProp<RootStackParamList, 'OrderDetail'>;

interface OrderDetailRouteParams {
  order: any;
}

const OrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<OrderDetailNavigationProp>();
  const route = useRoute();
  const { order } = route.params as OrderDetailRouteParams;

  const getStatusColor = (status: string) => {
    switch ((status || '').toLowerCase().replace(' ', '')) {
      case 'pending':
        return '#F59E0B';
      case 'intransit':
        return '#06B6D4';
      case 'delivered':
        return '#059669';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch ((status || '').toLowerCase().replace(' ', '')) {
      case 'pending':
        return 'time-outline';
      case 'intransit':
        return 'car-outline';
      case 'delivered':
        return 'home-outline';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'help-outline';
    }
  };

  const getStatusSteps = () => {
    const allStatuses = ['pending', 'in transit', 'delivered'];
    let currentStatusIndex = -1;
    
    // Handle cancelled status separately as it's not in the normal flow
    if ((order.status || '').toLowerCase() === 'cancelled') {
      return [
        { status: 'cancelled', label: 'Cancelled', isCompleted: true, isCurrent: true }
      ];
    }
    
    // Find current status index
    currentStatusIndex = allStatuses.findIndex(s => 
      s.toLowerCase().replace(' ', '') === (order.status || '').toLowerCase().replace(' ', '')
    );
    
    return allStatuses.map((status, index) => ({
      status,
      label: status.charAt(0).toUpperCase() + status.slice(1),
      isCompleted: index <= currentStatusIndex,
      isCurrent: index === currentStatusIndex,
    }));
  };

  const renderStatusProgress = () => {
    const steps = getStatusSteps();

    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressTitle}>Order Progress</Text>
        {steps.map((step, index) => (
          <View key={step.status} style={styles.progressStep}>
            <View style={styles.progressLine}>
              <View
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: step.isCompleted ? getStatusColor(step.status) : '#E5E7EB',
                  },
                ]}
              >
                <Ionicons
                  name={getStatusIcon(step.status) as any}
                  size={16}
                  color={step.isCompleted ? '#FFFFFF' : '#9CA3AF'}
                />
              </View>
              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.progressConnector,
                    {
                      backgroundColor: step.isCompleted ? getStatusColor(step.status) : '#E5E7EB',
                    },
                  ]}
                />
              )}
            </View>
            <View style={styles.progressLabel}>
              <Text
                style={[
                  styles.progressText,
                  {
                    color: step.isCompleted ? getStatusColor(step.status) : '#9CA3AF',
                    fontWeight: step.isCurrent ? '700' : '500',
                  },
                ]}
              >
                {step.label}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderOrderItems = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Order Items</Text>
      {order.items?.map((item: any, index: number) => (
        <View key={index} style={styles.orderItem}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.title || item.name}</Text>
            <Text style={styles.itemDetails}>
              Quantity: {item.quantity} × K{item.priceAtPurchase?.toFixed(2) || '0.00'}
            </Text>
          </View>
          <Text style={styles.itemTotal}>
            K{((item.quantity || 1) * (item.priceAtPurchase || 0)).toFixed(2)}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderOrderSummary = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Order Summary</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotal:</Text>
        <Text style={styles.summaryValue}>K{order.itemSubtotal?.toFixed(2) || '0.00'}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Delivery Cost:</Text>
        <Text style={styles.summaryValue}>K{order.deliveryCost?.toFixed(2) || '0.00'}</Text>
      </View>
      <View style={[styles.summaryRow, styles.totalRow]}>
        <Text style={styles.totalLabel}>Total:</Text>
        <Text style={styles.totalValue}>K{order.totalAmount?.toFixed(2) || '0.00'}</Text>
      </View>
    </View>
  );

  const renderOrderInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Order Information</Text>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Order ID:</Text>
        <Text style={styles.infoValue}>#{order.id?.slice(-6).toUpperCase()}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Payment Method:</Text>
        <Text style={styles.infoValue}>
          {order.paymentMethod?.replace('_', ' ').toUpperCase() || 'N/A'}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Delivery Method:</Text>
        <Text style={styles.infoValue}>
          {order.deliveryMethod === 'pickup' ? 'Store Pickup' : 'Delivery'}
        </Text>
      </View>
      {order.shippingAddress && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Delivery Address:</Text>
          <Text style={styles.infoValue}>{order.shippingAddress}</Text>
        </View>
      )}
      {order.contactPhone && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Contact Phone:</Text>
          <Text style={styles.infoValue}>{order.contactPhone}</Text>
        </View>
      )}
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Order Date:</Text>
        <Text style={styles.infoValue}>
          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
        </Text>
      </View>
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
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Current Status Badge */}
        <View style={styles.statusBadgeContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
            <Ionicons 
              name={getStatusIcon(order.status) as any} 
              size={20} 
              color={getStatusColor(order.status)} 
            />
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
              {order.status}
            </Text>
          </View>
        </View>

        {/* Status Progress */}
        {renderStatusProgress()}

        {/* Order Items */}
        {renderOrderItems()}

        {/* Order Summary */}
        {renderOrderSummary()}

        {/* Order Information */}
        {renderOrderInfo()}
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
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  statusBadgeContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 16,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLine: {
    alignItems: 'center',
    width: 40,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressConnector: {
    width: 2,
    height: 20,
    marginTop: 4,
  },
  progressLabel: {
    flex: 1,
    marginLeft: 12,
  },
  progressText: {
    fontSize: 14,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 12,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1810',
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: 12,
    color: '#8B7355',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B4513',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#8B7355',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1810',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E8E2DD',
    marginTop: 8,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1810',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B4513',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: '#8B7355',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1810',
    flex: 1,
    textAlign: 'right',
  },
});

export default OrderDetailScreen;