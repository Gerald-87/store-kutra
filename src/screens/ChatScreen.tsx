import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../store';
import { fetchConversations } from '../store/slices/chatSlice';
import { Message } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { safeFormatRelativeTime } from '../utils/textUtils';

type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface ConversationPreview {
  conversationKey: string;
  otherUserId: string;
  otherUserName: string;
  lastMessage: Message;
  unreadCount: number;
  listingId?: string;
}

const ChatScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state: RootState) => state.auth) as any;
  const { conversations, isLoading } = useSelector((state: RootState) => state.chat) as any;
  
  const [conversationPreviews, setConversationPreviews] = useState<ConversationPreview[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load conversations when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.uid) {
        loadConversations();
      }
    }, [user])
  );

  useEffect(() => {
    if (user?.uid) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (conversations && user?.uid) {
      generateConversationPreviews();
      setInitialLoading(false);
    }
  }, [conversations, user]);

  const loadConversations = async () => {
    if (!user?.uid) return;
    
    try {
      await dispatch(fetchConversations(user.uid));
    } catch (error) {
      console.error('Error loading conversations:', error);
      Alert.alert('Error', 'Failed to load conversations');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const generateConversationPreviews = () => {
    if (!conversations || !user?.uid) {
      setConversationPreviews([]);
      return;
    }

    const previews: ConversationPreview[] = [];
    const conversationMap = new Map<string, Message[]>();
    
    // First, collect all messages and group them by conversation partners
    Object.entries(conversations).forEach(([conversationKey, messages]) => {
      if (!Array.isArray(messages) || messages.length === 0) return;
      
      // Sort messages by timestamp (newest first)
      const sortedMessages = [...messages].sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA;
      });
      
      // Group messages by other user to handle multiple conversations with same person
      sortedMessages.forEach(message => {
        const otherUserId = message.fromUserId === user.uid 
          ? message.toUserId 
          : message.fromUserId;
        
        if (!otherUserId) return;
        
        const key = otherUserId;
        if (!conversationMap.has(key)) {
          conversationMap.set(key, []);
        }
        conversationMap.get(key)!.push(message);
      });
    });
    
    // Create conversation previews from grouped messages
    conversationMap.forEach((messages, otherUserId) => {
      if (messages.length === 0) return;
      
      // Sort messages for this conversation by timestamp (newest first)
      const sortedMessages = messages.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA;
      });
      
      const lastMessage = sortedMessages[0];
      
      // Determine the other user details
      const otherUserName = lastMessage.fromUserId === user.uid 
        ? lastMessage.toUserName 
        : lastMessage.fromUserName;
      
      // Skip if we can't determine the other user
      if (!otherUserId || !otherUserName) return;
      
      // Count unread messages
      const unreadCount = sortedMessages.filter(
        msg => msg.toUserId === user.uid && !msg.isRead
      ).length;
      
      // Generate conversation key for navigation
      const conversationKey = [user.uid, otherUserId].sort().join('_');
      
      previews.push({
        conversationKey,
        otherUserId,
        otherUserName,
        lastMessage,
        unreadCount,
        listingId: lastMessage.listingId,
      });
    });
    
    // Sort by last message timestamp (most recent first)
    previews.sort((a, b) => {
      const timeA = new Date(a.lastMessage.timestamp).getTime();
      const timeB = new Date(b.lastMessage.timestamp).getTime();
      return timeB - timeA;
    });
    
    setConversationPreviews(previews);
  };

  const handleConversationPress = (preview: ConversationPreview) => {
    navigation.navigate('Conversation', {
      conversationId: preview.conversationKey,
      otherUserId: preview.otherUserId,
      otherUserName: preview.otherUserName,
      listingId: preview.listingId,
    });
  };

  const formatTimestamp = (timestamp: any) => {
    return safeFormatRelativeTime(timestamp, 'Unknown');
  };

  const renderConversationItem = ({ item }: { item: ConversationPreview }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => handleConversationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={{
            uri: 'https://placehold.co/50x50.png?text=' + (item.otherUserName?.charAt(0) || 'U')
          }}
          style={styles.avatar}
        />
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount.toString()}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.otherUserName || 'Unknown User'}
          </Text>
          <Text style={styles.timestamp}>
            {formatTimestamp(item.lastMessage.timestamp)}
          </Text>
        </View>
        
        {item.listingId && item.lastMessage.listingTitle && (
          <Text style={styles.listingTitle} numberOfLines={1}>
            📦 {item.lastMessage.listingTitle}
          </Text>
        )}
        
        <Text
          style={[
            styles.lastMessage,
            item.unreadCount > 0 && styles.unreadMessage
          ]}
          numberOfLines={2}
        >
          {item.lastMessage.content || 'No message content'}
        </Text>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#8B7355" />
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.emptyState}>
          <Ionicons name="log-in-outline" size={64} color="#D2B48C" />
          <Text style={styles.emptyTitle}>Login Required</Text>
          <Text style={styles.emptyText}>
            Please login to view your conversations
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalUnreadCount = conversationPreviews.reduce((sum, conv) => sum + conv.unreadCount, 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerActions}>
          {totalUnreadCount > 0 && (
            <View style={styles.headerUnreadBadge}>
              <Text style={styles.headerUnreadText}>
                {totalUnreadCount > 99 ? '99+' : String(totalUnreadCount)}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#8B4513" />
          </TouchableOpacity>
        </View>
      </View>

      {initialLoading && isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#8B4513" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : conversationPreviews.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color="#D2B48C" />
          <Text style={styles.emptyTitle}>No Conversations</Text>
          <Text style={styles.emptyText}>
            Start chatting with sellers and buyers.{"\n"}
            Your conversations will appear here.
          </Text>
          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={() => navigation.navigate('Home' as any)}
          >
            <Text style={styles.exploreButtonText}>Start Exploring</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversationPreviews}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.conversationKey}
          style={styles.conversationsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#8B4513']}
              tintColor="#8B4513"
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#E8E2DD' }} />}
        />
      )}
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerUnreadBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerUnreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  refreshButton: {
    padding: 4,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8B7355',
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5F1ED',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#8B7355',
  },
  listingTitle: {
    fontSize: 12,
    color: '#8B4513',
    fontWeight: '500',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: '#8B7355',
    lineHeight: 18,
  },
  unreadMessage: {
    color: '#2D1810',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D1810',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatScreen;