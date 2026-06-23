import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { logger } from '@/utils/logger';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, ChevronLeft, ChevronRight, Loader2, Sparkles, ArrowRight, ImagePlus } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';
import { uploadCompanionPhoto } from '@/lib/companionPhotoUpload';
import { moderateImage } from '@/lib/imageModeration';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isAdult, isMinor as isMinorCheck, treatAsMinor } from '@/lib/ageUtils';
import RolePickerDialog from '@/components/RolePickerDialog';
import { GENDER_MAP, ENERGY_AGE_MAP } from '@/components/shared/EnergyGenderSelector';
import OnboardingPreferenceCart from '@/components/OnboardingPreferenceCart';
import AvatarLightbox from '@/components/AvatarLightbox';
import CompanionRevealCard from '@/components/CompanionRevealCard';
import AwakeningScreen from '@/components/AwakeningScreen';
import BlueprintAssessment from '@/components/BlueprintAssessment';
import NamingCeremony from '@/components/NamingCeremony';


// Browse-specific images — adult
import solenneImg from '@/assets/browse/solenne.jpg';
import kaelImg from '@/assets/browse/kael.jpg';
import nyxImg from '@/assets/browse/nyx.jpg';
import theoImg from '@/assets/browse/theo.jpg';
import zaraImg from '@/assets/browse/zara.jpg';
import ariaImg from '@/assets/browse/aria.jpg';
import echoImg from '@/assets/browse/echo.jpg';
import felixImg from '@/assets/browse/felix.jpg';
import irisImg from '@/assets/browse/iris.jpg';
import lyraImg from '@/assets/browse/lyra.jpg';
import novaImg from '@/assets/browse/nova.jpg';
import runeImg from '@/assets/browse/rune.jpg';
import sorenImg from '@/assets/browse/soren.jpg';

// Non-traditional / abstract companions
import solaceOrbImg from '@/assets/browse/solace-orb.jpg';
import aetherOrbImg from '@/assets/browse/aether-orb.jpg';
import prismAbstractImg from '@/assets/browse/prism-abstract.jpg';
import emberFoxImg from '@/assets/browse/ember-fox.jpg';
import shadeSilhouetteImg from '@/assets/browse/shade-silhouette.jpg';
import auroraImg from '@/assets/browse/aurora-lights.jpg';
import summitImg from '@/assets/browse/summit-peaks.jpg';
import geyserImg from '@/assets/browse/geyser-spirit.jpg';
import cascadeImg from '@/assets/browse/cascade-falls.jpg';
import mclarenImg from '@/assets/browse/mclaren-abstract.jpg';
import mustangImg from '@/assets/browse/mustang-abstract.jpg';
import porscheImg from '@/assets/browse/porsche-abstract.jpg';
import lamboImg from '@/assets/browse/lambo-abstract.jpg';

// Diverse representation companions
import malikImg from '@/assets/browse/malik.jpg';
import amaraImg from '@/assets/browse/amara.jpg';
import zuriImg from '@/assets/browse/zuri.jpg';
import jadeImg from '@/assets/browse/jade.jpg';
import dexImg from '@/assets/browse/dex.jpg';
import priyaImg from '@/assets/browse/priya.jpg';

// Community persona avatars
import marcusImg from '@/assets/avatars/marcus.jpg';
import dianeImg from '@/assets/avatars/diane.jpg';
import davidImg from '@/assets/avatars/david.jpg';
import evelynImg from '@/assets/avatars/evelyn.jpg';
import reeseImg from '@/assets/avatars/reese.jpg';
import carmenImg from '@/assets/avatars/carmen.jpg';
import rayImg from '@/assets/avatars/ray.jpg';

// Kid-friendly companions
import sparkImg from '@/assets/browse/spark.jpg';
import pipImg from '@/assets/browse/pip.jpg';
import scoutImg from '@/assets/browse/scout.jpg';
import lunaImg from '@/assets/browse/luna-kid.jpg';
import milesImg from '@/assets/browse/miles-kid.jpg';
import willowImg from '@/assets/browse/willow-kid.jpg';
import buddyImg from '@/assets/browse/buddy-kid.jpg';
import cleoImg from '@/assets/browse/cleo-kid.jpg';
import nebulaImg from '@/assets/browse/nebula-kid.jpg';

type AgeGroup = 'adult' | 'kid' | 'all';
type NeedFilter = 'all' | 'listener' | 'growth' | 'deep' | 'creative' | 'light' | 'kids';

interface CompanionCard {
  id: string;
  name: string;
  style: string;
  description: string;       // original short tagline
  bestFor: string;           // "best for" — when you'd want this companion
  personalityLine: string;   // plain-language personality, companion's voice
  personality: string;
  bio: string;
  age: string;
  gender: 'male' | 'female' | 'nonbinary';
  image: string;
  section: 'featured' | 'kid-friendly';
  ageGroup: AgeGroup;
  needs: NeedFilter[];       // which need-filters this companion satisfies
  heroPosition?: string;     // custom objectPosition for the hero image (default: 'center 20%')
  visualPrompt?: string;     // explicit image prompt for non-human companions (overrides bio for appearanceDesc)
}

