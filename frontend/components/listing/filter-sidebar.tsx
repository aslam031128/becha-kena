'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, SlidersHorizontal, MapPin } from 'lucide-react';
import { ListingCategory, ListingCondition, ListingSearchParams } from '@/lib/types/listing.types';
import { LocationPicker } from '@/components/shared/location-picker';

interface FilterSidebarProps {
  currentParams: ListingSearchParams;
}

const categories: { label: string; value: ListingCategory }[] = [
  { label: '📱 Electronics', value: 'electronics' },
  { label: '🚗 Vehicles', value: 'vehicles' },
  { label: '🏠 Property', value: 'property' },
  { label: '👗 Fashion', value: 'fashion' },
  { label: '🏡 Home & Living', value: 'home' },
  { label: '🎮 Hobbies', value: 'hobbies' },
];

const conditions: { label: string; value: ListingCondition }[] = [
  { label: 'Brand New', value: 'brand_new' },
  { label: 'Like New', value: 'like_new' },
  { label: 'Gently Used', value: 'gently_used' },
  { label: 'Heavily Used', value: 'heavily_used' },
];

export function FilterSidebar({ currentParams }: FilterSidebarProps) {
  const router = useRouter();
  const [category, setCategory] = useState<string>(currentParams.category || '');
  const [condition, setCondition] = useState<string>(currentParams.condition || '');
  const [minPrice, setMinPrice] = useState<string>(currentParams.minPrice?.toString() || '');
  const [maxPrice, setMaxPrice] = useState<string>(currentParams.maxPrice?.toString() || '');
  const [location, setLocation] = useState<{ division: string; district: string; thana: string }>({
    division: currentParams.division || '',
    district: '',
    thana: currentParams.thana || '',
  });
  const [nearMe, setNearMe] = useState(false);
  const [maxDistance, setMaxDistance] = useState('25');

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (currentParams.q) params.set('q', currentParams.q);
    if (category) params.set('category', category);
    if (condition) params.set('condition', condition);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (location.division) params.set('division', location.division);
    if (location.thana) params.set('thana', location.thana);

    if (nearMe && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        params.set('latitude', pos.coords.latitude.toString());
        params.set('longitude', pos.coords.longitude.toString());
        params.set('maxDistanceKm', maxDistance);
        router.push(`/search?${params.toString()}`);
      });
      return;
    }

    router.push(`/search?${params.toString()}`);
  };

  const resetFilters = () => {
    setCategory('');
    setCondition('');
    setMinPrice('');
    setMaxPrice('');
    setLocation({ division: '', district: '', thana: '' });
    setNearMe(false);
    router.push('/search');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
          <Filter className="w-4 h-4 text-emerald-600" />
          <span>ফিল্টার (Filters)</span>
        </div>
        <button
          onClick={resetFilters}
          className="text-xs text-slate-400 hover:text-red-500 font-medium transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-bold text-slate-900 mb-2">ক্যাটাগরি</label>
        <div className="space-y-1.5">
          {categories.map((cat) => (
            <label
              key={cat.value}
              className="flex items-center gap-2 text-xs text-slate-700 hover:text-emerald-700 cursor-pointer font-medium"
            >
              <input
                type="radio"
                name="category"
                value={cat.value}
                checked={category === cat.value}
                onChange={() => setCategory(cat.value)}
                className="text-emerald-600 focus:ring-emerald-500 rounded-sm"
              />
              <span>{cat.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Condition */}
      <div>
        <label className="block text-xs font-bold text-slate-900 mb-2">পণ্যের অবস্থা</label>
        <div className="space-y-1.5">
          {conditions.map((cond) => (
            <label
              key={cond.value}
              className="flex items-center gap-2 text-xs text-slate-700 hover:text-emerald-700 cursor-pointer font-medium"
            >
              <input
                type="radio"
                name="condition"
                value={cond.value}
                checked={condition === cond.value}
                onChange={() => setCondition(cond.value)}
                className="text-emerald-600 focus:ring-emerald-500 rounded-sm"
              />
              <span>{cond.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-xs font-bold text-slate-900 mb-2">মূল্যের পরিধি (৳)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
          />
          <span className="text-slate-400">-</span>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
          />
        </div>
      </div>

      {/* Location Picker */}
      <div>
        <label className="block text-xs font-bold text-slate-900 mb-2">লোকেশন নির্বাচন</label>
        <LocationPicker
          initialDivision={location.division}
          onChange={(loc) => setLocation(loc)}
        />
      </div>

      {/* Near Me Toggle */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
        <label className="flex items-center justify-between text-xs font-semibold text-slate-800 cursor-pointer">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>আমার কাছাকাছি (Near Me)</span>
          </span>
          <input
            type="checkbox"
            checked={nearMe}
            onChange={(e) => setNearMe(e.target.checked)}
            className="rounded text-emerald-600 focus:ring-emerald-500"
          />
        </label>
        {nearMe && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] text-slate-500">দূরত্ব:</span>
            <select
              value={maxDistance}
              onChange={(e) => setMaxDistance(e.target.value)}
              className="text-xs px-2 py-1 rounded border border-slate-200 bg-white"
            >
              <option value="10">১০ কিমি</option>
              <option value="25">২৫ কিমি</option>
              <option value="50">৫০ কিমি</option>
            </select>
          </div>
        )}
      </div>

      {/* Action CTA */}
      <button
        onClick={applyFilters}
        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span>ফিল্টার প্রয়োগ করুন (Apply)</span>
      </button>
    </div>
  );
}

