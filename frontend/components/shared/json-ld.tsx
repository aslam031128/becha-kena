import React from 'react';
import { Listing } from '@/lib/types/listing.types';
import { PublicUserProfile } from '@/lib/types/user.types';

export function ProductJsonLd({ listing }: { listing: Listing }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    image: listing.imageUrls,
    description: listing.description,
    category: listing.category,
    itemCondition:
      listing.condition === 'brand_new'
        ? 'https://schema.org/NewCondition'
        : 'https://schema.org/UsedCondition',
    offers: {
      '@type': 'Offer',
      price: listing.price,
      priceCurrency: 'BDT',
      availability:
        listing.status === 'active'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/SoldOut',
      seller: {
        '@type': 'Person',
        name: listing.seller?.displayName || 'Verified Citizen',
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function PersonJsonLd({ profile }: { profile: PublicUserProfile }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.displayName,
    image: profile.avatarUrl || undefined,
    url: `https://becha-kena.com/user/${profile.id}`,
    aggregateRating:
      profile.averageRating > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: profile.averageRating,
            reviewCount: profile.totalDealsCompleted,
          }
        : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

