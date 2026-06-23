import warm1 from '@/assets/gallery/warm-1.jpg';
import warm2 from '@/assets/gallery/warm-2.jpg';
import warm3 from '@/assets/gallery/warm-3.jpg';
import bold1 from '@/assets/gallery/bold-1.jpg';
import bold2 from '@/assets/gallery/bold-2.jpg';
import bold3 from '@/assets/gallery/bold-3.jpg';
import mystery1 from '@/assets/gallery/mystery-1.jpg';
import mystery2 from '@/assets/gallery/mystery-2.jpg';
import mystery3 from '@/assets/gallery/mystery-3.jpg';
import playful1 from '@/assets/gallery/playful-1.jpg';
import playful2 from '@/assets/gallery/playful-2.jpg';
import playful3 from '@/assets/gallery/playful-3.jpg';

export type GalleryVibe = 'warm' | 'bold' | 'mysterious' | 'playful';

export interface GalleryAvatar {
  id: string;
  src: string;
  name: string;
  vibe: GalleryVibe;
  description: string;
  premium: boolean;
}

export const GALLERY_VIBES: { id: GalleryVibe; label: string; emoji: string; description: string }[] = [
  { id: 'warm', label: 'Warm & Cozy', emoji: '🧡', description: 'Gentle, nurturing, safe' },
  { id: 'bold', label: 'Bold & Confident', emoji: '🔥', description: 'Strong, decisive, magnetic' },
  { id: 'mysterious', label: 'Mysterious', emoji: '🌙', description: 'Enigmatic, deep, intriguing' },
  { id: 'playful', label: 'Playful & Fun', emoji: '✨', description: 'Bright, joyful, adventurous' },
];

export const GALLERY_AVATARS: GalleryAvatar[] = [
  // Warm & Cozy — first one is free
  { id: 'warm-1', src: warm1, name: 'Autumn', vibe: 'warm', description: 'Gentle soul with a warm smile', premium: false },
  { id: 'warm-2', src: warm2, name: 'Elias', vibe: 'warm', description: 'Comforting presence, always there', premium: false },
  { id: 'warm-3', src: warm3, name: 'Priya', vibe: 'warm', description: 'Wise and nurturing guide', premium: true },

  // Bold & Confident — first one is free
  { id: 'bold-1', src: bold1, name: 'Valentina', vibe: 'bold', description: 'Fierce energy, razor-sharp focus', premium: false },
  { id: 'bold-2', src: bold2, name: 'Kai', vibe: 'bold', description: 'Magnetic confidence, quiet power', premium: false },
  { id: 'bold-3', src: bold3, name: 'James', vibe: 'bold', description: 'Commanding presence, steady hand', premium: true },

  // Mysterious — first one is free
  { id: 'mystery-1', src: mystery1, name: 'Raven', vibe: 'mysterious', description: 'Alluring depth, still waters', premium: false },
  { id: 'mystery-2', src: mystery2, name: 'Dante', vibe: 'mysterious', description: 'Brooding intensity, thoughtful', premium: true },
  { id: 'mystery-3', src: mystery3, name: 'Ash', vibe: 'mysterious', description: 'Ethereal and otherworldly', premium: true },

  // Playful & Fun — first one is free
  { id: 'playful-1', src: playful1, name: 'Zara', vibe: 'playful', description: 'Infectious joy, bright energy', premium: false },
  { id: 'playful-2', src: playful2, name: 'Leo', vibe: 'playful', description: 'Carefree adventurer, always laughing', premium: true },
  { id: 'playful-3', src: playful3, name: 'Mei', vibe: 'playful', description: 'Witty creative spark', premium: true },
];

export function getAvatarsByVibe(vibe: GalleryVibe): GalleryAvatar[] {
  return GALLERY_AVATARS.filter(a => a.vibe === vibe);
}

export function getFreeAvatars(): GalleryAvatar[] {
  return GALLERY_AVATARS.filter(a => !a.premium);
}

export function getPremiumAvatars(): GalleryAvatar[] {
  return GALLERY_AVATARS.filter(a => a.premium);
}
