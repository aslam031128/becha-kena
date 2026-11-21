import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ViewStyle,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ImageGalleryProps {
  images: string[];
  height?: number;
  showCounter?: boolean;
  showDots?: boolean;
  onImagePress?: (index: number) => void;
  soldOverlay?: boolean;
  style?: ViewStyle;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  height = 300,
  showCounter = true,
  showDots = true,
  onImagePress,
  soldOverlay = false,
  style,
}) => {
  const { colors, borderRadius } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalActiveIndex, setModalActiveIndex] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const modalListRef = useRef<FlatList>(null);

  const imageList = images && images.length > 0 ? images : [''];

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (slide !== activeIndex && slide >= 0 && slide < imageList.length) {
      setActiveIndex(slide);
    }
  };

  const handleModalScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (slide !== modalActiveIndex && slide >= 0 && slide < imageList.length) {
      setModalActiveIndex(slide);
    }
  };

  const handlePressImage = (index: number) => {
    if (onImagePress) {
      onImagePress(index);
    } else {
      setModalActiveIndex(index);
      setIsModalOpen(true);
    }
  };

  return (
    <View style={[styles.container, { height }, style]}>
      {/* Horizontal Carousel */}
      <FlatList
        ref={flatListRef}
        data={imageList}
        keyExtractor={(_, index) => `gallery-img-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => handlePressImage(index)}
            style={{ width: SCREEN_WIDTH, height }}
          >
            {item ? (
              <Image
                source={{ uri: item }}
                style={styles.image}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.fallbackContainer, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name="image-outline" size={64} color={colors.textMuted} />
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      {/* Sold Out Overlay Banner */}
      {soldOverlay && (
        <View style={styles.soldOverlay}>
          <View style={[styles.soldBadge, { backgroundColor: colors.danger }]}>
            <Text style={styles.soldBadgeText}>SOLD</Text>
          </View>
        </View>
      )}

      {/* Slide Counter Overlay */}
      {showCounter && imageList.length > 1 && (
        <View style={styles.counterContainer}>
          <Text style={styles.counterText}>
            {activeIndex + 1} / {imageList.length}
          </Text>
        </View>
      )}

      {/* Dot Indicators */}
      {showDots && imageList.length > 1 && (
        <View style={styles.dotsContainer}>
          {imageList.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === activeIndex ? colors.primary : 'rgba(255, 255, 255, 0.6)',
                  width: index === activeIndex ? 16 : 6,
                  borderRadius: borderRadius.full,
                },
              ]}
            />
          ))}
        </View>
      )}

      {/* Full-Screen Interactive Gallery Modal */}
      <Modal
        visible={isModalOpen}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <StatusBar style="light" />
        <SafeAreaView style={styles.modalContainer}>
          {/* Top Bar with Counter and Close Button */}
          <View style={styles.modalTopBar}>
            <Text style={styles.modalCounterText}>
              {modalActiveIndex + 1} of {imageList.length}
            </Text>
            <TouchableOpacity
              onPress={() => setIsModalOpen(false)}
              style={styles.closeButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Full Screen Image Paging List */}
          <FlatList
            ref={modalListRef}
            data={imageList}
            keyExtractor={(_, index) => `modal-img-${index}`}
            horizontal
            pagingEnabled
            initialScrollIndex={modalActiveIndex}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            showsHorizontalScrollIndicator={false}
            onScroll={handleModalScroll}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <View style={styles.modalSlide}>
                {item ? (
                  <Image
                    source={{ uri: item }}
                    style={styles.modalImage}
                    contentFit="contain"
                    transition={150}
                  />
                ) : (
                  <Ionicons name="image-outline" size={80} color="#666" />
                )}
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#000',
  },
  image: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  fallbackContainer: {
    width: SCREEN_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldBadge: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 8,
    transform: [{ rotate: '-12deg' }],
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  soldBadgeText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  counterContainer: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  modalCounterText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  modalSlide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
});
