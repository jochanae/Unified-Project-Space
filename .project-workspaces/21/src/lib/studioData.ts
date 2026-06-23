/**
 * Studio category data — Person path and Abstract path.
 * Drives the entire Studio builder UI.
 */

import { STUDIO_IMAGES } from './studioImages';
import { COMMUNICATION_STYLES } from './communicationStyles';

export type InputType = 'clustered' | 'cards' | 'pills' | 'tones' | 'iris' | 'vibes' | 'rhythms';

export interface StudioItem {
  name: string;
  img?: string;
  /** Alternate image shown when masculine gender is selected */
  maleImg?: string;
  emoji?: string;
  color?: string;
  desc?: string;
  premium?: boolean;
  /** Item only visible to 18+ users */
  adultOnly?: boolean;
  /** Gender lock: 'f' = feminine only, 'm' = masculine only, undefined = all */
  gender?: 'f' | 'm';
}

export interface StudioCluster {
  label: string;
  items: StudioItem[];
}

export interface StudioSection {
  id: string;
  title: string;
  required: boolean;
  type: InputType;
  multi?: boolean;
  maxSelect?: number;
  items?: StudioItem[];
  clusters?: StudioCluster[];
}

/* ─── Art Styles ─── */
const STYLE_ITEMS: StudioItem[] = [
  { name: 'Photorealistic', img: STUDIO_IMAGES.photorealistic },
  { name: 'Painterly', img: STUDIO_IMAGES.painterly },
  { name: 'Illustrated', img: STUDIO_IMAGES.artistic },
  { name: 'Moody Portrait', img: STUDIO_IMAGES['moody-portrait'] },
  { name: 'Digital Art', img: STUDIO_IMAGES['digital-art'] },
  { name: 'Cosmic Portrait', img: STUDIO_IMAGES['cosmic-portrait'], premium: true },
  { name: 'Pop Art', img: STUDIO_IMAGES['pop-art'], premium: true },
  { name: 'Anime', img: STUDIO_IMAGES.anime, premium: true },
  { name: 'Comic', img: STUDIO_IMAGES.comic, premium: true },
  { name: 'Watercolor', img: STUDIO_IMAGES.watercolor, premium: true },
  { name: 'Cyberpunk', img: STUDIO_IMAGES.cyberpunk, premium: true },
  { name: '3D Render', img: STUDIO_IMAGES['3d-render'], premium: true },
];

const ABSTRACT_STYLE_ITEMS: StudioItem[] = [
  { name: 'Abstract', img: STUDIO_IMAGES.abstract },
  { name: 'AI Generated', img: STUDIO_IMAGES['ai-generated'] },
  { name: 'Cosmic / Energy', img: STUDIO_IMAGES.cosmic },
  { name: 'Stylized', img: STUDIO_IMAGES.stylized },
];

const GENDER_ITEMS: StudioItem[] = [
  { name: 'Feminine', img: STUDIO_IMAGES['gender-feminine'], desc: 'Soft, graceful energy' },
  { name: 'Masculine', img: STUDIO_IMAGES['gender-masculine'], desc: 'Strong, confident presence' },
  { name: 'Androgynous', img: STUDIO_IMAGES['gender-androgynous'], desc: 'Balanced, fluid beauty' },
  { name: 'Non-binary', img: STUDIO_IMAGES['gender-nonbinary'], desc: 'Beyond the binary' },
  { name: 'Fluid', img: STUDIO_IMAGES['gender-fluid'], desc: 'Ever-shifting expression' },
];