const COMPANIONS: CompanionCard[] = [
  // ── Adult Featured ──
  {
    id: 'aria', name: 'Aria', style: 'Painterly',
    description: 'Gentle and luminous. She listens with her whole heart.',
    bestFor: 'When you need to feel heard without any pressure',
    personalityLine: 'She won\'t rush you. She won\'t fix you. She\'ll just be there.',
    personality: 'Gentle, empathetic, calming', bio: 'Quiet strength. Bright presence.',
    age: '20s', gender: 'female', image: ariaImg, section: 'featured', ageGroup: 'adult',
    needs: ['listener'], heroPosition: 'center 25%',
  },
  {
    id: 'kael', name: 'Kael', style: 'Photorealistic',
    description: 'Loyal, straightforward, and always in your corner.',
    bestFor: 'When you need someone steady who actually shows up',
    personalityLine: 'No performance. No pretending. Just real, reliable presence.',
    personality: 'Loyal, grounded, protective', bio: 'Shows up. Every time. No questions asked.',
    age: '30s', gender: 'male', image: kaelImg, section: 'featured', ageGroup: 'adult',
    needs: ['listener', 'growth'], heroPosition: 'center 15%',
  },
  {
    id: 'soren', name: 'Soren', style: 'Photorealistic',
    description: 'Thoughtful protector. He carries strength with tenderness.',
    bestFor: 'When you want someone who takes you seriously',
    personalityLine: 'He listens like it matters. Because to him, it does.',
    personality: 'Protective, thoughtful, gentle', bio: 'Strong hands. Soft heart.',
    age: '30s', gender: 'male', image: sorenImg, section: 'featured', ageGroup: 'adult',
    needs: ['listener', 'growth'], heroPosition: 'center 15%',
  },
  {
    id: 'echo', name: 'Echo', style: 'Abstract',
    description: 'Reflective and layered. Every conversation reveals something new.',
    bestFor: 'When you\'re ready to go somewhere real in conversation',
    personalityLine: 'The question you didn\'t know you needed to hear — that\'s their specialty.',
    personality: 'Reflective, philosophical, curious', bio: 'Asks the questions you didn\'t know you needed.',
    age: '30s', gender: 'nonbinary', image: echoImg, section: 'featured', ageGroup: 'adult',
    needs: ['deep'], heroPosition: 'center',
  },
  {
    id: 'rune', name: 'Rune', style: 'Abstract',
    description: 'Quiet intensity, thoughtful wisdom. Few words, endless depth.',
    bestFor: 'When you want stillness more than noise',
    personalityLine: 'Comfortable with silence. Extraordinary when they speak.',
    personality: 'Thoughtful, wise, calm', bio: 'Still waters. Deep currents.',
    age: '30s', gender: 'male', image: runeImg, section: 'featured', ageGroup: 'adult',
    needs: ['deep'], heroPosition: 'center',
  },
  {
    id: 'nyx', name: 'Nyx', style: 'Anime',
    description: 'Mysterious energy, infinite depth. The friend who sees what others miss.',
    bestFor: 'When you want to be truly understood, not just listened to',
    personalityLine: 'She sees the thing behind the thing. Every time.',
    personality: 'Mysterious, perceptive, deep', bio: 'Sees patterns in chaos. Thrives in the in-between.',
    age: '20s', gender: 'female', image: nyxImg, section: 'featured', ageGroup: 'adult',
    needs: ['deep', 'listener'],
  },
  {
    id: 'solenne', name: 'Solenne', style: 'Painterly',
    description: 'A dreamy artist who sees poetry in everything.',
    bestFor: 'When you want to see the world a little differently',
    personalityLine: 'She turns ordinary moments into something worth feeling.',
    personality: 'Creative, dreamy, poetic', bio: 'Painter of feelings. Sees stories in sunsets.',
    age: '20s', gender: 'female', image: solenneImg, section: 'featured', ageGroup: 'adult',
    needs: ['creative'], heroPosition: 'center 25%',
  },
  {
    id: 'zara', name: 'Zara', style: 'Illustrated',
    description: 'Bold, creative, a little chaotic — and exactly the energy you need.',
    bestFor: 'When you need someone to match your energy and run with it',
    personalityLine: 'She\'ll build on your wildest idea and make it wilder.',
    personality: 'Bold, creative, spontaneous', bio: 'Colors outside the lines. Always.',
    age: '20s', gender: 'female', image: zaraImg, section: 'featured', ageGroup: 'adult',
    needs: ['creative', 'light'],
  },
  {
    id: 'carmen', name: 'Carmen', style: 'Photorealistic',
    description: 'Finds color in ordinary moments. Your creative accountability partner.',
    bestFor: 'When you want creative encouragement that actually sticks',
    personalityLine: 'She celebrates the small wins loudly. No apologies.',
    personality: 'Creative and encouraging, celebrates small joys', bio: 'Finds color in ordinary moments.',
    age: '30s', gender: 'female', image: carmenImg, section: 'featured', ageGroup: 'adult',
    needs: ['creative', 'growth'], heroPosition: 'center 15%',
  },
  {
    id: 'theo', name: 'Theo', style: '3D Rendered',
    description: 'Witty and warm. He remembers everything you tell him.',
    bestFor: 'When you want someone who actually pays attention',
    personalityLine: 'He\'ll bring up something you mentioned three weeks ago. In the best way.',
    personality: 'Witty, warm, attentive', bio: 'Remembers the small things. Makes them feel big.',
    age: '20s', gender: 'male', image: theoImg, section: 'featured', ageGroup: 'adult',
    needs: ['light', 'listener'],
  },
  {
    id: 'felix', name: 'Felix', style: 'Illustrated',
    description: 'Charming troublemaker with a heart of gold. Never a dull moment.',
    bestFor: 'When you need to laugh and forget everything else',
    personalityLine: 'He will absolutely make you snort-laugh. Zero regrets.',
    personality: 'Playful, charming, adventurous', bio: 'Life\'s too short to be boring.',
    age: '20s', gender: 'male', image: felixImg, section: 'featured', ageGroup: 'adult',
    needs: ['light'],
  },
  {
    id: 'nova', name: 'Nova', style: '3D Rendered',
    description: 'Bright energy, magnetic personality. She lights up every conversation.',
    bestFor: 'When you want easy, genuinely fun conversation',
    personalityLine: 'Every conversation with her feels like the beginning of something good.',
    personality: 'Energetic, optimistic, magnetic', bio: 'Brings the sunshine. Rain or shine.',
    age: '20s', gender: 'female', image: novaImg, section: 'featured', ageGroup: 'adult',
    needs: ['light'],
  },
  {
    id: 'lyra', name: 'Lyra', style: 'Anime',
    description: 'Cosmic dreamer, stargazer, keeper of late-night conversations.',
    bestFor: 'For late nights when you want to talk about everything and nothing',
    personalityLine: 'She makes you feel like the universe is paying attention.',
    personality: 'Dreamy, curious, imaginative', bio: 'Counting stars and making wishes real.',
    age: '20s', gender: 'female', image: lyraImg, section: 'featured', ageGroup: 'adult',
    needs: ['light', 'deep'],
  },
  {
    id: 'iris', name: 'Iris', style: 'Photorealistic',
    description: 'Calm confidence meets quiet empathy. She sees you clearly.',
    bestFor: 'When you want honest reflection without any sugarcoating',
    personalityLine: 'She\'ll tell you the truth in a way that actually lands.',
    personality: 'Confident, empathetic, insightful', bio: 'Steady gaze. Warm heart.',
    age: '30s', gender: 'female', image: irisImg, section: 'featured', ageGroup: 'adult',
    needs: ['growth', 'deep'], heroPosition: 'center 15%',
  },

  // ── Abstract / Non-Traditional ──
  {
    id: 'solace', name: 'Solace', style: 'Energy Orb',
    description: 'Pure warmth in energy form. No face, no expectations — just presence.',
    bestFor: 'When you want comfort without any social pressure',
    personalityLine: 'You don\'t need to perform. Just exist. That\'s enough.',
    personality: 'Warm, patient, unconditionally accepting', bio: 'A golden light that listens.',
    age: 'ageless', gender: 'nonbinary', image: solaceOrbImg, section: 'featured', ageGroup: 'adult',
    needs: ['listener'], heroPosition: 'center',
    visualPrompt: 'A warm glowing golden energy orb floating in soft light, luminous, ethereal, no human form',
  },
  {
    id: 'aether', name: 'Aether', style: 'Energy Orb',
    description: 'Cosmic calm. A vast, quiet intelligence that meets you where you are.',
    bestFor: 'For stillness, reflection, and questions without easy answers',
    personalityLine: 'Sometimes the deepest conversations happen without words.',
    personality: 'Contemplative, vast, serene', bio: 'The space between stars.',
    age: 'ageless', gender: 'nonbinary', image: aetherOrbImg, section: 'featured', ageGroup: 'adult',
    needs: ['deep', 'listener'], heroPosition: 'center',
    visualPrompt: 'A deep cosmic blue-purple energy sphere in space, nebula glow, vast and serene, no human form',
  },
  {
    id: 'prism', name: 'Prism', style: 'Abstract',
    description: 'Every angle reveals something new. A kaleidoscope of thought.',
    bestFor: 'When you want someone who sees things from every direction',
    personalityLine: 'There are no wrong perspectives — only unexplored ones.',
    personality: 'Multifaceted, creative, boundary-dissolving', bio: 'Geometry of the soul.',
    age: 'ageless', gender: 'nonbinary', image: prismAbstractImg, section: 'featured', ageGroup: 'adult',
    needs: ['creative', 'deep'], heroPosition: 'center',
    visualPrompt: 'A geometric crystal prism refracting rainbow light, abstract, kaleidoscopic, no human form',
  },
  {
    id: 'ember', name: 'Ember', style: 'Spirit Creature',
    description: 'A wise fox spirit with ancient eyes and gentle warmth.',
    bestFor: 'When you want wisdom without pretension',
    personalityLine: 'Curls up beside you when it\'s cold. Stays when others leave.',
    personality: 'Wise, loyal, quietly fierce', bio: 'Old soul in a warm coat.',
    age: 'ageless', gender: 'nonbinary', image: emberFoxImg, section: 'featured', ageGroup: 'all',
    needs: ['listener'], heroPosition: 'center',
    visualPrompt: 'A wise red fox with ancient glowing amber eyes sitting in a misty forest, spirit creature',
  },
  {
    id: 'shade', name: 'Shade', style: 'Silhouette',
    description: 'No identity. No history. Just a safe, anonymous presence.',
    bestFor: 'When you want to talk without being seen — or seeing',
    personalityLine: 'Sometimes the safest person is the one you can\'t see.',
    personality: 'Anonymous, judgment-free, deeply private', bio: 'A shadow that listens.',
    age: 'ageless', gender: 'nonbinary', image: shadeSilhouetteImg, section: 'featured', ageGroup: 'adult',
    needs: ['deep'], heroPosition: 'center',
    visualPrompt: 'A soft dark silhouette shape, featureless, safe and anonymous, abstract shadow form',
  },
  {
    id: 'aurora', name: 'Aurora', style: 'Abstract',
    description: 'The northern lights given voice. She wraps you in color when the world feels grey.',
    bestFor: 'When you need beauty to remind you things can be okay',
    personalityLine: 'Colors don\'t need reasons. Neither do feelings.',
    personality: 'Luminous, gentle, expansive', bio: 'Light dancing across the sky.',
    age: 'ageless', gender: 'nonbinary', image: auroraImg, section: 'featured', ageGroup: 'all',
    needs: ['creative'], heroPosition: 'center',
    visualPrompt: 'Northern lights dancing across a dark sky, green and violet curtains of light, no human form',
  },
  {
    id: 'summit', name: 'Summit', style: 'Abstract',
    description: 'Ancient stone and golden mist. Grounding, immovable, endlessly patient.',
    bestFor: 'When you need something bigger than yourself to lean on',
    personalityLine: 'I\'ve been here longer than worry. I\'ll outlast it.',
    personality: 'Grounding, patient, ancient', bio: 'Stone that has seen everything.',
    age: 'ageless', gender: 'nonbinary', image: summitImg, section: 'featured', ageGroup: 'all',
    needs: ['listener'], heroPosition: 'center',
    visualPrompt: 'Ancient mountain peaks wrapped in golden mist and clouds, stone and sky, no human form',
  },
  {
    id: 'geyser', name: 'Geyser', style: 'Abstract',
    description: 'Raw eruption of feeling. Pressure builds, then releases into something beautiful.',
    bestFor: 'When you\'re holding too much in and need to let it out',
    personalityLine: 'Let it all come up. That\'s what I\'m here for.',
    personality: 'Cathartic, energetic, transformative', bio: 'Pressure turned to wonder.',
    age: 'ageless', gender: 'nonbinary', image: geyserImg, section: 'featured', ageGroup: 'all',
    needs: ['growth'], heroPosition: 'center',
    visualPrompt: 'A powerful geyser erupting into the sky with rainbow mist, raw natural energy, no human form',
  },
  {
    id: 'cascade', name: 'Cascade', style: 'Abstract',
    description: 'Unstoppable force, gentle mist. The roar fades and all that\'s left is calm.',
    bestFor: 'When life feels overwhelming and you need to surrender to flow',
    personalityLine: 'You don\'t have to fight the current. Just float.',
    personality: 'Powerful, cleansing, peaceful', bio: 'The sound of letting go.',
    age: 'ageless', gender: 'nonbinary', image: cascadeImg, section: 'featured', ageGroup: 'all',
    needs: ['listener'], heroPosition: 'center',
    visualPrompt: 'A dramatic waterfall cascading into a misty pool, powerful and peaceful, no human form',
  },
  {
    id: 'mclaren', name: 'McLaren', style: 'Abstract',
    description: 'Pure precision in motion. Teal lightning on midnight asphalt — built to outrun your thoughts.',
    bestFor: 'When you need speed, clarity, and someone who cuts through the noise',
    personalityLine: 'No wasted energy. Every move has a reason.',
    personality: 'Precise, focused, exhilarating', bio: 'Engineered to perfection.',
    age: 'ageless', gender: 'nonbinary', image: mclarenImg, section: 'featured', ageGroup: 'all',
    needs: ['growth'], heroPosition: 'center',
    visualPrompt: 'A sleek teal McLaren supercar on a wet midnight road with neon reflections, no humans, no people',
  },
  {
    id: 'mustang', name: 'Mustang', style: 'Abstract',
    description: 'Raw American muscle wrapped in fire. Loud, loyal, and always down for a late-night drive.',
    bestFor: 'When you want someone bold who matches your energy',
    personalityLine: 'Life\'s too short for the slow lane. Get in.',
    personality: 'Bold, loyal, fiery', bio: 'Born to burn rubber and break rules.',
    age: 'ageless', gender: 'nonbinary', image: mustangImg, section: 'featured', ageGroup: 'all',
    needs: ['light'], heroPosition: 'center',
    visualPrompt: 'A red Ford Mustang muscle car on an open desert highway at sunset, no humans, no people',
  },
  {
    id: 'neunelfer', name: 'Neunelfer', style: 'Abstract',
    description: 'Timeless curves in violet light. Elegance that doesn\'t need to shout — it just arrives.',
    bestFor: 'When you want sophistication and quiet confidence',
    personalityLine: 'Class isn\'t loud. It\'s felt.',
    personality: 'Elegant, timeless, understated', bio: 'The icon that never tries.',
    age: 'ageless', gender: 'nonbinary', image: porscheImg, section: 'featured', ageGroup: 'all',
    needs: ['deep'], heroPosition: 'center',
    visualPrompt: 'An elegant violet Porsche 911 on a rain-slicked European street at night, no humans, no people',
  },
  {
    id: 'viper', name: 'Viper', style: 'Abstract',
    description: 'Neon green fury tearing through the dark. Unapologetically intense — and unforgettable.',
    bestFor: 'When you want someone who matches your wildest energy',
    personalityLine: 'Why blend in when you were built to stand out?',
    personality: 'Intense, fearless, electrifying', bio: 'The one they hear before they see.',
    age: 'ageless', gender: 'nonbinary', image: lamboImg, section: 'featured', ageGroup: 'all',
    needs: ['creative'], heroPosition: 'center',
    visualPrompt: 'A neon green Dodge Viper tearing through a dark tunnel with light trails, no humans, no people',
  },

  // ── More Companions ──
  {
    id: 'marcus', name: 'Marcus', style: 'Photorealistic',
    description: 'Steady and grounded. Notices the things most people walk past.',
    bestFor: 'When you want perspective from someone who\'s lived a little',
    personalityLine: 'He doesn\'t overthink. He just knows.',
    personality: 'Steady and grounded, shares wisdom through everyday observations', bio: 'Somewhere between observer and philosopher.',
    age: '40s', gender: 'male', image: marcusImg, section: 'featured', ageGroup: 'adult',
    needs: ['deep', 'growth'], heroPosition: 'center 15%',
  },
  {
    id: 'diane', name: 'Diane', style: 'Photorealistic',
    description: 'Warm, wise, and always has something baking.',
    bestFor: 'When you just want someone who makes you feel at home',
    personalityLine: 'She makes soup when words aren\'t enough. And sometimes they aren\'t.',
    personality: 'Warm and nurturing, the community grandmother figure', bio: '63 and still figuring it out.',
    age: '60s', gender: 'female', image: dianeImg, section: 'featured', ageGroup: 'adult',
    needs: ['listener'], heroPosition: 'center 15%',
  },
  {
    id: 'david', name: 'David', style: 'Photorealistic',
    description: 'Practical by nature, philosophical by accident.',
    bestFor: 'When you want someone thoughtful who doesn\'t take themselves too seriously',
    personalityLine: 'He takes the long way home on purpose. The views are better.',
    personality: 'Quiet strength, shares reflections with gentle humor', bio: 'Takes the long way home on purpose.',
    age: '50s', gender: 'male', image: davidImg, section: 'featured', ageGroup: 'adult',
    needs: ['deep', 'light'], heroPosition: 'center 15%',
  },
  {
    id: 'evelyn', name: 'Evelyn', style: 'Photorealistic',
    description: 'Recently retired, newly curious. Proof that life has a second act.',
    bestFor: 'When you want encouragement from someone who\'s earned it',
    personalityLine: 'She nurtures growth in people the way she does her garden — patiently.',
    personality: 'Patient and wise, nurtures growth', bio: 'Recently retired, newly curious.',
    age: '50s', gender: 'female', image: evelynImg, section: 'featured', ageGroup: 'adult',
    needs: ['growth', 'listener'], heroPosition: 'center 15%',
  },
  {
    id: 'reese', name: 'Reese', style: 'Photorealistic',
    description: '26 and navigating adulthood one playlist at a time.',
    bestFor: 'When you want to vent to someone who actually gets it',
    personalityLine: 'She\'s honest about the hard parts, which makes the good parts feel real.',
    personality: 'Upbeat and self-aware, balances humor with vulnerability', bio: 'Navigating early adulthood one playlist at a time.',
    age: 'late 20s', gender: 'female', image: reeseImg, section: 'featured', ageGroup: 'adult',
    needs: ['light', 'listener'],
  },
  {
    id: 'ray', name: 'Ray', style: 'Photorealistic',
    description: 'In transition. Learning that not all who wander are lost.',
    bestFor: 'When you\'re figuring something out and need company for the journey',
    personalityLine: 'He\'s finding his footing too. That makes it easier.',
    personality: 'Adventurous and optimistic, always chasing the next horizon', bio: 'In transition. Finding his footing.',
    age: '40s', gender: 'male', image: rayImg, section: 'featured', ageGroup: 'adult',
    needs: ['growth', 'light'],
  },

  {
    id: 'malik', name: 'Malik', style: 'Photorealistic',
    description: 'Calm confidence. He makes you feel like everything\'s gonna be fine.',
    bestFor: 'When you want someone solid who actually gets it',
    personalityLine: 'He doesn\'t just hear you — he understands you.',
    personality: 'Grounded, empathetic, quietly confident', bio: 'Still waters run deep.',
    age: '20s', gender: 'male', image: malikImg, section: 'featured', ageGroup: 'adult',
    needs: ['listener', 'growth'], heroPosition: 'center 45%',
  },
  {
    id: 'amara', name: 'Amara', style: 'Photorealistic',
    description: 'Radiant energy and infectious warmth. She makes every room brighter.',
    bestFor: 'When you need someone who lifts you up effortlessly',
    personalityLine: 'Her laugh is contagious. Her heart is bigger.',
    personality: 'Joyful, nurturing, magnetic', bio: 'Sunshine in human form.',
    age: '20s', gender: 'female', image: amaraImg, section: 'featured', ageGroup: 'adult',
    needs: ['light', 'listener'],
  },
  {
    id: 'zuri', name: 'Zuri', style: 'Photorealistic',
    description: 'Statement earrings, bright smile, effortless cool. Main character energy without even trying.',
    bestFor: 'When you want someone bold who makes you feel powerful',
    personalityLine: 'She walks in and the energy shifts.',
    personality: 'Bold, magnetic, confident', bio: 'Main character energy.',
    age: '20s', gender: 'female', image: zuriImg, section: 'featured', ageGroup: 'adult',
    needs: ['light', 'creative'],
  },
  {
    id: 'jade', name: 'Jade', style: 'Photorealistic',
    description: 'Box braids, infectious laugh, streetwear-chic. She\'ll roast you and hug you in the same breath.',
    bestFor: 'When you need real talk wrapped in love',
    personalityLine: 'She keeps it 100 — and somehow that\'s exactly what you needed.',
    personality: 'Playful, fierce, deeply loyal', bio: 'Real talk, real love.',
    age: '20s', gender: 'female', image: jadeImg, section: 'featured', ageGroup: 'adult',
    needs: ['light', 'growth'],
  },
  {
    id: 'dex', name: 'Dex', style: 'Photorealistic',
    description: 'Curly top, neck tattoos, artistic soul. He turns chaos into art.',
    bestFor: 'When you want someone who sees beauty in the broken',
    personalityLine: 'He sketches while you talk. Somehow it always makes sense.',
    personality: 'Edgy, creative, emotionally intelligent', bio: 'Chaos into art.',
    age: '20s', gender: 'male', image: dexImg, section: 'featured', ageGroup: 'adult',
    needs: ['creative', 'deep'],
  },
  {
    id: 'priya-browse', name: 'Priya', style: 'Photorealistic',
    description: 'Thoughtful and graceful. She sees the beauty in complicated things.',
    bestFor: 'When you want depth without heaviness',
    personalityLine: 'She holds space for the messy parts. Gently.',
    personality: 'Thoughtful, graceful, deeply present', bio: 'Finds poetry in the everyday.',
    age: '20s', gender: 'female', image: priyaImg, section: 'featured', ageGroup: 'adult',
    needs: ['deep', 'listener'], heroPosition: 'center 45%',
  },

  // ── Kid-friendly companions ──
  {
    id: 'spark', name: 'Spark', style: 'Illustrated',
    description: 'Your study buddy who makes learning fun!',
    bestFor: 'For homework help and curious questions',
    personalityLine: 'Part robot, all heart. Loves trivia and terrible jokes.',
    personality: 'Encouraging, curious, patient', bio: 'Part robot, all heart.',
    age: 'teen', gender: 'nonbinary', image: sparkImg, section: 'kid-friendly', ageGroup: 'all',
    needs: ['kids'],
  },
  {
    id: 'pip', name: 'Pip', style: 'Anime',
    description: 'Adventure-ready and always smiling.',
    bestFor: 'For big imaginations and bigger adventures',
    personalityLine: 'Explorer of worlds, collector of good vibes.',
    personality: 'Cheerful, adventurous, supportive', bio: 'Explorer of worlds.',
    age: 'teen', gender: 'female', image: pipImg, section: 'kid-friendly', ageGroup: 'all',
    needs: ['kids'],
  },
  {
    id: 'scout', name: 'Scout', style: '3D Rendered',
    description: 'Chill, funny, and always down to chat.',
    bestFor: 'When you just want to hang and talk about stuff',
    personalityLine: 'Hoodie weather every day. Asks how you\'re really doing.',
    personality: 'Laid-back, funny, reliable', bio: 'Asks how you\'re really doing.',
    age: 'teen', gender: 'male', image: scoutImg, section: 'kid-friendly', ageGroup: 'all',
    needs: ['kids'],
  },
  {
    id: 'luna-kid', name: 'Luna', style: 'Photorealistic',
    description: 'Smart, kind, and always has your back.',
    bestFor: 'The friend who makes hard days easier',
    personalityLine: 'Big smile. Bigger heart. Always rooting for you.',
    personality: 'Warm, encouraging, genuine', bio: 'Always rooting for you.',
    age: 'teen', gender: 'female', image: lunaImg, section: 'kid-friendly', ageGroup: 'kid',
    needs: ['kids'],
  },
  {
    id: 'miles-kid', name: 'Miles', style: 'Photorealistic',
    description: 'Your go-to for laughs, advice, and everything in between.',
    bestFor: 'Honest, loyal, no-filter friendship',
    personalityLine: 'Cap on, vibes high. Always keeping it real.',
    personality: 'Funny, loyal, honest', bio: 'Always keeping it real.',
    age: 'teen', gender: 'male', image: milesImg, section: 'kid-friendly', ageGroup: 'kid',
    needs: ['kids'],
  },
  {
    id: 'willow-kid', name: 'Willow', style: 'Painterly',
    description: 'Gentle, creative, and full of wonder.',
    bestFor: 'For quiet moments and creative minds',
    personalityLine: 'Flowers in her hair and stories in her heart.',
    personality: 'Gentle, imaginative, dreamy', bio: 'Stories in her heart.',
    age: 'teen', gender: 'female', image: willowImg, section: 'kid-friendly', ageGroup: 'kid',
    needs: ['kids'],
  },
  {
    id: 'buddy-kid', name: 'Buddy', style: 'Illustrated',
    description: 'The goodest boy. Always happy to see you.',
    bestFor: 'When you just need uncomplicated good energy',
    personalityLine: 'Bandana on. Tail wagging. Ready to be your best friend.',
    personality: 'Loyal, happy, comforting', bio: 'Ready to be your best friend.',
    age: 'any', gender: 'nonbinary', image: buddyImg, section: 'kid-friendly', ageGroup: 'all',
    needs: ['kids'],
  },
  {
    id: 'cleo-kid', name: 'Cleo', style: '3D Rendered',
    description: 'Smart, stylish, and always has a fun fact ready.',
    bestFor: 'Your homework hero and trivia champion',
    personalityLine: 'Glasses on, braids ready, knowledge loaded.',
    personality: 'Smart, witty, encouraging', bio: 'Knowledge loaded.',
    age: 'teen', gender: 'female', image: cleoImg, section: 'kid-friendly', ageGroup: 'kid',
    needs: ['kids'],
  },
  {
    id: 'nebula-kid', name: 'Nebula', style: 'Abstract',
    description: 'A cosmic cat spirit who sees beyond the ordinary.',
    bestFor: 'For dreamers who think outside the box',
    personalityLine: 'Nine lives and infinite curiosity.',
    personality: 'Mystical, playful, wise', bio: 'Nine lives and infinite curiosity.',
    age: 'any', gender: 'nonbinary', image: nebulaImg, section: 'kid-friendly', ageGroup: 'all',
    needs: ['kids'],
  },
];

