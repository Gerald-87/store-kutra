import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { SwapRequest } from '../types';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import AuthGuard from '../components/AuthGuard';
import { safeFormatDate } from '../utils/textUtils';

const MyRequestsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth) as any;
  
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');
  const [sentRequests, setSentRequests] = useState<SwapRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [user]);

  const loadRequests = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      await Promise.all([
        loadSentRequests(),
        loadReceivedRequests(),
      ]);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSentRequests = async () => {
    if (!user?.uid) return;
    
    try {
      const q = query(
        collection(db, 'swapRequests'),
        where('fromUserId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const requests: SwapRequest[] = [];
      
      querySnapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() } as SwapRequest);
      });
      
      setSentRequests(requests);
    } catch (error) {
      console.error('Error loading sent requests:', error);
    }
  };

  const loadReceivedRequests = async () => {
    if (!user?.uid) return;
    
    try {
      const q = query(
        collection(db, 'swapRequests'),
        where('toUserId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const requests: SwapRequest[] = [];
      
      querySnapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() } as SwapRequest);
      });
      
      setReceivedRequests(requests);
    } catch (error) {
      console.error('Error loading received requests:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return '#10B981';
      case 'rejected':
        return '#EF4444';
      case 'pending':
        return '#F59E0B';
      case 'completed':
        return '#6366F1';
      default:
        return '#8B7355';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'checkmark-circle';
      case 'rejected':
        return 'close-circle';
      case 'pending':
        return 'time';
      case 'completed':
        return 'trophy';
      default:
        return 'help-circle';
    }
  };

  const renderRequestCard = ({ item }: { item: SwapRequest }) => {
    const isMyRequest = activeTab === 'sent';
    
    return (
      <TouchableOpacity style={styles.requestCard} activeOpacity={0.7}>
        <View style={styles.requestHeader}>
          <View style={styles.swapIndicator}>
            <View style={styles.swapItemContainer}>
              <Text style={styles.swapItemLabel}>
                {isMyRequest ? 'Your Item:' : 'Their Item:'}
              </Text>
              <Text style={styles.swapItemTitle} numberOfLines={2}>
                {isMyRequest ? item.fromListingTitle : item.toListingTitle}
              </Text>
            </View>
            
            <View style={styles.swapArrow}>
              <Ionicons 
                name={isMyRequest ? 'arrow-forward' : 'arrow-back'} 
                size={20} 
                color="#8B4513" 
              />
            </View>
            
            <View style={styles.swapItemContainer}>
              <Text style={styles.swapItemLabel}>
                {isMyRequest ? 'Their Item:' : 'Your Item:'}
              </Text>
              <Text style={styles.swapItemTitle} numberOfLines={2}>
                {isMyRequest ? item.toListingTitle : item.fromListingTitle}
              </Text>
            </View>
          </View>
          
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) }
          ]}>
            <Ionicons 
              name={getStatusIcon(item.status) as any} 
              size={12} 
              color="#FFFFFF" 
            />
            <Text style={styles.statusText}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.requestDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={16} color="#8B7355" />
            <Text style={styles.detailLabel}>
              {isMyRequest ? 'Requested from:' : 'Requested by:'}
            </Text>
            <Text style={styles.detailValue}>
              {/* Note: SwapRequest doesn't include user names, showing User instead */}
              User
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color="#8B7355" />
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>
              {safeFormatDate(item.createdAt, 'Unknown date')}
            </Text>
          </View>
        </View>

        {item.message && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Message:</Text>
            <Text style={styles.messageText} numberOfLines={3}>
              {item.message}
            </Text>
          </View>
        )}

        {/* Action buttons for received requests */}
        {activeTab === 'received' && item.status === 'pending' && (
          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.rejectButton}>
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptButton}>
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (type: string) => (
    <View style={styles.emptyState}>
      <Ionicons name="swap-horizontal-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>
        No {type} swap requests
      </Text>
      <Text style={styles.emptyText}>
        {type === 'sent' 
          ? 'You haven\'t made any swap requests yet'
          : 'You haven\'t received any swap requests yet'
        }
      </Text>
    </View>
  );

  const currentData = activeTab === 'sent' ? sentRequests : receivedRequests;

  return (
    <AuthGuard
      fallbackTitle="Manage Your Requests"
      fallbackMessage="Sign in to view and manage your swap requests"
      fallbackIcon="chatbubbles-outline"
    >
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
          <Text style={styles.headerTitle}>My Requests</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
            onPress={() => setActiveTab('sent')}
          >
            <Ionicons 
              name="arrow-up-outline" 
              size={18} 
              color={activeTab === 'sent' ? '#8B4513' : '#8B7355'} 
            />
            <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
              Sent ({String(sentRequests.length)})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'received' && styles.activeTab]}
            onPress={() => setActiveTab('received')}
          >
            <Ionicons 
              name="arrow-down-outline" 
              size={18} 
              color={activeTab === 'received' ? '#8B4513' : '#8B7355'} 
            />
            <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
              Received ({String(receivedRequests.length)})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <FlatList
          key={`requests-${activeTab}`}
          data={currentData}
          renderItem={renderRequestCard}
          keyExtractor={(item) => item.id || Math.random().toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#8B4513']}
              tintColor="#8B4513"
            />
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B4513" />
                <Text style={styles.loadingText}>Loading requests...</Text>
              </View>
            ) : (
              renderEmptyState(activeTab)
            )
          }
        />
      </SafeAreaView>
    </AuthGuard>
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
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#8B4513',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B7355',
  },
  activeTabText: {
    color: '#8B4513',
  },
  listContainer: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  requestHeader: {
    marginBottom: 12,
  },
  swapIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  swapItemContainer: {
    flex: 1,
  },
  swapItemLabel: {
    fontSize: 12,
    color: '#8B7355',
    fontWeight: '600',
    marginBottom: 2,
  },
  swapItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1810',
    lineHeight: 18,
  },
  swapArrow: {
    marginHorizontal: 12,
    paddingVertical: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  requestDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#8B7355',
    fontWeight: '500',
    minWidth: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#2D1810',
    fontWeight: '600',
    flex: 1,
  },
  messageContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F7F3F0',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#8B4513',
  },
  messageLabel: {
    fontSize: 12,
    color: '#8B7355',
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#2D1810',
    lineHeight: 18,
  },
  actionContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 12,
  },
});

export default MyRequestsScreen;