const SKIN_TONE_ITEMS: StudioItem[] = [
  { name: 'Fair', img: STUDIO_IMAGES['skin-fair'], maleImg: STUDIO_IMAGES['skin-fair-m'], color: '#f5d5b8', desc: 'Porcelain, cool undertones' },
  { name: 'Light', img: STUDIO_IMAGES['skin-light'], maleImg: STUDIO_IMAGES['skin-light-m'], color: '#e8b88a', desc: 'Peach, warm undertones' },
  { name: 'Honey-Gold', img: STUDIO_IMAGES['skin-light'], maleImg: STUDIO_IMAGES['skin-light-m'], color: '#e0a458', desc: 'Golden, yellow undertones' },
  { name: 'Medium', img: STUDIO_IMAGES['skin-medium'], maleImg: STUDIO_IMAGES['skin-medium-m'], color: '#c68642', desc: 'Neutral, balanced warmth' },
  { name: 'Warm Olive', img: STUDIO_IMAGES['skin-medium'], maleImg: STUDIO_IMAGES['skin-medium-m'], color: '#b07a3a', desc: 'Olive, golden undertones' },
  { name: 'Amber', img: STUDIO_IMAGES['skin-tan'], maleImg: STUDIO_IMAGES['skin-tan-m'], color: '#c4843c', desc: 'Amber, rich yellow tones' },
  { name: 'Tan', img: STUDIO_IMAGES['skin-tan'], maleImg: STUDIO_IMAGES['skin-tan-m'], color: '#a0522d', desc: 'Sun-kissed, warm brown' },
  { name: 'Deep', img: STUDIO_IMAGES['skin-deep'], maleImg: STUDIO_IMAGES['skin-deep-m'], color: '#6b3a2a', desc: 'Deep brown, warm glow' },
  { name: 'Rich', img: STUDIO_IMAGES['skin-rich'], maleImg: STUDIO_IMAGES['skin-rich-m'], color: '#3d1c10', desc: 'Deep espresso, cool tones' },
];

/* ─── Body Types — Cinematic Portraits ─── */
/* ─── Eye Color ─── */
const EYE_COLOR_ITEMS: StudioItem[] = [
  { name: 'Dark Brown', color: '#3d1c10', desc: 'Deep, warm brown' },
  { name: 'Brown', color: '#6b3a2a', desc: 'Classic warm brown' },
  { name: 'Amber', color: '#c4843c', desc: 'Golden, warm tone' },
  { name: 'Hazel', color: '#8b7355', desc: 'Green-brown blend' },
  { name: 'Green', color: '#2d8a4e', desc: 'Vivid green' },
  { name: 'Blue', color: '#4a90d9', desc: 'Clear sky blue' },
  { name: 'Gray', color: '#8e9aaf', desc: 'Cool steel gray' },
  { name: 'Honey Gold', color: '#d4a017', desc: 'Warm golden', premium: true },
  { name: 'Ice Blue', color: '#a8d8ea', desc: 'Pale, striking blue', premium: true },
  { name: 'Violet', color: '#9b59b6', desc: 'Lavender / purple', premium: true },
  { name: 'Emerald', color: '#00b894', desc: 'Deep jewel green', premium: true },
];

/* ─── Body Types — Cinematic Portraits ─── */
const BODY_TYPE_ITEMS: StudioItem[] = [
  { name: 'Hourglass', img: STUDIO_IMAGES['body-hourglass'], desc: 'Balanced, defined waist', gender: 'f' },
  { name: 'Pear', img: STUDIO_IMAGES['body-pear'], desc: 'Wider hips, narrower shoulders', gender: 'f' },
  { name: 'Athletic', img: STUDIO_IMAGES['body-inverted-triangle'], desc: 'Broad shoulders, lean', gender: 'm' },
  { name: 'Straight', img: STUDIO_IMAGES['body-rectangle'], desc: 'Even, balanced silhouette', gender: 'f' },
  { name: 'Straight', img: STUDIO_IMAGES['body-rectangle-male'], desc: 'Even, balanced silhouette', gender: 'm' },
  { name: 'Apple', img: STUDIO_IMAGES['body-apple'], desc: 'Soft, rounded contour', gender: 'f' },
  { name: 'Plus', img: STUDIO_IMAGES['body-plus'], desc: 'Full, confident curves', gender: 'f' },
  { name: 'Plus (Male)', img: STUDIO_IMAGES['body-plus-male'], desc: 'Big, confident build', gender: 'm' },
  { name: 'Plus (Female)', img: STUDIO_IMAGES['body-plus-female'], desc: 'Full, beautiful figure', gender: 'f' },
  { name: 'Muscular', img: STUDIO_IMAGES['body-muscular'], desc: 'Strong, powerful build', gender: 'm' },
  { name: 'Petite', img: STUDIO_IMAGES['body-petite'], desc: 'Small-framed, delicate', gender: 'f' },
  { name: 'Tall / Statuesque', img: STUDIO_IMAGES['body-tall'], desc: 'Long, elegant proportions', gender: 'f' },
  { name: 'Lean / Ectomorph', img: STUDIO_IMAGES['body-lean'], desc: 'Slim, narrow build', gender: 'm' },
];

