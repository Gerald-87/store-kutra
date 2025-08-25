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
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../store';
import { fetchConversations } from '../store/slices/chatSlice';
import { Message } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

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
  const { user } = useSelector((state: RootState) => state.auth) as any;
  const { conversations, isLoading } = useSelector((state: RootState) => state.chat) as any;
  
  const [conversationPreviews, setConversationPreviews] = useState<ConversationPreview[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (conversations && user?.uid) {
      generateConversationPreviews();
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
    if (!conversations || !user?.uid) return;

    const previews: ConversationPreview[] = [];
    
    Object.entries(conversations).forEach(([conversationKey, messages]) => {
      if (!Array.isArray(messages) || messages.length === 0) return;
      
      // Sort messages by timestamp (newest first)
      const sortedMessages = [...messages].sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA;
      });
      
      const lastMessage = sortedMessages[0];
      
      // Determine the other user
      const otherUserId = lastMessage.fromUserId === user.uid 
        ? lastMessage.toUserId 
        : lastMessage.fromUserId;
      const otherUserName = lastMessage.fromUserId === user.uid 
        ? lastMessage.toUserName 
        : lastMessage.fromUserName;
      
      // Count unread messages
      const unreadCount = sortedMessages.filter(
        msg => msg.toUserId === user.uid && !msg.isRead
      ).length;
      
      previews.push({
        conversationKey,
        otherUserId,
        otherUserName,
        lastMessage,
        unreadCount,
        listingId: lastMessage.listingId,
      });
    });
    
    // Sort by last message timestamp
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
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins < 1 ? 'Just now' : `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
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
            uri: 'https://placehold.co/50x50.png?text=' + item.otherUserName.charAt(0)
          }}
          style={styles.avatar}
        />
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.otherUserName}
          </Text>
          <Text style={styles.timestamp}>
            {formatTimestamp(item.lastMessage.timestamp)}
          </Text>
        </View>
        
        {item.listingId && (
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
          {item.lastMessage.content}
        </Text>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#8B7355" />
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="log-in-outline" size={64} color="#8B7355" />
          <Text style={styles.emptyTitle}>Login Required</Text>
          <Text style={styles.emptyText}>
            Please login to view your conversations
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#8B4513" />
        </TouchableOpacity>
      </View>

      {conversationPreviews.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color="#8B7355" />
          <Text style={styles.emptyTitle}>No Conversations</Text>
          <Text style={styles.emptyText}>
            Start chatting with sellers and buyers.{"\n"}
            Your conversations will appear here.
          </Text>
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
        />
      )}
    </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D1810',
  },
  refreshButton: {
    padding: 4,
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
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
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default ChatScreen;