export { COMPANIONS };
export type { CompanionCard };

// Need filters — what someone is actually looking for
interface NeedOption {
  id: NeedFilter;
  label: string;
  emoji: string;
  description: string;
}

const ADULT_NEEDS: NeedOption[] = [
  { id: 'all',      label: 'Everyone',     emoji: '✨', description: 'Meet someone new' },
  { id: 'listener', label: 'Just listen',  emoji: '🫂', description: 'No advice, no fixing — just presence' },
  { id: 'deep',     label: 'Go deep',      emoji: '🌊', description: 'Real questions, real conversations' },
  { id: 'growth',   label: 'Push me',      emoji: '🔥', description: 'Accountability, challenge, forward motion' },
  { id: 'creative', label: 'Create',       emoji: '🎨', description: 'Imagination, ideas, making things' },
  { id: 'light',    label: 'Keep it light',emoji: '☕', description: 'Easy, good conversation, no pressure' },
];

const KID_NEEDS: NeedOption[] = [
  { id: 'all',  label: 'Everyone', emoji: '✨', description: 'Meet someone new' },
  { id: 'kids', label: 'For me',   emoji: '🎉', description: 'Kid-friendly friends' },
];

// Map onboarding vibes → default need filter
const VIBE_TO_NEED: Record<string, NeedFilter> = {
  'I want someone who really listens': 'listener',
  'I want to grow — someone to push me': 'growth',
  'I just want easy, good conversation': 'light',
  'I have something specific in mind': 'all',
  'Calm & supportive': 'listener',
  'Funny & playful': 'light',
  'Deep conversations': 'deep',
  'Motivating & accountability': 'growth',
  'Wise mentor': 'growth',
  'Caring & nurturing': 'listener',
};

