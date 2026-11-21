import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WishlistState {
  wishlistIds: string[];
  toggleWishlist: (listingId: string) => boolean; // returns new saved state
  isWishlisted: (listingId: string) => boolean;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      wishlistIds: [],

      toggleWishlist: (listingId: string) => {
        const current = get().wishlistIds;
        const exists = current.includes(listingId);
        const updated = exists
          ? current.filter((id) => id !== listingId)
          : [...current, listingId];

        set({ wishlistIds: updated });
        return !exists;
      },

      isWishlisted: (listingId: string) => {
        return get().wishlistIds.includes(listingId);
      },

      clearWishlist: () => set({ wishlistIds: [] }),
    }),
    {
      name: 'becha-kena-wishlist-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