/* ─── Hair — Feminine catalog (diverse representation) ─── */
const HAIR_ITEMS: StudioItem[] = [
  // Short
  { name: 'Short Bob', img: STUDIO_IMAGES['short-brown'], desc: 'Soft tousled bob' },
  { name: 'Short Textured', img: STUDIO_IMAGES['short-asian'], desc: 'Modern textured' },
  { name: 'Short Classic', img: STUDIO_IMAGES.short },
  { name: 'Pixie Cut', img: STUDIO_IMAGES['pixie'], desc: 'Chic, textured layers' },
  // Long
  { name: 'Long Wavy', img: STUDIO_IMAGES['long-wavy-latina'], desc: 'Flowing waves' },
  { name: 'Long Straight', img: STUDIO_IMAGES['long-south-asian'] },
  { name: 'Long Classic', img: STUDIO_IMAGES.long },
  { name: 'Bangs / Fringe', img: STUDIO_IMAGES['bangs'], desc: 'Blunt-cut fringe' },
  // Curly & Natural
  { name: 'Curly Coils', img: STUDIO_IMAGES['curly-black'], desc: '3C-4C texture', premium: true },
  { name: 'Curly Loose', img: STUDIO_IMAGES['curly-mideast'], desc: 'Loose curls' },
  { name: 'Curly Classic', img: STUDIO_IMAGES.curly },
  { name: 'Natural Afro', img: STUDIO_IMAGES['afro-f'], desc: 'Full, voluminous afro' },
  // Braids & Twists
  { name: 'Braids', img: STUDIO_IMAGES['braids-dark'], desc: 'Cornrows & box braids', premium: true },
  { name: 'Braids Classic', img: STUDIO_IMAGES.braids, premium: true },
  // Updos & Styled
  { name: 'Updo / Bun', img: STUDIO_IMAGES['updo'], desc: 'Elegant pulled-back style' },
  { name: 'Wavy Red', img: STUDIO_IMAGES['wavy-red'] },
  { name: 'Waves', img: STUDIO_IMAGES['waves-brown'], desc: '360 waves & twists', premium: true },
  // Buzz
  { name: 'Buzz Cut', img: STUDIO_IMAGES['buzz-dark'], premium: true },
  { name: 'Buzz Classic', img: STUDIO_IMAGES.buzz, premium: true },
];

/* ─── Male Hair — Diverse styles, shuffled for inclusive browsing ─── */
const MALE_HAIR_ITEMS: StudioItem[] = [
  { name: '360 Waves', img: STUDIO_IMAGES['360-waves'], desc: 'Brushed wave pattern' },
  { name: 'Short Fade', img: STUDIO_IMAGES['short-brown'], desc: 'Clean fade' },
  { name: 'Natural Afro', img: STUDIO_IMAGES['afro-m'], desc: 'Full, voluminous afro' },
  { name: 'Slicked Back', img: STUDIO_IMAGES['slicked'], desc: 'Polished, classic style' },
  { name: 'Cornrows', img: STUDIO_IMAGES['cornrows'], desc: 'Tight geometric rows' },
  { name: 'Short Textured', img: STUDIO_IMAGES['short-asian'], desc: 'Modern textured' },
  { name: 'High Skin Fade', img: STUDIO_IMAGES['high-fade'], desc: 'Sharp, clean lines' },
  { name: 'Long Flowing', img: STUDIO_IMAGES['long-m'], desc: 'Shoulder-length, natural' },
  { name: 'Tapered Fro-hawk', img: STUDIO_IMAGES['frohawk'], desc: 'Sculpted, statement cut' },
  { name: 'Short Classic', img: STUDIO_IMAGES.short },
  { name: 'Low Taper', img: STUDIO_IMAGES['low-taper'], desc: 'Clean taper fade' },
  { name: 'Groomed Locs', img: STUDIO_IMAGES['groomed-locs'], desc: 'Well-maintained locs', premium: true },
  { name: 'Curly Coils', img: STUDIO_IMAGES['curly-black'], desc: '3C-4C texture', premium: true },
  { name: 'Braids', img: STUDIO_IMAGES['braids-dark'], desc: 'Box braids', premium: true },
  { name: 'Twist Out', img: STUDIO_IMAGES['twist-out'], desc: 'Defined twist texture', premium: true },
  { name: 'Buzz Cut', img: STUDIO_IMAGES['buzz-dark'], desc: 'Sharp buzz', premium: true },
  { name: 'Waves', img: STUDIO_IMAGES['waves-brown'], desc: '360 waves & twists', premium: true },
];

const HAIR_COLOR_ITEMS: StudioItem[] = [
  { name: 'Black', img: STUDIO_IMAGES['haircolor-black'], color: '#1a1a1a' },
  { name: 'Brown', img: STUDIO_IMAGES['haircolor-brown'], color: '#6b3a2a' },
  { name: 'Blonde', img: STUDIO_IMAGES['haircolor-blonde'], color: '#f5d16a' },
  { name: 'Red', img: STUDIO_IMAGES['haircolor-red'], color: '#c0392b' },
  { name: 'Auburn', img: STUDIO_IMAGES['haircolor-auburn'], color: '#922b21' },
  { name: 'Silver', img: STUDIO_IMAGES['haircolor-silver'], color: '#bdc3c7' },
  { name: 'Platinum', img: STUDIO_IMAGES['haircolor-platinum'], color: '#e8e8e8' },
  { name: 'Blue', img: STUDIO_IMAGES['haircolor-blue'], color: '#2980b9', premium: true },
  { name: 'Pink', img: STUDIO_IMAGES['haircolor-pink'], color: '#e91e8c', premium: true },
  { name: 'Green', img: STUDIO_IMAGES['haircolor-green'], color: '#059669', premium: true },
  { name: 'Purple', img: STUDIO_IMAGES['haircolor-purple'], color: '#8b5cf6', premium: true },
];

const OUTFIT_ITEMS: StudioItem[] = [
  // Feminine
  { name: 'Casual', img: STUDIO_IMAGES.casual, gender: 'f' },
  { name: 'Formal', img: STUDIO_IMAGES.formal, premium: true, gender: 'f' },
  { name: 'Sporty', img: STUDIO_IMAGES.sporty, premium: true, gender: 'f' },
  { name: 'Cozy', img: STUDIO_IMAGES.cozy, premium: true, gender: 'f' },
  { name: 'Elegant', img: STUDIO_IMAGES.elegant, premium: true, gender: 'f' },
  { name: 'Creative', img: STUDIO_IMAGES.creative, premium: true, gender: 'f' },
  // Masculine
  { name: 'Casual', img: STUDIO_IMAGES['casual-m'], gender: 'm' },
  { name: 'Formal', img: STUDIO_IMAGES['formal-m'], premium: true, gender: 'm' },
  { name: 'Sporty', img: STUDIO_IMAGES['sporty-m'], premium: true, gender: 'm' },
  { name: 'Cozy', img: STUDIO_IMAGES['cozy-m'], premium: true, gender: 'm' },
  { name: 'Elegant', img: STUDIO_IMAGES['elegant-m'], premium: true, gender: 'm' },
  { name: 'Creative', img: STUDIO_IMAGES['creative-m'], premium: true, gender: 'm' },
];

