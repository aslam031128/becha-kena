import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/theme';
import { useListingStore } from '@/store/listing.store';
import { useLocation } from '@/hooks/useLocation';
import {
  ListingCategory,
  ListingCondition,
  ListingSearchParams,
} from '@/types/listing.types';
import {
  ListingCard,
  ListingCardSkeleton,
  LocationPickerModal,
} from '@/components/listing';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { CATEGORIES } from '@/utils/bd-data';

const RECENT_SEARCHES_KEY = '@becha_kena_recent_searches';

const CONDITIONS: { id: ListingCondition; label: string }[] = [
  { id: 'brand_new', label: 'Brand New' },
  { id: 'like_new', label: 'Like New' },
  { id: 'gently_used', label: 'Gently Used' },
  { id: 'heavily_used', label: 'Heavily Used' },
];

const SORT_OPTIONS: { id: ListingSearchParams['sort']; label: string }[] = [
  { id: 'newest', label: 'Newest First' },
  { id: 'price_low', label: 'Price: Low to High' },
  { id: 'price_high', label: 'Price: High to Low' },
  { id: 'distance', label: 'Nearest First' },
];

const PRICE_PRESETS = [
  { label: 'Under BDT 5,000', min: undefined, max: 5000 },
  { label: 'BDT 5k - 25k', min: 5000, max: 25000 },
  { label: 'BDT 25k - 1,00,000', min: 25000, max: 100000 },
  { label: 'Above BDT 1,00,000', min: 100000, max: undefined },
];

const RADIUS_OPTIONS = [5, 10, 25, 50];

