import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Listing } from '@/types/listing.types';
import { useTheme } from '@/theme';
import { Badge, PriceTag, Avatar } from '@/components/ui';
import { formatDistance, formatRelativeDate } from '@/utils/formatters';
import { useWishlistStore } from '@/store/wishlist.store';
import { useAuthStore } from '@/store/auth.store';

export interface ListingCardProps {
  listing: Listing;
  onPress?: () => void;
  onRequireAuth?: () => void;
  style?: ViewStyle;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onPress,
  onRequireAuth,
  style,
}) => {
  const { colors, spacing, borderRadius } = useTheme();
  const router = useRouter();
  const { isWishlisted, toggleWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();

  const isSaved = isWishlisted(listing.id);

  const handleCardPress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/(public)/listing/${listing.id}` as any);
    }
  };

  const handleHeartPress = () => {
    if (!isAuthenticated) {
      if (onRequireAuth) {
        onRequireAuth();
      } else {
        router.push('/(auth)/login' as any);
      }
      return;
    }
    toggleWishlist(listing.id);
  };

  const thumbnailUri = listing.thumbnailUrl || (listing.imageUrls && listing.imageUrls[0]);
  const locationText = `${listing.location?.thana || ''}, ${listing.location?.division || ''}`;
  const distanceText = formatDistance(listing.distanceKm);
  const relativeTime = formatRelativeDate(listing.createdAt);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handleCardPress}
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
        },
        style,
      ]}
    >
      {/* Thumbnail + Wishlist Button Container */}
      <View style={styles.thumbnailContainer}>
        {thumbnailUri ? (
          <Image
            source={{ uri: thumbnailUri }}
            style={[styles.thumbnail, { borderRadius: borderRadius.md }]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.thumbnail,
              styles.fallbackThumbnail,
              {
                backgroundColor: colors.surfaceAlt,
                borderRadius: borderRadius.md,
              },
            ]}
          >
            <Ionicons name="image-outline" size={32} color={colors.textMuted} />
          </View>
        )}

        {/* Floating Heart Action */}
        <TouchableOpacity
          onPress={handleHeartPress}
          activeOpacity={0.7}
          style={[
            styles.heartButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name={isSaved ? 'heart' : 'heart-outline'}
            size={18}
            color={isSaved ? colors.danger : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Info Column */}
      <View style={styles.infoCol}>
        {/* Title */}
        <Text
          numberOfLines={2}
          style={[styles.title, { color: colors.textPrimary }]}
        >
          {listing.title}
        </Text>

        {/* Price & Condition Badge */}
        <View style={styles.priceRow}>
          <PriceTag price={listing.price} size="sm" />
          {listing.condition && (
            <Badge
              variant="condition"
              condition={listing.condition}
              size="sm"
            />
          )}
        </View>

        {/* Location & Distance */}
        <View style={styles.locationRow}>
          <Ionicons name="location-sharp" size={13} color={colors.primary} />
          <Text
            numberOfLines={1}
            style={[styles.locationText, { color: colors.textSecondary }]}
          >
            {locationText}
            {distanceText ? ` • ${distanceText}` : ''}
          </Text>
        </View>

        {/* Seller Info & Relative Time */}
        <View style={styles.sellerRow}>
          <View style={styles.sellerInfo}>
            <Avatar
              name={listing.seller?.displayName || 'Seller'}
              url={listing.seller?.avatarUrl || undefined}
              isVerified={listing.seller?.isNidVerified}
              size="sm"
            />
            <Text
              numberOfLines={1}
              style={[styles.sellerName, { color: colors.textSecondary }]}
            >
              {listing.seller?.displayName || 'Citizen'}
            </Text>
          </View>

          {relativeTime ? (
            <Text style={[styles.timeText, { color: colors.textMuted }]}>
              {relativeTime}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  thumbnailContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  thumbnail: {
    width: 100,
    height: 100,
  },
  fallbackThumbnail: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  infoCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
    marginLeft: 3,
    flex: 1,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  sellerName: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 5,
    maxWidth: 90,
  },
  timeText: {
    fontSize: 10,
  },
});