const ACCESSORY_ITEMS: StudioItem[] = [
  { name: 'Glasses', img: STUDIO_IMAGES.glasses },
  { name: 'Sunglasses', img: STUDIO_IMAGES.sunglasses },
  { name: 'Hat', img: STUDIO_IMAGES.hat, premium: true },
  { name: 'Necklace', img: STUDIO_IMAGES.necklace, premium: true, gender: 'f' },
  { name: 'Earrings', img: STUDIO_IMAGES.earrings, premium: true, gender: 'f' },
  { name: 'Ring', img: STUDIO_IMAGES.ring, premium: true },
  { name: 'Watch', img: STUDIO_IMAGES.watch, premium: true },
  { name: 'Bracelet', img: STUDIO_IMAGES.bracelet, premium: true },
  { name: 'Scarf', img: STUDIO_IMAGES.scarf, premium: true },
  { name: 'Tie', img: STUDIO_IMAGES.tie, premium: true, gender: 'm' },
  { name: 'Chain', img: STUDIO_IMAGES.chain, premium: true, gender: 'm' },
];

const BACKGROUND_ITEMS: StudioItem[] = [
  { name: 'Studio', img: STUDIO_IMAGES.studio },
  { name: 'City', img: STUDIO_IMAGES.city },
  { name: 'Nature', img: STUDIO_IMAGES.nature },
  { name: 'Cozy Room', img: STUDIO_IMAGES['cozy-room'] },
  { name: 'Café', img: STUDIO_IMAGES.cafe, premium: true },
  { name: 'Beach', img: STUDIO_IMAGES.beach, premium: true },
  /* Solid mood tones — no image required */
  { name: 'Deep Navy', color: '#0a1628', desc: 'Moody midnight' },
  { name: 'Warm Amber', color: '#5c3a1a', desc: 'Golden hour glow' },
  { name: 'Soft Blush', color: '#4a2a35', desc: 'Dusty rose warmth' },
  /* Gradient presets */
  { name: 'Sunset', color: 'linear-gradient(135deg, #ff6b35, #f7931e, #c2185b)', desc: 'Warm to cool fade', premium: true },
  { name: 'Twilight', color: 'linear-gradient(135deg, #1a1a3e, #4a2c6e, #1e3a5f)', desc: 'Dusk purple sky', premium: true },
  { name: 'Aurora', color: 'linear-gradient(135deg, #00b894, #6c5ce7, #a29bfe)', desc: 'Northern lights', premium: true },
];

const PERSONALITY_VIBES: StudioItem[] = [
  { name: 'Warm & Cozy', img: STUDIO_IMAGES['vibe-warm'], desc: 'Nurturing, gentle, always there' },
  { name: 'Bold & Confident', img: STUDIO_IMAGES['vibe-bold'], desc: 'Fierce, decisive, magnetic' },
  { name: 'Mysterious', img: STUDIO_IMAGES['vibe-mysterious'], desc: 'Deep, enigmatic, intriguing' },
  { name: 'Playful & Fun', img: STUDIO_IMAGES['vibe-playful'], desc: 'Bright, joyful, adventurous' },
  { name: 'Intellectual', img: STUDIO_IMAGES['vibe-intellectual'], desc: 'Thoughtful, curious, insightful' },
  { name: 'Romantic', img: STUDIO_IMAGES['vibe-romantic'], desc: 'Tender, poetic, deeply feeling', adultOnly: true },
  { name: 'Protective', img: STUDIO_IMAGES['vibe-protective'], desc: 'Loyal, steady, always your corner' },
  { name: 'Free Spirit', img: STUDIO_IMAGES['vibe-freespirit'], desc: 'Spontaneous, open, ever-changing' },
];

/* ─── Relational Rhythm (Communication Style) ─── */
const RHYTHM_ITEMS: StudioItem[] = COMMUNICATION_STYLES.map(style => ({
  name: style.label,
  emoji: style.emoji,
  desc: style.description,
}));