export default function SearchScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const router = useRouter();

  const {
    listings,
    isLoading,
    isRefreshing,
    isLoadingMore,
    filters,
    pagination,
    fetchListings,
    refreshListings,
    loadMoreListings,
    setFilter,
    resetFilters,
  } = useListingStore();

  const { coords, requestLocationPermission } = useLocation();

  // Search input state
  const [searchInput, setSearchInput] = useState(filters.q || '');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Filter modal draft state
  const [tempCategory, setTempCategory] = useState<ListingCategory | undefined>(filters.category as any);
  const [tempDivision, setTempDivision] = useState<string | undefined>(filters.division);
  const [tempThana, setTempThana] = useState<string | undefined>(filters.thana);
  const [tempCondition, setTempCondition] = useState<ListingCondition | undefined>(filters.condition as any);
  const [tempMinPrice, setTempMinPrice] = useState(filters.minPrice ? String(filters.minPrice) : '');
  const [tempMaxPrice, setTempMaxPrice] = useState(filters.maxPrice ? String(filters.maxPrice) : '');
  const [tempSort, setTempSort] = useState<ListingSearchParams['sort']>(filters.sort || 'newest');
  const [tempMaxDistanceKm, setTempMaxDistanceKm] = useState<number | undefined>(filters.maxDistanceKm);
  const [useGpsProximity, setUseGpsProximity] = useState(!!filters.latitude);

  const debounceTimer = useRef<any>(null);

  // Load recent searches
  useEffect(() => {
    AsyncStorage.getItem(RECENT_SEARCHES_KEY).then((data) => {
      if (data) {
        try {
          setRecentSearches(JSON.parse(data));
        } catch {
          // ignore error
        }
      }
    });
  }, []);

  const saveRecentSearch = async (term: string) => {
    if (!term || term.trim().length < 2) return;
    const cleaned = term.trim();
    const updated = [cleaned, ...recentSearches.filter((s) => s.toLowerCase() !== cleaned.toLowerCase())].slice(0, 10);
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  // Debounced search on typing
  const handleSearchTextChange = (text: string) => {
    setSearchInput(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      setFilter('q', text.trim() || undefined);
      fetchListings({ q: text.trim() || undefined });
      if (text.trim().length >= 2) {
        saveRecentSearch(text);
      }
    }, 500);
  };

  const handleRecentChipPress = (term: string) => {
    setSearchInput(term);
    setFilter('q', term);
    fetchListings({ q: term });
  };

  const handleClearSearchInput = () => {
    setSearchInput('');
    setFilter('q', undefined);
    fetchListings({ q: undefined });
  };

  // Filter Modal Actions
  const handleOpenFilters = () => {
    setTempCategory(filters.category as any);
    setTempDivision(filters.division);
    setTempThana(filters.thana);
    setTempCondition(filters.condition as any);
    setTempMinPrice(filters.minPrice ? String(filters.minPrice) : '');
    setTempMaxPrice(filters.maxPrice ? String(filters.maxPrice) : '');
    setTempSort(filters.sort || 'newest');
    setTempMaxDistanceKm(filters.maxDistanceKm);
    setUseGpsProximity(!!filters.latitude);
    setIsFilterModalOpen(true);
  };

  const handleApplyFilters = async () => {
    const minP = tempMinPrice ? parseInt(tempMinPrice, 10) : undefined;
    const maxP = tempMaxPrice ? parseInt(tempMaxPrice, 10) : undefined;

    let lat: number | undefined = undefined;
    let lng: number | undefined = undefined;

    if (useGpsProximity) {
      if (coords) {
        lat = coords.latitude;
        lng = coords.longitude;
      } else {
        const coordsResult = await requestLocationPermission();
        if (coordsResult) {
          lat = coordsResult.latitude;
          lng = coordsResult.longitude;
        }
      }
    }

    const newParams: ListingSearchParams = {
      q: searchInput.trim() || undefined,
      category: tempCategory,
      division: tempDivision,
      thana: tempThana,
      condition: tempCondition,
      minPrice: isNaN(minP as number) ? undefined : minP,
      maxPrice: isNaN(maxP as number) ? undefined : maxP,
      sort: tempSort,
      latitude: lat,
      longitude: lng,
      maxDistanceKm: useGpsProximity ? tempMaxDistanceKm || 25 : undefined,
    };

    setIsFilterModalOpen(false);
    fetchListings(newParams);
  };

  const handleResetFilters = () => {
    setTempCategory(undefined);
    setTempDivision(undefined);
    setTempThana(undefined);
    setTempCondition(undefined);
    setTempMinPrice('');
    setTempMaxPrice('');
    setTempSort('newest');
    setTempMaxDistanceKm(undefined);
    setUseGpsProximity(false);
    resetFilters();
    fetchListings({});
    setIsFilterModalOpen(false);
  };

  // Active filter chip remove handlers
  const removeFilter = (key: keyof ListingSearchParams) => {
    setFilter(key, undefined);
    if (key === 'latitude' || key === 'longitude') {
      setFilter('maxDistanceKm', undefined);
    }
    fetchListings({ [key]: undefined });
  };

  const countActiveFilters = (): number => {
    let count = 0;
    if (filters.category) count++;
    if (filters.division) count++;
    if (filters.thana) count++;
    if (filters.condition) count++;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    if (filters.latitude) count++;
    if (filters.sort && filters.sort !== 'newest') count++;
    return count;
  };

  const activeFiltersCount = countActiveFilters();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Top Search Bar */}
      <View
        style={[
          styles.headerRow,
          {
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            placeholder="Search listings..."
            placeholderTextColor={colors.textMuted}
            value={searchInput}
            onChangeText={handleSearchTextChange}
            style={[styles.input, { color: colors.textPrimary }]}
            returnKeyType="search"
            autoFocus={false}
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={handleClearSearchInput}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Trigger Button */}
        <TouchableOpacity
          onPress={handleOpenFilters}
          style={[
            styles.filterTrigger,
            {
              backgroundColor: activeFiltersCount > 0 ? colors.primaryLight : colors.surfaceAlt,
              borderColor: activeFiltersCount > 0 ? colors.primary : colors.border,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Ionicons
            name="options"
            size={20}
            color={activeFiltersCount > 0 ? colors.primary : colors.textPrimary}
          />
          {activeFiltersCount > 0 && (
            <View style={[styles.badgeCircle, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Recent Searches (when search query is blank) */}
      {!searchInput && recentSearches.length > 0 && (
        <View style={[styles.recentSection, { paddingHorizontal: spacing.md }]}>
          <View style={styles.recentHeader}>
            <Text style={[styles.recentTitle, { color: colors.textSecondary }]}>
              Recent Searches
            </Text>
            <TouchableOpacity onPress={clearRecentSearches}>
              <Text style={[styles.clearRecentText, { color: colors.primary }]}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            {recentSearches.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleRecentChipPress(item)}
                style={[
                  styles.recentChip,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                    borderRadius: borderRadius.full,
                  },
                ]}
              >
                <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                <Text style={[styles.recentChipText, { color: colors.textPrimary }]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Active Filter Chips Bar */}
      {activeFiltersCount > 0 && (
        <View style={styles.activeFiltersRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: 6 }}
          >
            {filters.category && (
              <View style={[styles.activeChip, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                <Text style={[styles.activeChipText, { color: colors.primary }]}>
                  Category: {filters.category}
                </Text>
                <TouchableOpacity onPress={() => removeFilter('category')}>
                  <Ionicons name="close" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}

            {filters.division && (
              <View style={[styles.activeChip, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                <Text style={[styles.activeChipText, { color: colors.primary }]}>
                  {filters.division}
                </Text>
                <TouchableOpacity onPress={() => removeFilter('division')}>
                  <Ionicons name="close" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}

            {filters.thana && (
              <View style={[styles.activeChip, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                <Text style={[styles.activeChipText, { color: colors.primary }]}>
                  {filters.thana}
                </Text>
                <TouchableOpacity onPress={() => removeFilter('thana')}>
                  <Ionicons name="close" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}

            {filters.condition && (
              <View style={[styles.activeChip, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                <Text style={[styles.activeChipText, { color: colors.primary }]}>
                  {String(filters.condition).replace('_', ' ')}
                </Text>
                <TouchableOpacity onPress={() => removeFilter('condition')}>
                  <Ionicons name="close" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}

            {filters.minPrice && (
              <View style={[styles.activeChip, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                <Text style={[styles.activeChipText, { color: colors.primary }]}>
                  Min BDT {filters.minPrice.toLocaleString()}
                </Text>
                <TouchableOpacity onPress={() => removeFilter('minPrice')}>
                  <Ionicons name="close" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}

            {filters.maxPrice && (
              <View style={[styles.activeChip, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                <Text style={[styles.activeChipText, { color: colors.primary }]}>
                  Max BDT {filters.maxPrice.toLocaleString()}
                </Text>
                <TouchableOpacity onPress={() => removeFilter('maxPrice')}>
                  <Ionicons name="close" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}

            {filters.latitude && (
              <View style={[styles.activeChip, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                <Text style={[styles.activeChipText, { color: colors.primary }]}>
                  Near GPS ({filters.maxDistanceKm || 25}km)
                </Text>
                <TouchableOpacity onPress={() => removeFilter('latitude')}>
                  <Ionicons name="close" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity onPress={handleResetFilters} style={styles.clearAllBtn}>
              <Text style={[styles.clearAllText, { color: colors.danger }]}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Results Count Banner */}
      <View style={[styles.resultsHeader, { paddingHorizontal: spacing.md }]}>
        <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
          {pagination?.totalCount !== undefined
            ? `${pagination.totalCount} items found`
            : `${listings.length} items found`}
        </Text>
        {filters.sort && (
          <Text style={[styles.sortNotice, { color: colors.textMuted }]}>
            Sorted by: {SORT_OPTIONS.find((s) => s.id === filters.sort)?.label || 'Newest'}
          </Text>
        )}
      </View>

      {/* Listing Catalog Feed */}
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
            <ListingCard listing={item} style={{ marginHorizontal: spacing.md }} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="search" size={48} color={colors.textMuted} />}
              title="No Matching Listings"
              subtitle="We couldn't find anything matching your exact search filters. Try adjusting keywords or clearing specific constraints."
              actionTitle="Reset All Filters"
              onAction={handleResetFilters}
            />
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <View style={{ height: 40 }} />
            )
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

      {/* Faceted Filter Modal */}
      <Modal
        visible={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter & Sort Listings"
      >
        <ScrollView style={styles.filterScroll} showsVerticalScrollIndicator={false}>
          {/* Category */}
          <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>
            Category
          </Text>
          <View style={styles.categoryWrap}>
            {CATEGORIES.map((cat) => {
              const isSelected = tempCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setTempCategory(isSelected ? undefined : cat.id)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceAlt,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderRadius: borderRadius.full,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: isSelected ? colors.surface : colors.textPrimary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {cat.icon} {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Location / Near Me */}
          <Text style={[styles.modalSectionTitle, { color: colors.textPrimary, marginTop: 14 }]}>
            Location & Proximity
          </Text>
          <TouchableOpacity
            onPress={() => setIsLocationModalOpen(true)}
            style={[
              styles.locationSelectBtn,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
              },
            ]}
          >
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <Text style={[styles.locationSelectText, { color: colors.textPrimary }]}>
              {tempThana ? `${tempThana}, ${tempDivision}` : tempDivision ? tempDivision : 'Choose Division & Thana'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* GPS Near Me Radius Slider / Chips */}
          <TouchableOpacity
            onPress={() => setUseGpsProximity(!useGpsProximity)}
            style={[
              styles.proximityToggle,
              {
                backgroundColor: useGpsProximity ? colors.primaryLight : colors.surfaceAlt,
                borderColor: useGpsProximity ? colors.primary : colors.border,
                borderRadius: borderRadius.md,
                marginTop: 8,
              },
            ]}
          >
            <Ionicons
              name={useGpsProximity ? 'checkbox' : 'square-outline'}
              size={20}
              color={useGpsProximity ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.proximityToggleText,
                { color: useGpsProximity ? colors.primary : colors.textPrimary },
              ]}
            >
              Filter items within radius of current GPS
            </Text>
          </TouchableOpacity>

          {useGpsProximity && (
            <View style={styles.radiusRow}>
              {RADIUS_OPTIONS.map((km) => (
                <TouchableOpacity
                  key={km}
                  onPress={() => setTempMaxDistanceKm(km)}
                  style={[
                    styles.radiusChip,
                    {
                      backgroundColor:
                        (tempMaxDistanceKm || 25) === km ? colors.primary : colors.surfaceAlt,
                      borderColor:
                        (tempMaxDistanceKm || 25) === km ? colors.primary : colors.border,
                      borderRadius: borderRadius.full,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color:
                        (tempMaxDistanceKm || 25) === km ? colors.surface : colors.textPrimary,
                      fontWeight: (tempMaxDistanceKm || 25) === km ? '700' : '500',
                    }}
                  >
                    {km} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Price Range */}
          <Text style={[styles.modalSectionTitle, { color: colors.textPrimary, marginTop: 14 }]}>
            Price Range (BDT)
          </Text>
          <View style={styles.priceInputRow}>
            <View
              style={[
                styles.priceInputBox,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>BDT</Text>
              <TextInput
                placeholder="Min Price"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={tempMinPrice}
                onChangeText={setTempMinPrice}
                style={[styles.priceInput, { color: colors.textPrimary }]}
              />
            </View>
            <Text style={{ marginHorizontal: 8, color: colors.textMuted }}>to</Text>
            <View
              style={[
                styles.priceInputBox,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>BDT</Text>
              <TextInput
                placeholder="Max Price"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={tempMaxPrice}
                onChangeText={setTempMaxPrice}
                style={[styles.priceInput, { color: colors.textPrimary }]}
              />
            </View>
          </View>

          {/* Quick Price Preset Chips */}
          <View style={styles.presetWrap}>
            {PRICE_PRESETS.map((preset, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  setTempMinPrice(preset.min ? String(preset.min) : '');
                  setTempMaxPrice(preset.max ? String(preset.max) : '');
                }}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                    borderRadius: borderRadius.full,
                  },
                ]}
              >
                <Text style={[styles.presetText, { color: colors.textSecondary }]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Condition */}
          <Text style={[styles.modalSectionTitle, { color: colors.textPrimary, marginTop: 14 }]}>
            Condition
          </Text>
          <View style={styles.conditionWrap}>
            {CONDITIONS.map((cond) => {
              const isSelected = tempCondition === cond.id;
              return (
                <TouchableOpacity
                  key={cond.id}
                  onPress={() => setTempCondition(isSelected ? undefined : cond.id)}
                  style={[
                    styles.conditionRow,
                    {
                      borderColor: colors.border,
                      backgroundColor: isSelected ? colors.primaryLight : colors.surfaceAlt,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                >
                  <Ionicons
                    name={isSelected ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.conditionText,
                      {
                        color: isSelected ? colors.primary : colors.textPrimary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {cond.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Sort Order */}
          <Text style={[styles.modalSectionTitle, { color: colors.textPrimary, marginTop: 14 }]}>
            Sort By
          </Text>
          <View style={styles.sortWrap}>
            {SORT_OPTIONS.map((opt) => {
              const isSelected = tempSort === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setTempSort(opt.id)}
                  style={[
                    styles.sortRow,
                    {
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sortLabel,
                      {
                        color: isSelected ? colors.primary : colors.textPrimary,
                        fontWeight: isSelected ? '700' : '400',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.modalActionsRow}>
            <Button
              title="Reset All"
              variant="secondary"
              onPress={handleResetFilters}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title="Apply Filters"
              variant="primary"
              onPress={handleApplyFilters}
              style={{ flex: 1.5 }}
            />
          </View>
        </ScrollView>
      </Modal>

      {/* Location Picker Sub-Modal */}
      <LocationPickerModal
        visible={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        selectedDivision={tempDivision}
        selectedThana={tempThana}
        onSelectLocation={(loc) => {
          setTempDivision(loc.division);
          setTempThana(loc.thana);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 10,
    padding: 4,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    marginLeft: 6,
    fontSize: 14,
    padding: 0,
  },
  filterTrigger: {
    marginLeft: 10,
    padding: 8,
    borderWidth: 1,
    position: 'relative',
  },
  badgeCircle: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  recentSection: {
    paddingVertical: 8,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearRecentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    marginRight: 8,
    gap: 4,
  },
  recentChipText: {
    fontSize: 12,
  },
  activeFiltersRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 14,
    marginRight: 8,
    gap: 4,
  },
  activeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearAllBtn: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  sortNotice: {
    fontSize: 11,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  filterScroll: {
    maxHeight: 460,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
  locationSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  locationSelectText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
  },
  proximityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 8,
  },
  proximityToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  radiusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  radiusChip: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  currencyPrefix: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 6,
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 11,
  },
  conditionWrap: {
    gap: 6,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    gap: 8,
  },
  conditionText: {
    fontSize: 13,
  },
  sortWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortLabel: {
    fontSize: 13,
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
});
