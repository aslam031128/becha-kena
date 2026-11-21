import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/store/auth.store';
import { useListingStore } from '@/store/listing.store';
import { useLocation } from '@/hooks/useLocation';
import { ListingCategory } from '@/types/listing.types';
import {
  ListingCard,
  ListingCardSkeleton,
  CategoryChips,
  LocationPickerModal,
} from '@/components/listing';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export default function AuthenticatedHomeScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const router = useRouter();

  const { user, isNidVerified } = useAuthStore();
  const {
    listings,
    isLoading,
    isRefreshing,
    isLoadingMore,
    filters,
    fetchListings,
    refreshListings,
    loadMoreListings,
    setFilter,
  } = useListingStore();

  const { coords, requestLocationPermission, isLoading: isLocationLoading } = useLocation();

  const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);
  const [isNearbyActive, setIsNearbyActive] = useState(false);

  useEffect(() => {
    fetchListings();
  }, []);

  const handleCategorySelect = (category?: ListingCategory) => {
    setFilter('category', category);
    fetchListings({ category });
  };

  const handleLocationSelect = (loc: {
    division?: string;
    thana?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    setIsNearbyActive(false);
    setFilter('division', loc.division);
    setFilter('thana', loc.thana);
    setFilter('latitude', loc.latitude);
    setFilter('longitude', loc.longitude);
    setFilter('sort', 'newest');
    fetchListings({
      division: loc.division,
      thana: loc.thana,
      latitude: loc.latitude,
      longitude: loc.longitude,
      sort: 'newest',
    });
  };

  const handleToggleNearby = async () => {
    if (isNearbyActive) {
      setIsNearbyActive(false);
      setFilter('sort', 'newest');
      setFilter('latitude', undefined);
      setFilter('longitude', undefined);
      setFilter('maxDistanceKm', undefined);
      fetchListings({ sort: 'newest' });
      return;
    }

    let activeCoords = coords;
    if (!activeCoords) {
      activeCoords = await requestLocationPermission();
      if (!activeCoords) return;
    }

    setIsNearbyActive(true);
    setFilter('sort', 'distance');
    setFilter('latitude', activeCoords.latitude);
    setFilter('longitude', activeCoords.longitude);
    setFilter('maxDistanceKm', 25);
    fetchListings({
      sort: 'distance',
      latitude: activeCoords.latitude,
      longitude: activeCoords.longitude,
      maxDistanceKm: 25,
    });
  };

  const activeLocationLabel = filters.thana
    ? `${filters.thana}, ${filters.division || ''}`
    : filters.division
    ? filters.division
    : isNearbyActive
    ? 'Nearby (25km GPS)'
    : 'All Bangladesh';

  const renderHeader = () => (
    <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
      {/* Personalized Welcome Banner */}
      <View style={styles.greetingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greetingText, { color: colors.textPrimary }]}>
            Welcome back, {user?.displayName || 'Citizen'} 👋
          </Text>
          <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
            Browse verified listings or sell directly to citizens.
          </Text>
        </View>
        <Badge
          variant="verified"
          label={isNidVerified ? 'NID Verified' : 'Unverified'}
          size="sm"
        />
      </View>

      {/* Seller Quota Card */}
      <Card
        style={[
          styles.quotaCard,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.border,
            borderRadius: borderRadius.md,
            marginTop: spacing.sm,
          },
        ]}
      >
        <View style={styles.quotaRow}>
          <View style={styles.quotaInfo}>
            <View style={styles.quotaHeader}>
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text style={[styles.quotaTitle, { color: colors.textPrimary }]}>
                C2C Free Quota: 5 Active Ads/Month
              </Text>
            </View>
            <Text style={[styles.quotaDesc, { color: colors.textSecondary }]}>
              Zero commission fee on peer-to-peer verified trades.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push(isNidVerified ? ('/(tabs)/sell' as any) : ('/(auth)/kyc' as any))}
            style={[
              styles.postAdQuickBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: borderRadius.md,
              },
            ]}
          >
            <Text style={[styles.postAdQuickText, { color: colors.surface }]}>
              + Post
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Search Input Bar */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/(public)/search' as any)}
        style={[
          styles.searchBar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: borderRadius.md,
            marginTop: spacing.md,
          },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <Text style={[styles.searchPlaceholder, { color: colors.textMuted }]}>
          Search electronics, cars, gadgets...
        </Text>
        <Ionicons name="filter-outline" size={18} color={colors.primary} />
      </TouchableOpacity>

      {/* Category Filter Horizontal */}
      <View style={{ marginTop: spacing.sm, marginHorizontal: -spacing.md }}>
        <CategoryChips
          selectedCategory={filters.category}
          onSelectCategory={handleCategorySelect}
        />
      </View>

      {/* Location Strip */}
      <View
        style={[
          styles.locationStrip,
          {
            borderColor: colors.border,
            marginTop: spacing.xs,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => setIsLocationModalVisible(true)}
          style={[
            styles.locBadge,
            {
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
              borderRadius: borderRadius.full,
            },
          ]}
        >
          <Ionicons name="location-sharp" size={14} color={colors.primary} />
          <Text
            numberOfLines={1}
            style={[styles.locBadgeText, { color: colors.textPrimary }]}
          >
            {activeLocationLabel}
          </Text>
          <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleToggleNearby}
          style={[
            styles.nearbyToggle,
            {
              backgroundColor: isNearbyActive ? colors.primaryLight : colors.surface,
              borderColor: isNearbyActive ? colors.primary : colors.border,
              borderRadius: borderRadius.full,
            },
          ]}
        >
          <Ionicons
            name="navigate"
            size={13}
            color={isNearbyActive ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.nearbyText,
              {
                color: isNearbyActive ? colors.primary : colors.textSecondary,
                fontWeight: isNearbyActive ? '700' : '500',
              },
            ]}
          >
            {isLocationLoading ? 'Locating...' : 'Near Me'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Feed Headline */}
      <View style={styles.feedHeadlineRow}>
        <Text style={[styles.feedHeadline, { color: colors.textPrimary }]}>
          {isNearbyActive ? '📍 Deals Around You' : 'Fresh Marketplace Listings'}
        </Text>
        {listings.length > 0 && (
          <Text style={[styles.feedCount, { color: colors.textSecondary }]}>
            {listings.length} items
          </Text>
        )}
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return <View style={{ height: 40 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {isLoading && !isRefreshing ? (
        <View style={{ padding: spacing.md }}>
          <ListingCardSkeleton />
          <ListingCardSkeleton />
          <ListingCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              style={{ marginHorizontal: spacing.md }}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="basket-outline" size={48} color={colors.textMuted} />}
              title="No Listings Found"
              subtitle="No active items match your criteria. Try changing filters or categories."
              actionTitle="Reset Filters"
              onAction={() => {
                setIsNearbyActive(false);
                fetchListings({});
              }}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshListings}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={loadMoreListings}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Location Picker Modal */}
      <LocationPickerModal
        visible={isLocationModalVisible}
        onClose={() => setIsLocationModalVisible(false)}
        selectedDivision={filters.division}
        selectedThana={filters.thana}
        onSelectLocation={handleLocationSelect}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 13,
    marginTop: 2,
  },
  quotaCard: {
    padding: 12,
  },
  quotaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quotaInfo: {
    flex: 1,
    marginRight: 12,
  },
  quotaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quotaTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  quotaDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  postAdQuickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  postAdQuickText: {
    fontSize: 13,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  locationStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  locBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    maxWidth: '65%',
  },
  locBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 5,
  },
  nearbyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  nearbyText: {
    fontSize: 12,
    marginLeft: 4,
  },
  feedHeadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 6,
  },
  feedHeadline: {
    fontSize: 16,
    fontWeight: '700',
  },
  feedCount: {
    fontSize: 12,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
