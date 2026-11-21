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
import { AuthGateModal } from '@/components/common/AuthGateModal';

export default function PublicHomeScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const router = useRouter();

  const { isAuthenticated, isNidVerified, user } = useAuthStore();
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

  const {
    coords,
    requestLocationPermission,
    isLoading: isLocationLoading,
  } = useLocation();

  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [authActionTitle, setAuthActionTitle] = useState('This Action');
  const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);
  const [isNearbyActive, setIsNearbyActive] = useState(false);

  // Initial load
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

  const handlePostAdPress = () => {
    if (!isAuthenticated) {
      setAuthActionTitle('Posting an Ad');
      setIsAuthModalVisible(true);
      return;
    }
    if (!isNidVerified) {
      router.push('/(auth)/kyc' as any);
      return;
    }
    router.push('/(tabs)/sell' as any);
  };

  const handleRequireAuth = (actionName: string) => {
    setAuthActionTitle(actionName);
    setIsAuthModalVisible(true);
  };

  const activeLocationLabel = filters.thana
    ? `${filters.thana}, ${filters.division || ''}`
    : filters.division
    ? filters.division
    : isNearbyActive
    ? 'Nearby (25km GPS)'
    : 'All Bangladesh';

  const renderHeader = () => (
    <View>
      {/* Category Horizontal Filter */}
      <View style={{ marginTop: spacing.sm }}>
        <CategoryChips
          selectedCategory={filters.category}
          onSelectCategory={handleCategorySelect}
        />
      </View>

      {/* Location & Nearby Filter Strip */}
      <View
        style={[
          styles.locationStrip,
          {
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Location Picker Button */}
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

        {/* Nearby GPS Toggle */}
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

      {/* Feed Section Title */}
      <View style={[styles.sectionHeader, { paddingHorizontal: spacing.md }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {isNearbyActive ? '📍 Deals Near You' : '🔥 Fresh Listings'}
        </Text>
        {listings.length > 0 && (
          <Text style={[styles.countText, { color: colors.textSecondary }]}>
            {listings.length} items
          </Text>
        )}
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return <View style={{ height: 80 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Top Sticky Header */}
      <View
        style={[
          styles.topHeader,
          {
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        {/* Brand & Badge Row */}
        <View style={styles.brandRow}>
          <View style={styles.brandGroup}>
            <Text style={[styles.brandName, { color: colors.primary }]}>
              Becha-Kena
            </Text>
            <Ionicons
              name="shield-checkmark"
              size={18}
              color={colors.verifiedBadge}
              style={{ marginLeft: 4 }}
            />
          </View>

          {/* User Status / Login Action */}
          {isAuthenticated ? (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile' as any)}
              style={styles.profileBtn}
            >
              <Text
                numberOfLines={1}
                style={[styles.userName, { color: colors.textPrimary }]}
              >
                {user?.displayName || 'Citizen'}
              </Text>
              <Badge variant="verified" label="Verified" size="sm" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login' as any)}
              style={[
                styles.signInBtn,
                {
                  borderColor: colors.primary,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Text style={[styles.signInText, { color: colors.primary }]}>
                Sign In
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Bar Input Shortcut */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(public)/search' as any)}
          style={[
            styles.searchShortcut,
            {
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              marginTop: spacing.xs,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Text style={[styles.searchPlaceholder, { color: colors.textMuted }]}>
            Search electronics, vehicles, fashion...
          </Text>
          <Ionicons name="options-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Main Listing List */}
      {isLoading && !isRefreshing ? (
        <View style={{ padding: spacing.md }}>
          <ListingCardSkeleton />
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
              onRequireAuth={() => handleRequireAuth('Saving to Wishlist')}
              style={{ marginHorizontal: spacing.md }}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="search-outline" size={48} color={colors.textMuted} />}
              title="No Listings Found"
              subtitle="No active listings match your current criteria. Try selecting another category or clearing filters."
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

      {/* Floating "Post Ad" Action Button */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePostAdPress}
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
            borderRadius: borderRadius.full,
          },
        ]}
      >
        <Ionicons name="add" size={24} color={colors.surface} />
        <Text style={[styles.fabText, { color: colors.surface }]}>Post Ad</Text>
      </TouchableOpacity>

      {/* Location Picker Modal */}
      <LocationPickerModal
        visible={isLocationModalVisible}
        onClose={() => setIsLocationModalVisible(false)}
        selectedDivision={filters.division}
        selectedThana={filters.thana}
        onSelectLocation={handleLocationSelect}
      />

      {/* Auth Gate Modal for Guests */}
      <AuthGateModal
        visible={isAuthModalVisible}
        onClose={() => setIsAuthModalVisible(false)}
        actionTitle={authActionTitle}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 90,
  },
  signInBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
  },
  signInText: {
    fontSize: 13,
    fontWeight: '700',
  },
  searchShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  countText: {
    fontSize: 12,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  fabText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 6,
  },
});