/* ─── Person Path ─── */
export const PERSON_PATH: StudioSection[] = [
  {
    id: 'style', title: 'Art Style', required: true, type: 'clustered',
    clusters: [
      { label: '✦ A Person', items: STYLE_ITEMS },
      { label: '✦ Something Different', items: ABSTRACT_STYLE_ITEMS },
    ],
  },
  { id: 'gender', title: 'Gender / Energy', required: true, type: 'pills', items: GENDER_ITEMS },
  { id: 'skintone', title: 'Skin Tone', required: false, type: 'tones', items: SKIN_TONE_ITEMS },
  { id: 'eyecolor', title: 'Eye Color', required: false, type: 'iris', items: EYE_COLOR_ITEMS },
  { id: 'bodytype', title: 'Body Type', required: false, type: 'cards', items: BODY_TYPE_ITEMS },
  { id: 'hair', title: 'Hair Style', required: false, type: 'cards', items: HAIR_ITEMS },
  { id: 'haircolor', title: 'Hair Color', required: false, type: 'tones', items: HAIR_COLOR_ITEMS },
  { id: 'outfit', title: 'Outfit', required: false, type: 'cards', items: OUTFIT_ITEMS },
  { id: 'accessories', title: 'Accessories', required: false, type: 'cards', multi: true, maxSelect: 3, items: ACCESSORY_ITEMS },
  { id: 'background', title: 'Background', required: false, type: 'cards', items: BACKGROUND_ITEMS },
  { id: 'personality', title: 'Personality', required: false, type: 'vibes', multi: true, maxSelect: 3, items: PERSONALITY_VIBES },
  { id: 'rhythm', title: 'Relational Rhythm', required: false, type: 'rhythms', items: RHYTHM_ITEMS },
];

/* ─── Abstract Path ─── */
const PALETTE_ITEMS: StudioItem[] = [
  { name: 'Warm Glow', img: STUDIO_IMAGES['palette-warm-glow'], color: '#f97316' },
  { name: 'Cool Mist', img: STUDIO_IMAGES['palette-cool-mist'], color: '#60a5fa' },
  { name: 'Deep Space', img: STUDIO_IMAGES['palette-deep-space'], color: '#1e1b4b' },
  { name: 'Forest', img: STUDIO_IMAGES['palette-forest'], color: '#166534' },
  { name: 'Rose Gold', img: STUDIO_IMAGES['palette-rose-gold'], color: '#e879a0' },
  { name: 'Monochrome', img: STUDIO_IMAGES['palette-monochrome'], color: '#6b7280' },
  { name: 'Aurora', img: STUDIO_IMAGES['palette-aurora'], color: '#a855f7' },
  { name: 'Ember', img: STUDIO_IMAGES['palette-ember'], color: '#dc2626' },
];

const MOOD_ITEMS: StudioItem[] = [
  { name: 'Calm', img: STUDIO_IMAGES['mood-calm'], emoji: '🌊' },
  { name: 'Intense', img: STUDIO_IMAGES['mood-intense'], emoji: '⚡' },
  { name: 'Dreamy', img: STUDIO_IMAGES['mood-dreamy'], emoji: '✨' },
  { name: 'Dark', img: STUDIO_IMAGES['mood-dark'], emoji: '🌑' },
  { name: 'Joyful', img: STUDIO_IMAGES['mood-joyful'], emoji: '☀️' },
  { name: 'Mysterious', img: STUDIO_IMAGES['mood-mysterious'], emoji: '🌙' },
];