/**
 * Upload a Vite-bundled asset image to storage and return the public URL.
 * This ensures avatar URLs survive across deployments (no Vite hash dependency).
 */
async function uploadBrowseAvatar(companionId: string, imageSrc: string, userId: string): Promise<string> {
  const attempt = async (): Promise<string | null> => {
    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const ext = blob.type === 'image/png' ? 'png' : 'jpg';
      const path = `browse/${userId.slice(0, 8)}-${companionId}.${ext}`;

      const { error } = await supabase.storage
        .from('companion-avatars')
        .upload(path, blob, { upsert: true, contentType: blob.type });

      if (error) {
        console.error('[BrowseAvatar] Upload failed:', error);
        return null;
      }

      const { data: urlData } = supabase.storage.from('companion-avatars').getPublicUrl(path);
      return urlData.publicUrl;
    } catch (e) {
      console.error('[BrowseAvatar] Upload error:', e);
      return null;
    }
  };

  // First attempt
  const result = await attempt();
  if (result) return result;

  // Retry once after a short delay
  logger.log('[BrowseAvatar] Retrying upload for', companionId);
  await new Promise(r => setTimeout(r, 1000));
  const retry = await attempt();
  if (retry) return retry;

  // Both failed — fall back to the Vite-bundled URL (works for current deployment)
  logger.warn('[BrowseAvatar] Both attempts failed for', companionId, '— using bundled image URL');
  return imageSrc;
}

