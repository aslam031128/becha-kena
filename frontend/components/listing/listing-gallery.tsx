'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/utils/media';

interface ListingGalleryProps {
  images: string[];
  videoUrl?: string | null;
  title: string;
}

export function ListingGallery({ images, videoUrl, title }: ListingGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const allMedia = [
    ...(videoUrl ? [{ type: 'video', url: videoUrl }] : []),
    ...images.map((url) => ({ type: 'image', url: resolveMediaUrl(url) })),
  ];

  if (allMedia.length === 0) {
    return (
      <div className="w-full aspect-[4/3] bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-sm">
        কোনো ছবি যুক্ত করা হয়নি (No images)
      </div>
    );
  }

  const currentItem = allMedia[selectedIndex] || allMedia[0];

  return (
    <div className="flex flex-col gap-3">
      {/* Primary Viewport */}
      <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200">
        {currentItem.type === 'video' ? (
          <video
            src={currentItem.url}
            controls
            className="w-full h-full object-contain"
          />
        ) : (
          <Image
            src={currentItem.url}
            alt={title}
            fill
            className="object-contain"
            priority
          />
        )}

        {/* Prev / Next Arrows */}
        {allMedia.length > 1 && (
          <>
            <button
              onClick={() => setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allMedia.length - 1))}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors backdrop-blur-xs"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSelectedIndex((prev) => (prev < allMedia.length - 1 ? prev + 1 : 0))}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors backdrop-blur-xs"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails Strip */}
      {allMedia.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
          {allMedia.map((media, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={`relative w-20 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${selectedIndex === idx ? 'border-emerald-600 scale-95' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
            >
              {media.type === 'video' ? (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white">
                  <Play className="w-5 h-5" />
                </div>
              ) : (
                <Image src={media.url} alt={`Thumb ${idx}`} fill className="object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

