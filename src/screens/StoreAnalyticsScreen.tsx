import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../store';
import { fetchStoreDashboardData } from '../store/slices/dashboardSlice';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type StoreAnalyticsNavigationProp = StackNavigationProp<any, 'StoreAnalytics'>;

const StoreAnalyticsScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<StoreAnalyticsNavigationProp>();
  const { user } = useSelector((state: RootState) => state.auth) as any;
  
  // Get analytics data from Redux store
  const dashboardState = useSelector((state: RootState) => state.dashboard) as any;
  
  const {
    currentStore,
    isLoading,
    error,
    stats,
    analytics
  } = dashboardState;

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      if (!user?.uid) {
        console.error('No user ID available');
        return;
      }
      
      console.log('Loading analytics data for user:', user.uid);
      await dispatch(fetchStoreDashboardData(user.uid));
    } catch (error) {
      console.error('Error loading analytics data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => `K${amount.toFixed(2)}`;

  const renderSalesChart = () => {
    const salesData = analytics.salesByDay || [];
    const maxAmount = Math.max(...salesData.map((day: any) => day.amount), 1);
    const chartHeight = 120;
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>7-Day Sales Trend</Text>
        {salesData.length > 0 ? (
          <View style={styles.chartArea}>
            {salesData.map((day: any, index: number) => {
              const barHeight = Math.max((day.amount / maxAmount) * chartHeight * 0.8, 4);
              return (
                <View key={index} style={styles.chartBar}>
                  <View style={[styles.bar, { height: barHeight }]} />
                  <Text style={styles.chartLabel}>
                    {new Date(day.date).getDate()}
                  </Text>
                  <Text style={styles.chartValue}>
                    K{day.amount.toFixed(0)}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="bar-chart-outline" size={48} color="#D2B48C" />
            <Text style={styles.noDataText}>No sales data available</Text>
          </View>
        )}
      </View>
    );
  };

  const renderPaymentAnalysis = () => {
    const paymentData = analytics.paymentTypes || [];
    
    return (
      <View style={styles.analysisContainer}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        {paymentData.length > 0 ? (
          paymentData.map((payment: any, index: number) => (
            <View key={index} style={styles.paymentRow}>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentType}>{payment.type}</Text>
                <Text style={styles.paymentCount}>{payment.count} orders</Text>
              </View>
              <Text style={styles.paymentAmount}>
                {formatCurrency(payment.amount)}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="card-outline" size={48} color="#D2B48C" />
            <Text style={styles.noDataText}>No payment data available</Text>
          </View>
        )}
      </View>
    );
  };

  const renderTopProducts = () => {
    const productData = analytics.topProducts || [];
    
    return (
      <View style={styles.analysisContainer}>
        <Text style={styles.sectionTitle}>Top Products</Text>
        {productData.length > 0 ? (
          productData.map((product: any, index: number) => (
            <View key={index} style={styles.productRow}>
              <View style={styles.rankContainer}>
                <Text style={styles.rank}>#{String(index + 1)}</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productSold}>{product.sold} sold</Text>
              </View>
              <Text style={styles.productRevenue}>
                {formatCurrency(product.revenue)}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="trophy-outline" size={48} color="#D2B48C" />
            <Text style={styles.noDataText}>No product sales data available</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Store Analytics</Text>
        <Text style={styles.storeSubtitle}>
          {currentStore?.name || 'Your Store'}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#8B4513']}
            tintColor="#8B4513"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Key Metrics Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Ionicons name="cash-outline" size={24} color="#10B981" />
              <Text style={styles.metricValue}>
                {formatCurrency(stats.totalRevenue)}
              </Text>
              <Text style={styles.metricLabel}>Total Revenue</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="trending-up-outline" size={24} color="#F59E0B" />
              <Text style={styles.metricValue}>
                {formatCurrency(stats.todaysSales)}
              </Text>
              <Text style={styles.metricLabel}>Today's Sales</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="bag-check-outline" size={24} color="#8B5CF6" />
              <Text style={styles.metricValue}>{stats.totalSold}</Text>
              <Text style={styles.metricLabel}>Items Sold</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="receipt-outline" size={24} color="#EF4444" />
              <Text style={styles.metricValue}>{stats.todaysOrders}</Text>
              <Text style={styles.metricLabel}>Today's Orders</Text>
            </View>
          </View>
        </View>

        {/* Sales Chart */}
        <View style={styles.section}>
          {renderSalesChart()}
        </View>

        {/* Payment Analysis */}
        <View style={styles.section}>
          {renderPaymentAnalysis()}
        </View>

        {/* Top Products */}
        <View style={styles.section}>
          {renderTopProducts()}
        </View>

        {/* Additional Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Statistics</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.pendingOrders}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.deliveredOrders}</Text>
              <Text style={styles.statLabel}>Delivered</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.cancelledOrders}</Text>
              <Text style={styles.statLabel}>Cancelled</Text>
            </View>
          </View>
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
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 4,
  },
  storeSubtitle: {
    fontSize: 16,
    color: '#8B7355',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#F7F3F0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D1810',
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#8B7355',
    textAlign: 'center',
  },
  chartContainer: {
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
    marginBottom: 16,
  },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 8,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    backgroundColor: '#8B4513',
    width: 20,
    borderRadius: 4,
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 12,
    color: '#8B7355',
    marginBottom: 4,
  },
  chartValue: {
    fontSize: 10,
    color: '#8B7355',
    fontWeight: '500',
  },
  analysisContainer: {
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
    textTransform: 'capitalize',
  },
  paymentCount: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B4513',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rankContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rank: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
  },
  productSold: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 2,
  },
  productRevenue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B4513',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#8B4513',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#8B7355',
    fontWeight: '500',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default StoreAnalyticsScreen;