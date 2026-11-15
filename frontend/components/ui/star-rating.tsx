'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 'md',
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const starSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  const currentDisplay = hoverRating !== null ? hoverRating : value;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readOnly && setHoverRating(star)}
          onMouseLeave={() => !readOnly && setHoverRating(null)}
          className={`transition-colors ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'}`}
        >
          <Star
            className={`${starSizes[size]} ${
              star <= currentDisplay
                ? 'fill-amber-400 text-amber-400'
                : 'fill-slate-100 text-slate-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

