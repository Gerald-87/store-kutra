import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  Linking,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../store';
import { fetchHeroContent, setCurrentSlideIndex } from '../store/slices/heroSlice';
import { Advertisement, CampusEvent, Promotion } from '../types';

const { width } = Dimensions.get('window');
const SLIDE_WIDTH = width - 40;

interface HeroItem {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  imageBase64?: string;
  linkUrl?: string;
  type: 'advertisement' | 'event' | 'promotion';
  item: Advertisement | CampusEvent | Promotion;
}

const HeroCarousel: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { advertisements, events, promotions, currentSlideIndex, isLoading } = useSelector(
    (state: RootState) => state.hero as any
  );
  
  const flatListRef = useRef<FlatList>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Combine all hero items
  const heroItems: HeroItem[] = [
    ...advertisements.map((ad: Advertisement) => ({
      id: ad.id || '',
      title: ad.title,
      description: ad.content,
      imageUrl: ad.imageUrl,
      imageBase64: ad.dataAiHint,
      linkUrl: ad.linkUrl,
      type: 'advertisement' as const,
      item: ad,
    })),
    ...events.map((event: CampusEvent) => ({
      id: event.id || '',
      title: event.name,
      description: event.description,
      imageUrl: event.imageUrl,
      imageBase64: event.imageBase64,
      linkUrl: event.linkUrl,
      type: 'event' as const,
      item: event,
    })),
    ...promotions.map((promo: Promotion) => ({
      id: promo.id || '',
      title: promo.title,
      description: promo.description,
      imageUrl: promo.imageUrl,
      imageBase64: promo.imageBase64,
      linkUrl: promo.linkUrl,
      type: 'promotion' as const,
      item: promo,
    })),
  ];

  useEffect(() => {
    dispatch(fetchHeroContent());
  }, [dispatch]);

  // Auto-slide functionality
  useEffect(() => {
    if (heroItems.length > 1) {
      timerRef.current = setInterval(() => {
        const nextIndex = (currentSlideIndex + 1) % heroItems.length;
        dispatch(setCurrentSlideIndex(nextIndex));
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      }, 5000); // Change slide every 5 seconds

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [currentSlideIndex, heroItems.length, dispatch]);

  const handleSlideChange = (index: number) => {
    dispatch(setCurrentSlideIndex(index));
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const handleItemPress = (item: HeroItem) => {
    if (item.linkUrl) {
      Linking.openURL(item.linkUrl);
    }
  };

  const renderHeroItem = ({ item }: { item: HeroItem }) => (
    <TouchableOpacity 
      style={styles.heroSlide}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.95}
    >
      <Image
        source={{
          uri: item.imageBase64 
            ? `data:image/jpeg;base64,${item.imageBase64}`
            : item.imageUrl || 'https://placehold.co/400x200.png?text=KUTRA'
        }}
        style={styles.heroImage}
        resizeMode="cover"
      />
      <View style={styles.heroOverlay}>
        <View style={styles.heroContent}>
          <View style={styles.typeIndicator}>
            <Ionicons 
              name={
                item.type === 'advertisement' ? 'megaphone' :
                item.type === 'event' ? 'calendar' : 'gift'
              } 
              size={16} 
              color="#FFFFFF" 
            />
            <Text style={styles.typeText}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
          </View>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.heroDescription} numberOfLines={2}>
            {item.description}
          </Text>
          {item.linkUrl && (
            <View style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Learn More</Text>
              <Ionicons name="arrow-forward" size={16} color="#8B4513" />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPaginationDot = (index: number) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.paginationDot,
        index === currentSlideIndex && styles.paginationDotActive,
      ]}
      onPress={() => {
        handleSlideChange(index);
        flatListRef.current?.scrollToIndex({ index, animated: true });
      }}
    />
  );

  if (isLoading || heroItems.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholderSlide}>
          <Ionicons name="storefront" size={48} color="#FFFFFF" style={{ marginBottom: 12 }} />
          <Text style={styles.placeholderText}>Welcome to KUTRA</Text>
          <Text style={styles.placeholderSubtext}>Your campus marketplace</Text>
          <TouchableOpacity style={styles.placeholderButton}>
            <Text style={styles.placeholderButtonText}>Explore Stores</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={heroItems}
        renderItem={renderHeroItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const slideIndex = Math.round(event.nativeEvent.contentOffset.x / SLIDE_WIDTH);
          handleSlideChange(slideIndex);
        }}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={SLIDE_WIDTH}
        snapToAlignment="start"
      />
      
      {heroItems.length > 1 && (
        <View style={styles.pagination}>
          {heroItems.map((_, index) => renderPaginationDot(index))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  heroSlide: {
    width: SLIDE_WIDTH,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heroContent: {
    flex: 1,
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  typeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 20,
    letterSpacing: -0.3,
  },
  heroDescription: {
    fontSize: 12,
    color: '#E5E7EB',
    marginBottom: 8,
    lineHeight: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: '#8B4513',
    fontSize: 13,
    fontWeight: '800',
    marginRight: 6,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 6,
  },
  paginationDotActive: {
    backgroundColor: '#8B4513',
    width: 28,
    transform: [{ scale: 1.2 }],
  },
  placeholderSlide: {
    width: SLIDE_WIDTH,
    height: 200,
    backgroundColor: '#8B4513',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#E0E7FF',
    fontWeight: '500',
    marginBottom: 20,
  },
  placeholderButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  placeholderButtonText: {
    color: '#8B4513',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default HeroCarousel;