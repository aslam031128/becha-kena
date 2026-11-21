import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/store/auth.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { useChatStore } from '@/store/chat.store';
import { listingApi } from '@/services/api/listing.api';
import { parseApiError } from '@/services/api/client';
import { Listing } from '@/types/listing.types';
import {
  ImageGallery,
  PhoneRevealModal,
} from '@/components/listing';
import { Badge, PriceTag, Avatar, Button, Card } from '@/components/ui';
import { AuthGateModal } from '@/components/common/AuthGateModal';
import { formatDistance, formatRelativeDate } from '@/utils/formatters';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, borderRadius } = useTheme();
  const router = useRouter();

  const { user, isAuthenticated, isNidVerified } = useAuthStore();
  const { isWishlisted, toggleWishlist } = useWishlistStore();

  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Description expansion state
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Phone reveal state
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isRevealingPhone, setIsRevealingPhone] = useState(false);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [revealsRemaining, setRevealsRemaining] = useState<number>(10);

  // Auth gate modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authActionTitle, setAuthActionTitle] = useState('Contact Seller');

  const isSaved = id ? isWishlisted(id) : false;
  const isOwner = user?.id && listing?.sellerId && user.id === listing.sellerId;
  const isSold = listing?.status === 'sold';
  const isUnderOffer = listing?.status === 'under_offer';

  const loadListingDetail = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await listingApi.getListingById(id);
      setListing(response.data);
    } catch (err: any) {
      setError(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadListingDetail();
  }, [id]);

  const handleShare = async () => {
    if (!listing) return;
    try {
      await Share.share({
        title: listing.title,
        message: `Check out "${listing.title}" for BDT ${listing.price.toLocaleString()} on Becha-Kena!`,
      });
    } catch {
      // ignore
    }
  };

  const handleHeartPress = () => {
    if (!isAuthenticated) {
      setAuthActionTitle('Saving to Wishlist');
      setIsAuthModalOpen(true);
      return;
    }
    if (id) {
      toggleWishlist(id);
    }
  };

  const handleChatPress = async () => {
    if (!isAuthenticated) {
      setAuthActionTitle('Chatting with Seller');
      setIsAuthModalOpen(true);
      return;
    }
    if (!isNidVerified) {
      router.push('/(auth)/kyc' as any);
      return;
    }
    if (listing) {
      try {
        const { startOrGetConversation } = useChatStore.getState();
        const conv = await startOrGetConversation(listing.id);
        router.push(`/(tabs)/chat/${conv.conversationId}` as any);
      } catch {
        router.push('/(tabs)/chat' as any);
      }
    }
  };

  const handleCallPress = () => {
    if (!isAuthenticated) {
      setAuthActionTitle('Calling the Seller');
      setIsAuthModalOpen(true);
      return;
    }
    if (!isNidVerified) {
      router.push('/(auth)/kyc' as any);
      return;
    }

    if (revealedPhone) {
      Linking.openURL(`tel:${revealedPhone}`);
      return;
    }

    setIsPhoneModalOpen(true);
  };

  const handleConfirmReveal = async () => {
    if (!listing) return;
    setIsRevealingPhone(true);
    try {
      const response = await listingApi.revealSellerPhone(listing.id);
      const phone = response.data.sellerPhone;
      setRevealedPhone(phone);
      setRevealsRemaining(response.data.revealsRemainingToday);
      setIsPhoneModalOpen(false);
      Linking.openURL(`tel:${phone}`);
    } catch (err: any) {
      const msg = parseApiError(err);
      if (msg.includes('429') || msg.toLowerCase().includes('limit')) {
        setRevealsRemaining(0);
      } else {
        alert(msg);
      }
    } finally {
      setIsRevealingPhone(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading listing details...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !listing) {
    return (
      <SafeAreaView style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={56} color={colors.danger} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
          Listing Not Found
        </Text>
        <Text style={[styles.errorBody, { color: colors.textSecondary }]}>
          {error || 'The listing you are looking for has been removed or does not exist.'}
        </Text>
        <Button
          title="Go Back to Marketplace"
          variant="primary"
          onPress={() => router.back()}
          style={{ marginTop: spacing.md }}
        />
      </SafeAreaView>
    );
  }

  const locationText = `${listing.location?.thana || ''}, ${listing.location?.division || ''}`;
  const distanceText = formatDistance(listing.distanceKm);
  const relativeDate = formatRelativeDate(listing.createdAt);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Top Navigation Bar */}
      <View
        style={[
          styles.navBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.navIconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.navRightActions}>
          <TouchableOpacity
            onPress={handleShare}
            style={[styles.navIconBtn, { marginRight: 8 }]}
          >
            <Ionicons name="share-social-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleHeartPress} style={styles.navIconBtn}>
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={24}
              color={isSaved ? colors.danger : colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content ScrollView */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* 1. Image Gallery */}
        <ImageGallery
          images={listing.imageUrls && listing.imageUrls.length > 0 ? listing.imageUrls : []}
          height={320}
          soldOverlay={isSold}
        />

        <View style={[styles.contentPadding, { padding: spacing.md }]}>
          {/* Status Badges if under offer or sold */}
          {isSold && (
            <View style={styles.statusBannerRow}>
              <Badge variant="danger" label="Sold Out" />
            </View>
          )}

          {isUnderOffer && (
            <View style={styles.statusBannerRow}>
              <Badge variant="warning" label="Reserved • Under Offer" />
            </View>
          )}

          {/* 2. Price & Title */}
          <View style={styles.priceRow}>
            <PriceTag price={listing.price} size="lg" />
            <View style={styles.badgesGroup}>
              {listing.condition && (
                <Badge
                  variant="condition"
                  condition={listing.condition}
                  size="md"
                />
              )}
            </View>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {listing.title}
          </Text>

          {/* Metadata Row */}
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              Posted {relativeDate}
            </Text>
            <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
            <Ionicons name="eye-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {listing.viewCount || 0} views
            </Text>
            <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
            <Ionicons name="chatbubble-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {listing.inquiryCount || 0} inquiries
            </Text>
          </View>

          {/* 3. Seller Trust Card */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => router.push(`/(public)/user/${listing.seller?.id || listing.sellerId}` as any)}
            style={{ marginVertical: spacing.md }}
          >
            <Card
              style={[
                styles.sellerCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                  borderRadius: borderRadius.lg,
                },
              ]}
            >
              <View style={styles.sellerHeaderRow}>
                <Avatar
                  name={listing.seller?.displayName || 'Citizen'}
                  url={listing.seller?.avatarUrl || undefined}
                  isVerified={listing.seller?.isNidVerified}
                  size="md"
                />
                <View style={styles.sellerDetails}>
                  <View style={styles.sellerNameRow}>
                    <Text style={[styles.sellerName, { color: colors.textPrimary }]}>
                      {listing.seller?.displayName || 'Verified Citizen'}
                    </Text>
                    {listing.seller?.isNidVerified && (
                      <Badge variant="verified" label="NID Verified" size="sm" />
                    )}
                  </View>

                  <Text style={[styles.sellerTrustText, { color: colors.textSecondary }]}>
                    ⭐ {listing.seller?.averageRating ? listing.seller.averageRating.toFixed(1) : '5.0'} Rating • 🤝 {listing.seller?.totalDealsCompleted || 0} Deals Completed
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </Card>
          </TouchableOpacity>

          {/* 4. Product Description */}
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              Description
            </Text>
            <Text
              numberOfLines={isDescExpanded ? undefined : 4}
              style={[styles.descriptionText, { color: colors.textPrimary }]}
            >
              {listing.description}
            </Text>
            {listing.description && listing.description.length > 180 && (
              <TouchableOpacity
                onPress={() => setIsDescExpanded(!isDescExpanded)}
                style={styles.expandBtn}
              >
                <Text style={[styles.expandBtnText, { color: colors.primary }]}>
                  {isDescExpanded ? 'Show Less' : 'Read More'}
                </Text>
                <Ionicons
                  name={isDescExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* 5. Location Marker & Safety Guidelines */}
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              Location
            </Text>
            <View style={styles.locationBox}>
              <Ionicons name="location" size={20} color={colors.primary} />
              <View style={{ marginLeft: 8 }}>
                <Text style={[styles.locationHeading, { color: colors.textPrimary }]}>
                  {locationText}
                </Text>
                {distanceText ? (
                  <Text style={[styles.distanceSubtext, { color: colors.textSecondary }]}>
                    Approximately {distanceText} from your current GPS
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Anti-Scam Safe Trading Banner */}
            <View
              style={[
                styles.safetyBanner,
                {
                  backgroundColor: colors.scamWarningBg,
                  borderColor: colors.scamWarningBorder,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Ionicons name="shield-half" size={24} color={colors.danger} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.safetyTitle, { color: colors.scamWarningText }]}>
                  ⚠️ Becha-Kena Safe Trade Rules
                </Text>
                <Text style={[styles.safetyText, { color: colors.scamWarningText }]}>
                  1. Always meet in daylight in safe, public places (e.g. shopping mall or metro station).{'\n'}
                  2. Thoroughly inspect the item before finalizing payment.{'\n'}
                  3. NEVER pay advance booking tokens via bKash or Nagad.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View
        style={[
          styles.bottomActionBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        {isOwner ? (
          /* Owner Actions */
          <View style={styles.ownerActionsRow}>
            <Button
              title="✏️ Edit Listing"
              variant="secondary"
              onPress={() => router.push({ pathname: '/(tabs)/sell', params: { editId: listing.id } } as any)}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title="📊 View Dashboard"
              variant="primary"
              onPress={() => router.push('/(tabs)/sell' as any)}
              style={{ flex: 1 }}
            />
          </View>
        ) : isSold ? (
          /* Sold Item Banner */
          <View style={styles.soldNoticeBar}>
            <Ionicons name="checkmark-circle" size={20} color={colors.textSecondary} />
            <Text style={[styles.soldNoticeText, { color: colors.textSecondary }]}>
              This item has been sold to another verified buyer.
            </Text>
          </View>
        ) : (
          /* Buyer Contact Actions */
          <View style={styles.buyerActionsRow}>
            <TouchableOpacity
              onPress={handleHeartPress}
              style={[
                styles.actionHeartBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Ionicons
                name={isSaved ? 'heart' : 'heart-outline'}
                size={22}
                color={isSaved ? colors.danger : colors.textPrimary}
              />
            </TouchableOpacity>

            {/* Chat Action Button */}
            <Button
              title="💬 Chat"
              variant="primary"
              size="md"
              onPress={handleChatPress}
              style={{ flex: 1.2, marginHorizontal: 6 }}
            />

            {/* Call Action Button */}
            <Button
              title={revealedPhone ? `📞 ${revealedPhone}` : '📞 Call'}
              variant="secondary"
              size="md"
              onPress={handleCallPress}
              style={{ flex: 1 }}
            />
          </View>
        )}
      </View>

      {/* Phone Reveal Confirmation Modal */}
      <PhoneRevealModal
        visible={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        onConfirmReveal={handleConfirmReveal}
        revealsRemainingToday={revealsRemaining}
        isLoading={isRevealingPhone}
        onOpenChat={handleChatPress}
      />

      {/* Guest Authentication Gate Modal */}
      <AuthGateModal
        visible={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        actionTitle={authActionTitle}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
  },
  errorBody: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  navIconBtn: {
    padding: 4,
  },
  navRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentPadding: {
    paddingBottom: 20,
  },
  statusBannerRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 12,
  },
  metaDot: {
    marginHorizontal: 3,
  },
  sellerCard: {
    padding: 12,
    borderWidth: 1,
  },
  sellerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerDetails: {
    flex: 1,
    marginLeft: 12,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '700',
  },
  sellerTrustText: {
    fontSize: 12,
  },
  sectionWrap: {
    marginTop: 16,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  expandBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationHeading: {
    fontSize: 14,
    fontWeight: '600',
  },
  distanceSubtext: {
    fontSize: 12,
    marginTop: 1,
  },
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  safetyTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  safetyText: {
    fontSize: 11,
    lineHeight: 16,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  ownerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  soldNoticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  soldNoticeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  buyerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionHeartBtn: {
    padding: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
