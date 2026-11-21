import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { userApi } from '@/services/api/user.api';
import { listingApi } from '@/services/api/listing.api';
import { parseApiError } from '@/services/api/client';
import { PublicProfile } from '@/types/user.types';
import { Review } from '@/types/deal.types';
import { Listing } from '@/types/listing.types';
import { Avatar, Badge, Card, StarRating, Button, EmptyState } from '@/components/ui';
import { ListingCard } from '@/components/listing';
import { formatRelativeDate } from '@/utils/formatters';

export default function UserPublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { colors, spacing, borderRadius } = useTheme();
  const router = useRouter();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeListings, setActiveListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const loadProfileData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [profileRes, reviewsRes, listingsRes] = await Promise.allSettled([
          userApi.getPublicProfile(userId),
          userApi.getUserReviews(userId, 1, 20),
          listingApi.searchListings({ limit: 10 }), // In real backend can filter by sellerId
        ]);

        if (profileRes.status === 'fulfilled') {
          setProfile(profileRes.value.data);
        } else {
          throw profileRes.reason;
        }

        if (reviewsRes.status === 'fulfilled') {
          setReviews(reviewsRes.value.data || []);
        }

        if (listingsRes.status === 'fulfilled') {
          // Filter listings matching this seller
          const sellerItems = (listingsRes.value.data || []).filter(
            (item) => item.sellerId === userId || item.seller?.id === userId
          );
          setActiveListings(sellerItems);
        }
      } catch (err: any) {
        setError(parseApiError(err));
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, [userId]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading citizen profile...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="person-remove-outline" size={56} color={colors.danger} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
          Profile Not Available
        </Text>
        <Text style={[styles.errorBody, { color: colors.textSecondary }]}>
          {error || 'The citizen profile you requested could not be retrieved.'}
        </Text>
        <Button
          title="Go Back"
          variant="primary"
          onPress={() => router.back()}
          style={{ marginTop: spacing.md }}
        />
      </SafeAreaView>
    );
  }

  const memberSinceFormatted = profile.memberSince
    ? new Date(profile.memberSince).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Aug 2026';

  const badges = profile.trustBadges || {};

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Top App Bar */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.textPrimary }]}>
          Citizen Trust Profile
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile Card Header */}
        <View style={[styles.profileHeader, { padding: spacing.lg, backgroundColor: colors.surface }]}>
          <View style={styles.avatarWrap}>
            <Avatar
              name={profile.displayName}
              url={profile.avatarUrl}
              isVerified={profile.isNidVerified}
              size="xl"
            />
          </View>

          <View style={styles.profileNameRow}>
            <Text style={[styles.displayName, { color: colors.textPrimary }]}>
              {profile.displayName}
            </Text>
            {profile.isNidVerified && (
              <Badge variant="verified" label="NID Verified" size="sm" />
            )}
          </View>

          <Text style={[styles.memberSince, { color: colors.textSecondary }]}>
            Citizen Member since {memberSinceFormatted}
          </Text>

          {/* Trust Metrics Bar */}
          <View
            style={[
              styles.metricsBar,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                marginTop: spacing.md,
              },
            ]}
          >
            <View style={styles.metricItem}>
              <Text style={[styles.metricNumber, { color: colors.primary }]}>
                ⭐ {profile.averageRating ? profile.averageRating.toFixed(1) : '5.0'}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Rating
              </Text>
            </View>

            <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

            <View style={styles.metricItem}>
              <Text style={[styles.metricNumber, { color: colors.textPrimary }]}>
                🤝 {profile.totalDealsCompleted || 0}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Deals Done
              </Text>
            </View>

            <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

            <View style={styles.metricItem}>
              <Text style={[styles.metricNumber, { color: colors.textPrimary }]}>
                📦 {activeListings.length}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Active Ads
              </Text>
            </View>
          </View>
        </View>

        {/* Qualitative Trust Badges Section */}
        <View style={[styles.sectionContainer, { paddingHorizontal: spacing.md, marginTop: spacing.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Transaction Trust Badges
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Honors awarded by verified trade partners upon deal completion.
          </Text>

          <View style={styles.badgesGrid}>
            <Card
              style={[
                styles.badgeCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Text style={styles.badgeEmoji}>📦</Text>
              <Text style={[styles.badgeName, { color: colors.textPrimary }]}>
                Item as Described
              </Text>
              <Text style={[styles.badgeCount, { color: colors.primary }]}>
                × {badges.item_as_described || 0}
              </Text>
            </Card>

            <Card
              style={[
                styles.badgeCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Text style={styles.badgeEmoji}>⏰</Text>
              <Text style={[styles.badgeName, { color: colors.textPrimary }]}>
                Punctual
              </Text>
              <Text style={[styles.badgeCount, { color: colors.primary }]}>
                × {badges.punctual || 0}
              </Text>
            </Card>

            <Card
              style={[
                styles.badgeCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Text style={styles.badgeEmoji}>💬</Text>
              <Text style={[styles.badgeName, { color: colors.textPrimary }]}>
                Friendly Chat
              </Text>
              <Text style={[styles.badgeCount, { color: colors.primary }]}>
                × {badges.friendly_communication || 0}
              </Text>
            </Card>

            <Card
              style={[
                styles.badgeCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Text style={styles.badgeEmoji}>💰</Text>
              <Text style={[styles.badgeName, { color: colors.textPrimary }]}>
                Quick Payment
              </Text>
              <Text style={[styles.badgeCount, { color: colors.primary }]}>
                × {badges.quick_payment || 0}
              </Text>
            </Card>
          </View>
        </View>

        {/* Bilateral Trade Reviews Section */}
        <View style={[styles.sectionContainer, { paddingHorizontal: spacing.md, marginTop: spacing.lg }]}>
          <View style={styles.reviewsHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Verified Trade Reviews ({reviews.length})
            </Text>
          </View>

          {reviews.length === 0 ? (
            <Card
              style={[
                styles.emptyReviewsCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Ionicons name="chatbubbles-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyReviewsText, { color: colors.textSecondary }]}>
                No feedback reviews yet. Completing confirmed deals will unlock mutual bilateral ratings.
              </Text>
            </Card>
          ) : (
            reviews.map((rev) => (
              <Card
                key={rev.reviewId}
                style={[
                  styles.reviewItemCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: borderRadius.md,
                    marginBottom: spacing.sm,
                  },
                ]}
              >
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    <Avatar
                      name={rev.reviewer?.displayName || 'Buyer'}
                      url={rev.reviewer?.avatarUrl}
                      isVerified={rev.reviewer?.isNidVerified}
                      size="sm"
                    />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={[styles.reviewerName, { color: colors.textPrimary }]}>
                        {rev.reviewer?.displayName || 'Citizen'}
                      </Text>
                      <Text style={[styles.reviewDate, { color: colors.textMuted }]}>
                        {formatRelativeDate(rev.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <StarRating rating={rev.rating} size={14} showScore />
                </View>

                {rev.listingTitle && (
                  <Text style={[styles.associatedListing, { color: colors.textSecondary }]}>
                    Re: {rev.listingTitle}
                  </Text>
                )}

                {rev.comment ? (
                  <Text style={[styles.reviewComment, { color: colors.textPrimary }]}>
                    "{rev.comment}"
                  </Text>
                ) : null}

                {/* Qualitative Tags Chips */}
                {rev.tags && rev.tags.length > 0 && (
                  <View style={styles.reviewTagsRow}>
                    {rev.tags.map((tag, tIdx) => (
                      <View
                        key={tIdx}
                        style={[
                          styles.reviewTagChip,
                          {
                            backgroundColor: colors.primaryLight,
                            borderRadius: borderRadius.full,
                          },
                        ]}
                      >
                        <Text style={[styles.reviewTagText, { color: colors.primary }]}>
                          ✓ {tag.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            ))
          )}
        </View>

        {/* Active Listings Section */}
        {activeListings.length > 0 && (
          <View style={[styles.sectionContainer, { marginTop: spacing.lg }]}>
            <View style={{ paddingHorizontal: spacing.md }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Active Listings by {profile.displayName}
              </Text>
            </View>

            <FlatList
              data={activeListings}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
              renderItem={({ item }) => (
                <View style={{ width: 280, marginRight: 12 }}>
                  <ListingCard listing={item} />
                </View>
              )}
            />
          </View>
        )}
      </ScrollView>
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
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  profileHeader: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  avatarWrap: {
    marginBottom: 10,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '800',
  },
  memberSince: {
    fontSize: 12,
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 12,
    borderWidth: 1,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricNumber: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  metricDivider: {
    width: 1,
    height: 28,
  },
  sectionContainer: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeCard: {
    width: '48%',
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  badgeEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  badgeCount: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  reviewsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  emptyReviewsCard: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptyReviewsText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  reviewItemCard: {
    padding: 12,
    borderWidth: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '700',
  },
  reviewDate: {
    fontSize: 10,
  },
  associatedListing: {
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  reviewComment: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  reviewTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reviewTagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reviewTagText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