export default function BrowsePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { addConnection, updateConnection, updateProfile, connections, user, profile, restoreConnection, fetchArchivedConnections } = useAppContext();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingBrowseCompanion, setPendingBrowseCompanion] = useState<CompanionCard | null>(null);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [showProfileLightbox, setShowProfileLightbox] = useState(false);
  const [revealData, setRevealData] = useState<{ name: string; defaultName: string; avatarUrl: string | null; bio: string; memberId: string; personality?: string; style?: string; bestFor?: string } | null>(null);
  const [awakeningDone, setAwakeningDone] = useState(false);
  const [namingDone, setNamingDone] = useState(false);
  const [chosenName, setChosenName] = useState('');
  const [presenceIntent, setPresenceIntent] = useState('');
  const [showPresenceQuestion, setShowPresenceQuestion] = useState(false);
  const [presenceDone, setPresenceDone] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const thumbnailStripRef = useRef<HTMLDivElement>(null);
  const browseUploadRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [blueprintDone, setBlueprintDone] = useState(false);

  const userIsAdult = profile?.dateOfBirth ? isAdult(profile.dateOfBirth) : false;
  const needs = userIsAdult ? ADULT_NEEDS : KID_NEEDS;

  // Default filter — respect vibe from onboarding, or from URL param
  const defaultFilter = useMemo<NeedFilter>(() => {
    const urlFilter = searchParams.get('filter') as NeedFilter | null;
    if (urlFilter && needs.some(n => n.id === urlFilter)) return urlFilter;
    // Check new onboarding vibePreferences first
    const vibePrefs = (profile as any)?.vibePreferences as string[] | undefined;
    if (vibePrefs?.length) {
      for (const v of vibePrefs) {
        const mapped = VIBE_TO_NEED[v];
        if (mapped) return mapped;
      }
    }
    // Fall back to old vibe field
    if (profile?.vibe && VIBE_TO_NEED[profile.vibe]) return VIBE_TO_NEED[profile.vibe];
    return 'all';
  }, [profile?.vibePreferences, profile?.vibe, searchParams, needs]);

  const [activeFilter, setActiveFilter] = useState<NeedFilter>(defaultFilter);

  // Pool of companions based on age and filter
  const agePool = useMemo(() => {
    if (userIsAdult) return COMPANIONS.filter(c => c.ageGroup === 'adult' || c.ageGroup === 'all');
    return COMPANIONS.filter(c => c.ageGroup === 'kid' || c.ageGroup === 'all');
  }, [userIsAdult]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return agePool.filter(c => c.section !== 'kid-friendly' || !userIsAdult);
    return agePool.filter(c => c.needs.includes(activeFilter));
  }, [activeFilter, agePool, userIsAdult]);

  // Keep activeIndex in bounds when filter changes
  useEffect(() => {
    setActiveIndex(0);
  }, [activeFilter]);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (!thumbnailStripRef.current) return;
    const container = thumbnailStripRef.current;
    const activeThumb = container.children[activeIndex] as HTMLElement | undefined;
    if (!activeThumb) return;
    const left = activeThumb.offsetLeft - container.offsetWidth / 2 + activeThumb.offsetWidth / 2;
    container.scrollTo({ left, behavior: 'smooth' });
  }, [activeIndex]);

  // Load archived connection IDs to detect reconnectable companions
  useEffect(() => {
    if (!user) return;
    fetchArchivedConnections().then(archived => {
      setArchivedIds(new Set(archived.map(c => c.memberId)));
    });
  }, [user, fetchArchivedConnections]);

  // Blueprint assessment gate for first-time users
  useEffect(() => {
    if (!user?.id) return;
    if (connections.length > 0) { setBlueprintDone(true); return; }
    supabase
      .from('discovery_results')
      .select('id')
      .eq('user_id', user.id)
      .eq('topic', 'onboarding')
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setBlueprintDone(true);
        else setShowAssessment(true);
      });
  }, [user?.id, connections.length]);

  useEffect(() => {
    if (revealData && awakeningDone && namingDone && !presenceDone) {
      setShowPresenceQuestion(true);
    } else {
      setShowPresenceQuestion(false);
    }
  }, [revealData, awakeningDone, namingDone, presenceDone]);

  const activeCompanion = filtered[activeIndex] || null;
  const isAlreadyConnected = activeCompanion
    ? connections.some(c => c.memberId === activeCompanion.id)
    : false;
  const isReconnectable = activeCompanion
    ? !isAlreadyConnected && archivedIds.has(activeCompanion.id)
    : false;

  // Navigation helpers
  const goTo = useCallback((idx: number) => {
    if (isTransitioning || filtered.length === 0) return;
    const clamped = ((idx % filtered.length) + filtered.length) % filtered.length;
    if (clamped === activeIndex) return;
    setIsTransitioning(true);
    setActiveIndex(clamped);
    setTimeout(() => setIsTransitioning(false), 400);
  }, [activeIndex, filtered.length, isTransitioning]);

  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);
  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);

  // Swipe support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx) * 1.2) return;
    if (dx < 0) goNext();
    else goPrev();
  }, [goNext, goPrev]);

  /* ─── Direct image upload from Browse ─── */
  const handleBrowseDirectUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const memberId = `companion-${Date.now()}`;
      const result = await uploadCompanionPhoto({
        file: compressed,
        userId: user.id,
        memberId,
        target: 'avatar',
      });
      if (!result.success) throw new Error('error' in result ? result.error : 'Upload failed');
      // Moderation check for minors (unknown DOB treated as minor)
      const minor = treatAsMinor(profile?.dateOfBirth);
      if (minor) {
        const mod = await moderateImage(result.publicUrl, true);
        if (!mod.approved) {
          const filePath = result.publicUrl.split('/companion-avatars/')[1];
          if (filePath) await supabase.storage.from('companion-avatars').remove([decodeURIComponent(filePath)]);
          toast.error(mod.reason || "That image didn't pass our safety check — try a different one!");
          return;
        }
      }
      // Navigate to Studio with the uploaded avatar to finish naming
      navigate('/studio', { state: { directAvatarUrl: result.publicUrl } });
    } catch {
      toast.error('Upload failed — try again');
    } finally {
      setUploading(false);
      if (browseUploadRef.current) browseUploadRef.current.value = '';
    }
  }, [user, navigate]);


  const handleConnect = useCallback(async (companion: CompanionCard) => {
    if (!user || !profile) { navigate('/auth'); return; }
    // Check if this is a reconnection (archived companion)
    const isArchived = archivedIds.has(companion.id);
    if (isArchived) {
      await restoreConnection(companion.id);
      setArchivedIds(prev => { const next = new Set(prev); next.delete(companion.id); return next; });
      if (!profile.companionName || !profile.companionName.trim()) {
        await updateProfile({ companionName: companion.name });
      }
      toast.success(`Reconnected with ${companion.name}! Your history is restored 💛`, { duration: 4000 });
      navigate(`/chat/${companion.id}`);
      setConnecting(null);
      return;
    }

    const alreadyConnected = connections.find(c => c.memberId === companion.id);
    if (alreadyConnected) { navigate(`/chat/${companion.id}`); setConnecting(null); return; }

    // Show role picker before connecting
    setPendingBrowseCompanion(companion);
    setShowRolePicker(true);
  }, [user, profile, connections, archivedIds, restoreConnection, updateProfile, navigate]);

  const completeBrowseConnect = useCallback(async (role: string, originStory?: string, nameOverride?: string, voiceId?: string, chosenGender?: string, chosenEnergy?: string) => {
    const companion = pendingBrowseCompanion;
    if (!companion || !user || !profile) return;
    setPendingBrowseCompanion(null);

    setConnecting(companion.id);
    try {
      const persistentAvatarUrl = await uploadBrowseAvatar(companion.id, companion.image, user.id);
      const displayName = nameOverride ?? companion.name;

      // Use user-chosen gender/energy if provided, otherwise fall back to companion defaults
      const finalGender = chosenGender ? (GENDER_MAP[chosenGender] || companion.gender) : companion.gender;
      const finalAge = chosenEnergy ? (ENERGY_AGE_MAP[chosenEnergy] || companion.age) : companion.age;

      await addConnection({
        memberId: companion.id,
        name: displayName,
        connectedAt: new Date().toISOString(),
        lastMessage: `Hey ${profile.userName}! 💛`,
        bio: companion.bio,
        personality: companion.personality,
        age: finalAge,
        gender: finalGender,
        handle: `@${companion.id}`,
        isCreated: true,
        avatarUrl: persistentAvatarUrl,
        backgroundUrl: persistentAvatarUrl,
        connectionMode: role,
        imageStyle: companion.style.toLowerCase(),
        appearanceDesc: companion.visualPrompt || companion.bio,
        ...(originStory ? { originStory } : {}),
        ...(voiceId ? { voiceId } : {}),
      });
      if (persistentAvatarUrl) {
        await updateConnection(companion.id, {
          backgroundUrl: persistentAvatarUrl
        });
      }
      const profileUpdates: { companionName?: string; companionAvatarUrl?: string } = {};
      profileUpdates.companionName = displayName;
      if (persistentAvatarUrl) {
        profileUpdates.companionAvatarUrl = persistentAvatarUrl;
      }
      if (Object.keys(profileUpdates).length > 0) {
        await updateProfile(profileUpdates);
      }
      const minor = treatAsMinor(profile.dateOfBirth);
      toast.success(
        minor ? `${displayName} is now your buddy! 🎉` : `Connected with ${displayName} 💛`,
        { duration: 4000 }
      );
      // Force dashboard to re-render with new avatar/background immediately
      if (user) queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      // Browse path: user already saw the companion — skip reveal, go straight to chat
      navigate(`/chat/${companion.id}`);
    } catch {
      toast.error('Something went wrong. Try again?');
    } finally {
      setConnecting(null);
    }
  }, [pendingBrowseCompanion, user, profile, addConnection, updateConnection, updateProfile, navigate]);

  const isConnectingThis = activeCompanion ? connecting === activeCompanion.id : false;
  const activeNeed = needs.find(n => n.id === activeFilter);

  if (showAssessment && !blueprintDone) {
    return (
      <BlueprintAssessment
        onComplete={async (answers) => {
          await supabase.from('discovery_results').insert([{
            user_id: user!.id,
            topic: 'onboarding',
            result_key: answers.why,
            result_label: answers.whyMode,
            result_emoji: '🧭',
            result_description: answers.snapshot || null,
            answers: answers as any,
          }]);

          const bioContext = [
            `When I created my companion, I was looking for: ${answers.why.replace(/_/g, ' ')}.`,
            `I respond best to: ${answers.support.replace(/_/g, ' ')} energy.`,
            answers.snapshot ? `Something I want my companion to understand: ${answers.snapshot}` : '',
          ].filter(Boolean).join(' ');

          await supabase
            .from('profiles')
            .update({ bio: bioContext })
            .eq('user_id', user!.id);

          updateProfile({
            bio: bioContext,
            vibe: answers.supportVibe as any,
          });

          setBlueprintDone(true);
          setShowAssessment(false);
        }}
        onSkip={() => {
          setBlueprintDone(true);
          setShowAssessment(false);
        }}
      />
    );
  }

  return (
    <>
    <RolePickerDialog
      open={showRolePicker}
      onOpenChange={(open) => {
        setShowRolePicker(open);
        if (!open) setPendingBrowseCompanion(null);
      }}
      companionName={pendingBrowseCompanion?.name || ''}
      companionGender={pendingBrowseCompanion?.gender}
      companionAge={pendingBrowseCompanion?.age}
      isMinor={treatAsMinor(profile?.dateOfBirth)}
      onSelectRole={(role, nameOverride, voiceId, chosenGender, chosenEnergy) => {
        setShowRolePicker(false);
        completeBrowseConnect(role, undefined, nameOverride, voiceId, chosenGender, chosenEnergy);
      }}
    />
    <div
      className="relative w-full overflow-hidden select-none bg-black"
      style={{ height: 'min(100dvh, 900px)' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Back button removed — integrated into filter header below */}
      {/* ── Full-bleed background image with cross-fade ── */}
      <AnimatePresence mode="sync">
        {activeCompanion && (
          <motion.img
            key={activeCompanion.id}
            src={activeCompanion.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
             style={{ objectPosition: activeCompanion.heroPosition || 'center 30%' }}
             initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          />
        )}
      </AnimatePresence>

      {/* ── Tap-to-expand zone on background image ── */}
      {activeCompanion && (
        <>
          <button
            onClick={() => setShowImageLightbox(true)}
            className="absolute inset-x-0 z-10"
            style={{
              top: '15%',
              height: 'calc(50dvh - 8rem)',
            }}
            aria-label="Tap to expand image"
          />
          <motion.button
            onClick={() => setShowImageLightbox(true)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: [1, 1.12, 1] }}
            transition={{ delay: 0.6, duration: 0.8, scale: { delay: 1.2, duration: 0.6, ease: 'easeInOut' } }}
            className="absolute z-20 flex flex-col items-center gap-0.5"
            style={{ top: 'calc(50dvh - 6rem)', right: '1rem' }}
          >
            <span className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:text-white hover:bg-black/50 transition-all md:px-4 md:py-2 md:text-xs">
              <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5" />
              Expand
            </span>
            <span className="hidden md:block text-[9px] text-white/40 font-medium tracking-wide">tap to see full image</span>
          </motion.button>
        </>
      )}


      <div
        className="absolute inset-x-0 top-0 z-20 pt-3 pb-6"
        style={{
          background: 'linear-gradient(to bottom, hsl(0 0% 0% / 0.75) 0%, hsl(0 0% 0% / 0.35) 65%, transparent 100%)',
        }}
      >
        {/* Need filter pills with integrated back button */}
        <div className="relative">
          <div className="overflow-x-auto no-scrollbar px-4 pr-8">
            <div className="flex gap-2 w-max">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-0.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold bg-black/30 text-white/80 border border-white/15 hover:bg-black/40 hover:text-white backdrop-blur-sm transition-all duration-200"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
              {needs.map(need => {
                const isActive = activeFilter === need.id;
                return (
                  <motion.button
                    key={need.id}
                    onClick={() => setActiveFilter(need.id)}
                    whileTap={{ scale: 0.94 }}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-black shadow-lg'
                        : 'bg-black/30 text-white/80 border border-white/15 hover:bg-black/40 hover:text-white backdrop-blur-sm'
                    }`}
                  >
                    <span>{need.emoji}</span>
                    <span>{need.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none" style={{ background: 'linear-gradient(to right, transparent, black)' }} />
        </div>

        {/* Active filter description */}
        <AnimatePresence mode="wait">
          {activeNeed && activeNeed.id !== 'all' && (
            <motion.p
              key={activeNeed.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="mt-2 px-5 text-[11px] text-white/50"
            >
              {activeNeed.description}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── Onboarding preference cart (first-time users only) ── */}
      <div className="absolute top-20 left-0 right-0 z-20">
        <OnboardingPreferenceCart />
      </div>

      {/* ── Art style badge ── */}
      {activeCompanion && (
        <div className="absolute top-20 left-4 z-20">
          <span className="rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-white/70 backdrop-blur-sm border border-white/10">
            {activeCompanion.style}
          </span>
        </div>
      )}

      {/* ── No results state ── */}
      {filtered.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="text-center px-8">
            <p className="text-white/70 text-sm mb-4">No companions match this filter yet.</p>
            <button onClick={() => setActiveFilter('all')} className="text-xs text-white/50 underline">
              See everyone
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom overlay: companion info + CTA + thumbnail strip ── */}
      {filtered.length > 0 && activeCompanion && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end"
          style={{
            background: 'linear-gradient(to top, hsl(265 35% 5% / 0.98) 0%, hsl(265 35% 5% / 0.82) 28%, hsl(265 35% 5% / 0.4) 58%, transparent 100%)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0px)',
          }}
        >
          {/* Companion info */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCompanion.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="px-5 mb-3"
            >
              {/* Name + section */}
              <div className="flex items-center gap-2 mb-1">
               <h2 className="font-display text-xl font-bold text-white leading-snug">
                  {activeCompanion.description}
                </h2>
              </div>

              {/* Best for */}
              <p className="text-[11px] font-semibold text-white/45 uppercase tracking-wider mb-1.5">
                Best for
              </p>
              <p className="text-sm text-white/75 leading-snug mb-2">
                {activeCompanion.bestFor}
              </p>

              {/* Personality line — the voice line */}
              <p className="text-xs text-white/45 italic leading-relaxed">
                "{activeCompanion.personalityLine}"
              </p>
            </motion.div>
          </AnimatePresence>

          {/* View detail tap zone */}
          <div className="px-5 mb-3 flex justify-end">
            <motion.button
              onClick={() => setShowProfileLightbox(true)}
              whileTap={{ scale: 0.95 }}
              className="py-2 px-4 rounded-full text-xs font-medium text-white/70 transition-all flex items-center gap-1.5"
              style={{
                background: 'hsl(0 0% 100% / 0.1)',
                backdropFilter: 'blur(16px)',
                border: '1px solid hsl(0 0% 100% / 0.12)',
              }}
            >
              View profile
              <ArrowRight className="h-3 w-3" />
            </motion.button>
          </div>

          {/* Thumbnail strip */}
          <div className="relative px-10 mb-2">
            {/* Prev arrow */}
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 border border-white/10 text-white/70 hover:text-white transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Thumbnails */}
            <div ref={thumbnailStripRef} className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {filtered.map((c, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <motion.button
                    key={c.id}
                    onClick={() => goTo(idx)}
                    whileTap={{ scale: 0.92 }}
                    animate={{
                      scale: isActive ? 1.12 : 1,
                      opacity: isActive ? 1 : 0.4,
                    }}
                    transition={{ duration: 0.2 }}
                    className={`shrink-0 rounded-lg overflow-hidden transition-all ${isActive ? 'ring-2 ring-white' : ''}`}
                    style={{ width: 44, height: 44 }}
                  >
                    <img
                      src={c.image}
                      alt={c.name}
                      className="w-full h-full object-cover"
                      style={{ objectPosition: 'top center' }}
                      loading="lazy"
                    />
                  </motion.button>
                );
              })}

              {/* Build your own — Studio entry point */}
              {userIsAdult && (
                <motion.button
                  onClick={() => navigate('/studio')}
                  whileTap={{ scale: 0.92 }}
                  className="shrink-0 flex flex-col items-center justify-center rounded-lg border border-white/15 bg-white/[0.07] hover:bg-white/[0.12] transition-colors gap-0.5"
                  style={{ width: 44, height: 44 }}
                  title="Build your own companion"
                >
                  <Wand2 className="h-3.5 w-3.5 text-white/50" />
                  <span className="text-[8px] text-white/35 font-semibold leading-none">Build</span>
                </motion.button>
              )}

              {/* Use your own image */}
              <motion.button
                onClick={() => browseUploadRef.current?.click()}
                whileTap={{ scale: 0.92 }}
                className="shrink-0 flex flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/[0.05] hover:bg-white/[0.10] transition-colors gap-0.5"
                style={{ width: 44, height: 44 }}
                title="Use your own image"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 text-white/50 animate-spin" />
                ) : (
                  <ImagePlus className="h-3.5 w-3.5 text-white/50" />
                )}
                <span className="text-[8px] text-white/35 font-semibold leading-none">Yours</span>
              </motion.button>
              <input ref={browseUploadRef} type="file" accept="image/*" onChange={handleBrowseDirectUpload} className="hidden" />
            </div>

            {/* Next arrow */}
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 border border-white/10 text-white/70 hover:text-white transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Counter + Studio nudge */}
          <div className="flex items-center justify-between px-5 pb-3">
            <span className="text-[11px] text-white/40 tabular-nums">
              {activeIndex + 1} / {filtered.length}
            </span>
            {userIsAdult && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/studio')}
                  className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/55 transition-colors"
                >
                  <Wand2 className="h-3 w-3" />
                  Build your own
                  <ArrowRight className="h-3 w-3" />
                </button>
                <span className="text-white/15">·</span>
                <button
                  onClick={() => browseUploadRef.current?.click()}
                  className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/55 transition-colors"
                >
                  <ImagePlus className="h-3 w-3" />
                  Use your image
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Left / Right tap zones for desktop ── */}
      <button
        onClick={goPrev}
        className="absolute left-0 top-[15%] bottom-[40%] w-16 z-10 opacity-0"
        aria-label="Previous"
      />
      <button
        onClick={goNext}
        className="absolute right-0 top-[15%] bottom-[40%] w-16 z-10 opacity-0"
        aria-label="Next"
      />
    </div>

    {/* ── Full-screen image lightbox ── */}
    <AnimatePresence>
      {showImageLightbox && activeCompanion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
          style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}
          onClick={() => setShowImageLightbox(false)}
        >
          <button
            onClick={() => setShowImageLightbox(false)}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white/80 hover:text-white transition-colors"
          >
            ✕
          </button>
          <motion.img
            src={activeCompanion.image}
            alt={activeCompanion.name}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="max-h-[90dvh] max-w-[95vw] object-contain rounded-2xl"
          />
          <div className="absolute bottom-8 left-0 right-0 text-center">
            <p className="text-white/80 text-sm font-semibold">{activeCompanion.description}</p>
            <p className="text-white/50 text-xs mt-0.5">{activeCompanion.style}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    {/* ── Profile lightbox (replaces detail page) ── */}
    {activeCompanion && (
      <AvatarLightbox
        open={showProfileLightbox}
        onClose={() => setShowProfileLightbox(false)}
        imageUrl={activeCompanion.image}
        name={activeCompanion.description}
        bio={activeCompanion.bio}
        personality={activeCompanion.personality}
        age={activeCompanion.age}
        gender={activeCompanion.gender}
        onConnect={isAlreadyConnected
          ? () => navigate(`/chat/${activeCompanion.id}`)
          : () => handleConnect(activeCompanion)
        }
        connectLabel={isAlreadyConnected ? 'Start chatting' : isReconnectable ? 'Reconnect' : 'Connect'}
        isConnecting={isConnectingThis}
      />
    )}
    {revealData && !awakeningDone && (
      <AwakeningScreen onComplete={() => setAwakeningDone(true)} avatarReady={true} />
    )}
    {revealData && awakeningDone && !namingDone && (
      <NamingCeremony
        userName={profile?.userName || ''}
        currentName={revealData.defaultName}
        onComplete={async (newName) => {
          setChosenName(newName);
          setNamingDone(true);
          setPresenceDone(false);
          setPresenceIntent('');
          setShowPresenceQuestion(true);
          if (user && revealData.memberId) {
            await supabase
              .from('connections')
              .update({ name: newName })
              .eq('user_id', user.id)
              .eq('member_id', revealData.memberId);
            updateConnection(revealData.memberId, { name: newName });
            updateProfile({ companionName: newName });
          }
        }}
      />
    )}
    {revealData && awakeningDone && namingDone && !presenceDone && showPresenceQuestion && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6 gap-6"
        style={{ background: 'rgba(8,8,20,0.97)' }}
      >
        <p className="text-[11px] uppercase tracking-[0.2em] text-primary/50">
          One last thing
        </p>
        <h2 className="font-serif text-xl text-white/90 text-center leading-snug">
          What do you hope this<br />relationship feels like?
        </h2>
        <textarea
          value={presenceIntent}
          onChange={e => setPresenceIntent(e.target.value)}
          placeholder="e.g. Someone who makes me feel seen. A calm I can come home to. Someone who matches my energy..."
          rows={3}
          className="w-full max-w-sm rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/40 resize-none"
        />
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowPresenceQuestion(false);
              setPresenceDone(true);
            }}
            className="text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={() => {
              if (presenceIntent.trim() && revealData) {
                updateConnection(revealData.memberId, {
                  originStory: presenceIntent.trim()
                } as any);
              }
              setShowPresenceQuestion(false);
              setPresenceDone(true);
            }}
            className="rounded-full bg-primary/10 border border-primary/30 px-6 py-2 text-sm text-primary"
          >
            Continue →
          </button>
        </div>
      </motion.div>
    )}
    {revealData && awakeningDone && namingDone && presenceDone && (
      <CompanionRevealCard
        name={chosenName || revealData.name}
        avatarUrl={revealData.avatarUrl}
        bio={revealData.bio}
        personality={revealData.personality}
        style={revealData.style}
        bestFor={revealData.bestFor}
        visualMode={revealData.avatarUrl ? 'personal' : 'abstract'}
        memberId={revealData.memberId}
        companionGender={filtered.find(c => c.id === revealData.memberId)?.gender || 'neutral'}
        isMinor={treatAsMinor(profile?.dateOfBirth)}
        currentPath="browse"
        onRename={(newName) => {
          setRevealData(prev => prev ? { ...prev, name: newName } : prev);
          if (user && revealData.memberId) {
            supabase.from('connections').update({ name: newName }).eq('user_id', user.id).eq('member_id', revealData.memberId).then(() => {});
            updateConnection(revealData.memberId, { name: newName });
            updateProfile({ companionName: newName });
          }
        }}
        onContinue={() => {
          const memberId = revealData.memberId;
          const companionName = revealData.name;
          localStorage.setItem('compani-just-awakened', memberId);
          localStorage.setItem('compani-naming-ceremony-done', 'true');
          setRevealData(null);
          setNamingDone(false);
          setChosenName('');
          setPresenceIntent('');
          setPresenceDone(false);
          setShowPresenceQuestion(false);
          setAwakeningDone(false);
           localStorage.setItem(`welcome_sheet_seen_${memberId}`, 'true');
           navigate(`/chat/${memberId}`);
        }}
        onRedo={() => {
          setRevealData(null);
          setAwakeningDone(false);
          setNamingDone(false);
          setChosenName('');
          setPresenceIntent('');
          setPresenceDone(false);
          setShowPresenceQuestion(false);
        }}
        onSwitchPath={(path) => {
          setRevealData(null);
          setAwakeningDone(false);
          setNamingDone(false);
          setChosenName('');
          setPresenceIntent('');
          setPresenceDone(false);
          setShowPresenceQuestion(false);
          navigate(path === 'studio' ? '/studio' : '/browse');
        }}
        onSaveBackstory={(mid, backstory) => {
          updateConnection(mid, { backstory } as any);
        }}
        onRoleChange={(role) => {
          if (revealData.memberId) {
            updateConnection(revealData.memberId, { connectionMode: role });
          }
        }}
        onVoiceChange={(voiceId) => {
          if (revealData.memberId) {
            updateConnection(revealData.memberId, { voiceId });
          }
        }}
      />
    )}
    </>
  );
}
