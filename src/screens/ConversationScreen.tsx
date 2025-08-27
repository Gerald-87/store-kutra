import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Linking,
  Keyboard,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { sendMessage, setConversationMessages } from '../store/slices/chatSlice';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Message, Listing } from '../types';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  or,
  and,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import LocationService, { LocationData } from '../services/LocationService';
import { safeFormatRelativeTime } from '../utils/textUtils';

type ConversationScreenRouteProp = RouteProp<RootStackParamList, 'Conversation'>;

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isCurrentUser }) => {
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.warn('Error formatting time:', error);
      return '';
    }
  };

  return (
    <View style={[
      styles.messageBubble,
      isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
    ]}>
      <Text style={[
        styles.messageText,
        isCurrentUser ? styles.currentUserText : styles.otherUserText
      ]}>
        {message.content}
      </Text>
      <Text style={[
        styles.messageTime,
        isCurrentUser ? styles.currentUserTime : styles.otherUserTime
      ]}>
        {formatTime(message.timestamp)}
      </Text>
    </View>
  );
};

const ConversationScreen: React.FC = () => {
  const route = useRoute<ConversationScreenRouteProp>();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth) as any;
  const { isLoading } = useSelector((state: RootState) => state.chat);
  
  const { conversationId, otherUserId, otherUserName, listingId } = route.params;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [listingData, setListingData] = useState<Listing | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (user?.uid && conversationId) {
      loadMessages();
      subscribeToMessages();
    }
    
    // Keyboard event listeners
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to bottom when keyboard opens with better timing
        setTimeout(() => {
          if (flatListRef.current && messages.length > 0) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, Platform.OS === 'ios' ? 50 : 200);
      }
    );
    
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [user?.uid, conversationId, messages.length]);

  useEffect(() => {
    // Load listing data if available
    if (listingId) {
      loadListingData();
    }
  }, [listingId]);

  useEffect(() => {
    // Set navigation title
    navigation.setOptions({
      title: otherUserName || 'Chat',
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            style={{ marginRight: 16 }}
            onPress={() => setShowQuickActions(true)}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#8B4513" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ marginRight: 16 }}
            onPress={() => {
              if (listingId) {
                (navigation as any).navigate('ProductDetail', { 
                  productId: listingId, 
                  listingId 
                });
              }
            }}
          >
            <Ionicons name="information-circle-outline" size={24} color="#8B4513" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, otherUserName, listingId]);

  const loadListingData = async () => {
    if (!listingId) return;
    
    try {
      const docRef = doc(db, 'listings', listingId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setListingData({ id: docSnap.id, ...docSnap.data() } as Listing);
      }
    } catch (error) {
      console.error('Error loading listing data:', error);
    }
  };

  const loadMessages = async () => {
    if (!user?.uid || !conversationId) {
      console.warn('Missing user ID or conversation ID for loading messages');
      return;
    }
    
    try {
      // Query messages for this conversation
      const messagesQuery = query(
        collection(db, 'messages'),
        or(
          and(
            where('fromUserId', '==', user.uid),
            where('toUserId', '==', otherUserId)
          ),
          and(
            where('fromUserId', '==', otherUserId),
            where('toUserId', '==', user.uid)
          )
        ),
        orderBy('timestamp', 'asc')
      );
      
      const snapshot = await getDocs(messagesQuery);
      const messageList: Message[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data && data.content) {  // Validate message data
          messageList.push({
            id: doc.id,
            ...data,
            conversationKey: conversationId,
          } as Message);
        }
      });
      
      setMessages(messageList);
      dispatch(setConversationMessages({
        conversationKey: conversationId,
        messages: messageList
      }));
      
      // Scroll to bottom after loading with improved timing
      setTimeout(() => {
        if (flatListRef.current && messageList.length > 0) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 300);
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages. Please check your connection.');
    }
  };

  const subscribeToMessages = () => {
    if (!user?.uid || !conversationId) {
      console.warn('Missing user ID or conversation ID for message subscription');
      return;
    }
    
    try {
      const messagesQuery = query(
        collection(db, 'messages'),
        or(
          and(
            where('fromUserId', '==', user.uid),
            where('toUserId', '==', otherUserId)
          ),
          and(
            where('fromUserId', '==', otherUserId),
            where('toUserId', '==', user.uid)
          )
        ),
        orderBy('timestamp', 'asc')
      );
      
      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messageList: Message[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data && data.content) {  // Validate message data
            messageList.push({
              id: doc.id,
              ...data,
              conversationKey: conversationId,
            } as Message);
          }
        });
        
        setMessages(messageList);
        
        // Auto-scroll to bottom when new messages arrive with improved timing
        setTimeout(() => {
          if (flatListRef.current && messageList.length > 0) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 200);
      }, (error) => {
        console.error('Error in message subscription:', error);
        // Don't show alert for subscription errors as they might be temporary
      });
      
      unsubscribeRef.current = unsubscribe;
    } catch (error) {
      console.error('Error setting up message subscription:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.uid || sending) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);
    
    // Keep input focused for continuous messaging
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
    
    try {
      const messageData = {
        fromUserId: user.uid,
        fromUserName: user.name,
        toUserId: otherUserId,
        toUserName: otherUserName,
        content: messageText,
        isRead: false,
        conversationKey: conversationId,
        participants: [user.uid, otherUserId],
        ...(listingId && { listingId })
      };
      
      await dispatch(sendMessage(messageData)).unwrap();
      
      // Auto-scroll to bottom after sending with improved timing
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 150);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setNewMessage(messageText); // Restore message text
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.fromUserId === user?.uid;
    return (
      <MessageBubble 
        message={item} 
        isCurrentUser={isCurrentUser}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color="#D2B48C" />
      <Text style={styles.emptyTitle}>Start the conversation</Text>
      <Text style={styles.emptyText}>
        Send a message to {otherUserName} to begin chatting.
      </Text>
    </View>
  );

  const handleShareCurrentLocation = async () => {
    try {
      const location = await LocationService.getCurrentLocationWithAddress();
      if (location) {
        const locationMessage = `📍 My current location: ${location.address}\n\nLatitude: ${location.latitude}\nLongitude: ${location.longitude}`;
        await sendLocationMessage(locationMessage);
        setShowLocationPicker(false);
      } else {
        Alert.alert('Error', 'Could not get your current location');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get location');
    }
  };

  const handleShareListingLocation = async () => {
    if (!listingData?.location) return;
    
    const locationMessage = `📍 Item location: ${listingData.location.address}\n\nLatitude: ${listingData.location.latitude}\nLongitude: ${listingData.location.longitude}`;
    await sendLocationMessage(locationMessage);
    setShowLocationPicker(false);
  };

  const sendLocationMessage = async (locationText: string) => {
    if (!user?.uid) return;
    
    try {
      const messageData = {
        fromUserId: user.uid,
        fromUserName: user.name,
        toUserId: otherUserId,
        toUserName: otherUserName,
        content: locationText,
        isRead: false,
        conversationKey: conversationId,
        participants: [user.uid, otherUserId],
        ...(listingId && { listingId })
      };
      
      await dispatch(sendMessage(messageData)).unwrap();
    } catch (error) {
      console.error('Error sending location:', error);
      Alert.alert('Error', 'Failed to share location');
    }
  };

  const renderQuickActions = () => {
    const actions = [];
    
    // Phone call action
    if (listingData?.contactInfo?.phone) {
      actions.push(
        <TouchableOpacity
          key="phone"
          style={styles.quickAction}
          onPress={() => {
            Linking.openURL(`tel:${listingData.contactInfo?.phone}`);
            setShowQuickActions(false);
          }}
        >
          <Ionicons name="call" size={24} color="#10B981" />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Call</Text>
            <Text style={styles.actionSubtitle}>{listingData.contactInfo?.phone}</Text>
          </View>
        </TouchableOpacity>
      );
    }
    
    // WhatsApp action
    if (listingData?.contactInfo?.whatsapp) {
      actions.push(
        <TouchableOpacity
          key="whatsapp"
          style={styles.quickAction}
          onPress={() => {
            const whatsappUrl = `whatsapp://send?phone=${listingData.contactInfo?.whatsapp}`;
            Linking.openURL(whatsappUrl).catch(() => {
              Alert.alert('Error', 'WhatsApp is not installed');
            });
            setShowQuickActions(false);
          }}
        >
          <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>WhatsApp</Text>
            <Text style={styles.actionSubtitle}>{listingData.contactInfo?.whatsapp}</Text>
          </View>
        </TouchableOpacity>
      );
    }
    
    // Meeting suggestion for swaps
    if (listingData?.type === 'Swap') {
      actions.push(
        <TouchableOpacity
          key="meeting"
          style={styles.quickAction}
          onPress={() => {
            const meetingMessage = `Let's meet up to exchange our items! When and where would be convenient for you? 🤝`;
            setNewMessage(meetingMessage);
            setShowQuickActions(false);
          }}
        >
          <Ionicons name="people" size={24} color="#8B4513" />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Suggest Meeting</Text>
            <Text style={styles.actionSubtitle}>Propose a meetup for item exchange</Text>
          </View>
        </TouchableOpacity>
      );
    }
    
    // Rental inquiry
    if (listingData?.type === 'Rent') {
      actions.push(
        <TouchableOpacity
          key="rental"
          style={styles.quickAction}
          onPress={() => {
            const rentalMessage = `I'm interested in renting this ${listingData.propertyType || 'item'}. Is it still available? What are the rental terms? 🏠`;
            setNewMessage(rentalMessage);
            setShowQuickActions(false);
          }}
        >
          <Ionicons name="calendar" size={24} color="#8B4513" />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Rental Inquiry</Text>
            <Text style={styles.actionSubtitle}>Ask about availability and terms</Text>
          </View>
        </TouchableOpacity>
      );
    }
    
    return actions.length > 0 ? actions : (
      <View style={styles.noActionsContainer}>
        <Text style={styles.noActionsText}>No quick actions available</Text>
      </View>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.loginPrompt}>Please login to access chat</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id || Math.random().toString()}
          contentContainerStyle={[
            styles.messagesList,
            messages.length === 0 && styles.emptyMessagesList
          ]}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
          onContentSizeChange={() => {
            if (flatListRef.current && messages.length > 0) {
              flatListRef.current.scrollToEnd({ animated: false });
            }
          }}
          onLayout={() => {
            if (flatListRef.current && messages.length > 0) {
              flatListRef.current.scrollToEnd({ animated: false });
            }
          }}
        />
        
        {/* Message Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowLocationPicker(true)}
            >
              <Ionicons name="location" size={20} color="#8B4513" />
            </TouchableOpacity>
            <TextInput
              ref={textInputRef}
              style={styles.messageInput}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder={`Message ${otherUserName}...`}
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
              blurOnSubmit={false}
              enablesReturnKeyAutomatically={true}
              autoCorrect={true}
              autoCapitalize="sentences"
              textAlignVertical="center"
              onFocus={() => {
                // Ensure scroll to bottom when input is focused
                setTimeout(() => {
                  if (flatListRef.current && messages.length > 0) {
                    flatListRef.current.scrollToEnd({ animated: true });
                  }
                }, 300);
              }}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newMessage.trim() || sending) && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <Ionicons name="hourglass" size={20} color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Quick Actions Modal */}
      <Modal
        visible={showQuickActions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQuickActions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.quickActionsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Quick Actions</Text>
              <TouchableOpacity onPress={() => setShowQuickActions(false)}>
                <Ionicons name="close" size={24} color="#8B7355" />
              </TouchableOpacity>
            </View>
            
            {renderQuickActions()}
          </View>
        </View>
      </Modal>

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.locationModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share Location</Text>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                <Ionicons name="close" size={24} color="#8B7355" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.locationOptions}>
              <TouchableOpacity
                style={styles.locationOption}
                onPress={handleShareCurrentLocation}
              >
                <Ionicons name="locate" size={24} color="#8B4513" />
                <View style={styles.locationOptionText}>
                  <Text style={styles.locationOptionTitle}>Current Location</Text>
                  <Text style={styles.locationOptionSubtitle}>Share where you are now</Text>
                </View>
              </TouchableOpacity>
              
              {listingData?.location && (
                <TouchableOpacity
                  style={styles.locationOption}
                  onPress={() => handleShareListingLocation()}
                >
                  <Ionicons name="home" size={24} color="#8B4513" />
                  <View style={styles.locationOptionText}>
                    <Text style={styles.locationOptionTitle}>Item Location</Text>
                    <Text style={styles.locationOptionSubtitle}>{listingData.location.address}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F3F0',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loginPrompt: {
    fontSize: 18,
    color: '#8B7355',
    textAlign: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyMessagesList: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
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
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginVertical: 4,
  },
  currentUserBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#8B4513',
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  currentUserText: {
    color: '#FFFFFF',
  },
  otherUserText: {
    color: '#2D1810',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  currentUserTime: {
    color: '#FFFFFF',
    textAlign: 'right',
  },
  otherUserTime: {
    color: '#8B7355',
    textAlign: 'left',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E2DD',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F5F1ED',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    color: '#2D1810',
    maxHeight: 100,
    minHeight: 40,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    paddingHorizontal: 4,
    paddingRight: 12,
    textAlignVertical: 'center',
  },
  sendButton: {
    backgroundColor: '#8B4513',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#D2B48C',
    opacity: 0.5,
  },
  actionButton: {
    padding: 8,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  quickActionsModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '70%',
  },
  locationModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  actionContent: {
    marginLeft: 16,
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 2,
  },
  locationOptions: {
    padding: 20,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F7F3F0',
    borderRadius: 12,
    marginBottom: 12,
  },
  locationOptionText: {
    marginLeft: 16,
    flex: 1,
  },
  locationOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
  },
  locationOptionSubtitle: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 2,
  },
  noActionsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noActionsText: {
    fontSize: 16,
    color: '#8B7355',
    textAlign: 'center',
  },
});

export default ConversationScreen;