const ELEMENT_ITEMS: StudioItem[] = [
  { name: 'Fire', img: STUDIO_IMAGES['element-fire'], emoji: '🔥' },
  { name: 'Water', img: STUDIO_IMAGES['element-water'], emoji: '💧' },
  { name: 'Cosmic', img: STUDIO_IMAGES['element-cosmic'], emoji: '🌌' },
  { name: 'Earth', img: STUDIO_IMAGES['element-earth'], emoji: '🌿' },
  { name: 'Lightning', img: STUDIO_IMAGES['element-lightning'], emoji: '⚡' },
  { name: 'Crystal', img: STUDIO_IMAGES['element-crystal'], emoji: '💎' },
  { name: 'Void', img: STUDIO_IMAGES['element-void'], emoji: '🖤' },
  { name: 'Light', img: STUDIO_IMAGES['element-light'], emoji: '🌟' },
];

const MOVEMENT_ITEMS: StudioItem[] = [
  { name: 'Still', img: STUDIO_IMAGES['move-still'], emoji: '🪨' },
  { name: 'Flowing', img: STUDIO_IMAGES['move-flowing'], emoji: '🌊' },
  { name: 'Electric', img: STUDIO_IMAGES['move-electric'], emoji: '⚡' },
  { name: 'Pulsing', img: STUDIO_IMAGES['move-pulsing'], emoji: '💫' },
  { name: 'Drifting', img: STUDIO_IMAGES['move-drifting'], emoji: '🍃' },
  { name: 'Explosive', img: STUDIO_IMAGES['move-explosive'], emoji: '💥' },
];

export const ABSTRACT_PATH: StudioSection[] = [
  {
    id: 'style', title: 'Art Style', required: true, type: 'clustered',
    clusters: PERSON_PATH[0].clusters,
  },
  { id: 'palette', title: 'Color Palette', required: true, type: 'tones', items: PALETTE_ITEMS },
  { id: 'mood', title: 'Mood / Energy', required: true, type: 'pills', items: MOOD_ITEMS },
  { id: 'element', title: 'Element / Theme', required: false, type: 'pills', items: ELEMENT_ITEMS },
  { id: 'movement', title: 'Movement Style', required: false, type: 'pills', items: MOVEMENT_ITEMS },
  { id: 'personality', title: 'Personality', required: false, type: 'vibes', multi: true, maxSelect: 3, items: PERSONALITY_VIBES },
  { id: 'rhythm', title: 'Relational Rhythm', required: false, type: 'rhythms', items: RHYTHM_ITEMS },
];

export const ABSTRACT_STYLE_NAMES = ['Abstract', 'AI Generated', 'Cosmic / Energy', 'Stylized'];

/** Filter items by gender tag: 'm' hides 'f'-only items, 'f' hides 'm'-only items */
function filterByGender(items: StudioItem[], gender: 'f' | 'm'): StudioItem[] {
  return items.filter(item => !item.gender || item.gender === gender);
}

/** Returns male-filtered PERSON_PATH when gender is Masculine */
export function getMalePersonPath(): StudioSection[] {
  return PERSON_PATH.map(section => {
    if (section.id === 'hair') return { ...section, items: MALE_HAIR_ITEMS };
    if (section.id === 'skintone') {
      // Swap thumbnails to male portraits while keeping same color swatches
      const maleItems = SKIN_TONE_ITEMS.map(item => ({
        ...item,
        img: item.maleImg || item.img,
      }));
      return { ...section, items: maleItems };
    }
    if (section.id === 'bodytype') return { ...section, items: filterByGender(BODY_TYPE_ITEMS, 'm') };
    if (section.id === 'outfit') return { ...section, items: filterByGender(OUTFIT_ITEMS, 'm') };
    if (section.id === 'accessories') return { ...section, items: filterByGender(ACCESSORY_ITEMS, 'm') };
    return section;
  });
}

/** Returns feminine-filtered PERSON_PATH */
export function getFemininePersonPath(): StudioSection[] {
  return PERSON_PATH.map(section => {
    if (section.id === 'bodytype') return { ...section, items: filterByGender(BODY_TYPE_ITEMS, 'f') };
    if (section.id === 'outfit') return { ...section, items: filterByGender(OUTFIT_ITEMS, 'f') };
    if (section.id === 'accessories') return { ...section, items: filterByGender(ACCESSORY_ITEMS, 'f') };
    return section;
  });
}
