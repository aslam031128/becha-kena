import { create } from 'zustand';
import { Listing, ListingSearchParams } from '@/types/listing.types';
import { PaginationMeta } from '@/types/api.types';
import { listingApi } from '@/services/api/listing.api';
import { parseApiError } from '@/services/api/client';

export interface ListingState {
  listings: Listing[];
  selectedListing: Listing | null;
  searchQuery: string;
  filters: ListingSearchParams;
  pagination: PaginationMeta | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  error: string | null;

  // Actions
  fetchListings: (params?: ListingSearchParams) => Promise<void>;
  loadMoreListings: () => Promise<void>;
  refreshListings: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setFilter: (key: keyof ListingSearchParams, value: any) => void;
  resetFilters: () => void;
  fetchListingDetail: (id: string) => Promise<Listing>;
  clearSelectedListing: () => void;
}

const defaultFilters: ListingSearchParams = {
  sort: 'newest',
  page: 1,
  limit: 20,
};

export const useListingStore = create<ListingState>((set, get) => ({
  listings: [],
  selectedListing: null,
  searchQuery: '',
  filters: defaultFilters,
  pagination: null,
  isLoading: false,
  isRefreshing: false,
  isLoadingMore: false,
  error: null,

  fetchListings: async (params?: ListingSearchParams) => {
    const activeFilters = { ...get().filters, ...params, page: 1 };
    set({ isLoading: true, error: null, filters: activeFilters });

    try {
      const response = await listingApi.searchListings(activeFilters);
      set({
        listings: response.data,
        pagination: response.meta || null,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: parseApiError(err), isLoading: false });
    }
  },

  loadMoreListings: async () => {
    const { pagination, isLoadingMore, filters, listings } = get();
    if (isLoadingMore || !pagination || pagination.page >= pagination.totalPages) {
      return;
    }

    const nextPage = pagination.page + 1;
    const nextFilters = { ...filters, page: nextPage };
    set({ isLoadingMore: true });

    try {
      const response = await listingApi.searchListings(nextFilters);
      set({
        listings: [...listings, ...response.data],
        pagination: response.meta || null,
        filters: nextFilters,
        isLoadingMore: false,
      });
    } catch (err: any) {
      set({ isLoadingMore: false });
    }
  },

  refreshListings: async () => {
    set({ isRefreshing: true });
    try {
      const resetFilterParams = { ...get().filters, page: 1 };
      const response = await listingApi.searchListings(resetFilterParams);
      set({
        listings: response.data,
        pagination: response.meta || null,
        filters: resetFilterParams,
        isRefreshing: false,
      });
    } catch (err: any) {
      set({ isRefreshing: false });
    }
  },

  setSearchQuery: (query: string) => {
    set((state) => ({
      searchQuery: query,
      filters: { ...state.filters, q: query.trim() || undefined },
    }));
  },

  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    }));
  },

  resetFilters: () => {
    set({ filters: defaultFilters, searchQuery: '' });
  },

  fetchListingDetail: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await listingApi.getListingById(id);
      set({ selectedListing: response.data, isLoading: false });
      return response.data;
    } catch (err: any) {
      const msg = parseApiError(err);
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  clearSelectedListing: () => set({ selectedListing: null }),
}));
