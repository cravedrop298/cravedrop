// Brand Configuration
// Allows changing the brand identity, naming, slogan, and theme tokens in a centralized place

export interface BrandConfig {
  name: string;
  tagline: string;
  shortDescription: string;
  supportEmail: string;
  currencySymbol: string;
  currencyCode: string;
  defaultDeliveryFee: number;
  logo: {
    primaryText: string;
    accentText: string;
    emoji: string;
  };
  colors: {
    background: string;
    surface: string;
    card: string;
    accentWarm: string;
    accentAmber: string;
    butterYellow: string;
    charcoalText: string;
    mutedText: string;
    border: string;
  };
}

export const BRAND: BrandConfig = {
  name: 'CraveDrop',
  tagline: 'Discover Hot Food Drops & Crave-Worthy Specials',
  shortDescription: 'Social food discovery platform where restaurants drop limited-time specials and foodies order directly from the feed.',
  supportEmail: 'hello@cravedrop.food',
  currencySymbol: '$',
  currencyCode: 'USD',
  defaultDeliveryFee: 2.99,
  logo: {
    primaryText: 'Crave',
    accentText: 'Drop',
    emoji: '🔥',
  },
  colors: {
    background: '#FAF7F2',     // Soft warm cream
    surface: '#FFFFFF',        // Clean white
    card: '#FFFDF9',           // Warm white
    accentWarm: '#E24B36',     // Warm coral-red (primary CTA)
    accentAmber: '#F59E0B',    // Warm honey/amber (ratings, accents)
    butterYellow: '#FEF7E4',   // Very light yellow badge background
    charcoalText: '#1E242B',   // Dark charcoal
    mutedText: '#64748B',      // Soft neutral gray
    border: '#EDE8E1',         // Gentle border
  },
};
