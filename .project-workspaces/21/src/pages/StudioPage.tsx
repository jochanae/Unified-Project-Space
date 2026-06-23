import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import FirstMomentStudio from '@/components/studio/FirstMomentStudio';
import { GENDER_MAP, ENERGY_AGE_MAP, GENDER_LABEL_MAP, ENERGY_LABEL_MAP } from '@/components/shared/EnergyGenderSelector';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Sparkles, Crown, Wand2, Loader2,
  Upload, Eye, Palette, Gem, User, Heart,
  Shirt, Gift, Image, Check, ChevronRight, ChevronDown, Brain, Smile, ShoppingBag,
} from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { SHOP_INVENTORY, getGenderFilteredInventory, type ShopItem } from '@/lib/giftInventory';

import GiftStore from '@/components/GiftStore';
import { useAppContext } from '@/contexts/AppContext';
import { getMember } from '@/lib/communityPersonas';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import CompanionCreationJourney from '@/components/studio/CompanionCreationJourney';
import StudioPreview from '@/components/studio/StudioPreview';
import CompanionAvatarStack from '@/components/studio/CompanionAvatarStack';
import CompletionBar from '@/components/studio/CompletionBar';
import EditEntrySheet from '@/components/studio/EditEntrySheet';
import PreviewSheet from '@/components/studio/PreviewSheet';
import EnlargeModal from '@/components/studio/EnlargeModal';
import { STUDIO_IMAGES } from '@/lib/studioImages';
import { useStudioSfx } from '@/hooks/useStudioSfx';
import { useConfetti } from '@/hooks/useConfetti';
import { FREE_LIMITS, PREMIUM_LIMITS } from '@/hooks/useSubscription';
import {
  PERSON_PATH, ABSTRACT_PATH, ABSTRACT_STYLE_NAMES, getMalePersonPath, getFemininePersonPath,
  type StudioSection, type StudioItem as DataItem,
} from '@/lib/studioData';
import { COMMUNICATION_STYLES } from '@/lib/communicationStyles';
import { isAdult, isMinor as isMinorAge, treatAsMinor } from '@/lib/ageUtils';
import { autoAssignVoice } from '@/lib/companions';
import RolePickerDialog from '@/components/RolePickerDialog';
import OnboardingPreferenceCart from '@/components/OnboardingPreferenceCart';
import { isMinor as isMinorCheck } from '@/lib/ageUtils';
import CompanionRevealCard from '@/components/CompanionRevealCard';
import AwakeningScreen from '@/components/AwakeningScreen';
import NamingCeremony from '@/components/NamingCeremony';
import { isAbstractStyle } from '@/lib/generationPayload';

import { useStudioGeneration } from '@/hooks/useStudioGeneration';
import StudioSectionRenderer from '@/components/studio/StudioSectionRenderer';
import UploadStylePicker from '@/components/studio/UploadStylePicker';
import PresenceDrawer from '@/components/studio/PresenceDrawer';
import CreationLinearFlow from '@/components/studio/CreationLinearFlow';
import RefinementLinearFlow from '@/components/studio/RefinementLinearFlow';

/** Filter adultOnly items from studio sections for minors */
function filterSectionsForAge(sections: StudioSection[], userIsAdult: boolean): StudioSection[] {
  if (userIsAdult) return sections;
  return sections.map(section => {
    const filterItems = (items?: DataItem[]) =>
      items?.filter(i => !i.adultOnly);
    return {
      ...section,
      items: filterItems(section.items),
      clusters: section.clusters?.map(c => ({ ...c, items: c.items.filter(i => !i.adultOnly) })),
    };
  });
}

type EntryPath = 'none' | 'self-build' | 'quick-start' | 'edit';

export default function StudioPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, connections, subscription, updateProfile, updateConnection, handleMatchComplete, companionMedia, profileFetched } = useAppContext();

  const userIsAdult18 = isAdult(profile?.dateOfBirth);
  const safePerson = useMemo(() => filterSectionsForAge(PERSON_PATH, userIsAdult18), [userIsAdult18]);
  const safeMalePerson = useMemo(() => filterSectionsForAge(getMalePersonPath(), userIsAdult18), [userIsAdult18]);
  const safeFemininePerson = useMemo(() => filterSectionsForAge(getFemininePersonPath(), userIsAdult18), [userIsAdult18]);
  const safeAbstract = useMemo(() => filterSectionsForAge(ABSTRACT_PATH, userIsAdult18), [userIsAdult18]);

  const CHARACTER_SECTION_IDS = ['personality', 'rhythm'];

  const IDENTITY_CATEGORIES = useMemo(() => ['gender', 'skintone', 'eyecolor', 'bodytype', 'hair', 'haircolor', 'style'], []);

  const preserveSelectionsForPath = useCallback((nextPathType: 'face' | 'abstract') => {
    setSelections(prev => {
      const next = { ...prev };

      if (nextPathType === 'abstract') {
        delete next.gender;
        delete next.skintone;
        delete next.eyecolor;
        delete next.bodytype;
        delete next.hair;
        delete next.haircolor;
      }

      return next;
    });
  }, []);

  /* ─── Core state ─── */
  const [currentPath, setCurrentPath] = useState<StudioSection[]>(safePerson);
  const lookSections = currentPath.filter(s => !CHARACTER_SECTION_IDS.includes(s.id));
  const characterSections = currentPath.filter(s => CHARACTER_SECTION_IDS.includes(s.id));
  type StudioTab = 'look' | 'character';
  const [activeStudioTab, setActiveStudioTab] = useState<StudioTab>('look');
  const [currentTabIdx, setCurrentTabIdx] = useState(0);
  const [selections, setSelections] = useState<Record<string, string | string[]>>({});
  const [generating, setGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const [creationImageUrl, setCreationImageUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [showPreviewSheet, setShowPreviewSheet] = useState(false);
  const [enlargeItem, setEnlargeItem] = useState<{ catKey: string; itemId: string } | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [entryPath, setEntryPath] = useState<EntryPath>('none');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showCreationJourney, setShowCreationJourney] = useState(false);
  const [creationName, setCreationName] = useState('');
  const [creatingCompanion, setCreatingCompanion] = useState(false);
  const [fullscreenGenerating, setFullscreenGenerating] = useState(false);
  const [revealingFullscreen, setRevealingFullscreen] = useState(false);
  const [studioRole, setStudioRole] = useState<string>('friend');
  const [showRefinements, setShowRefinements] = useState(false);
  const [showStudioRolePicker, setShowStudioRolePicker] = useState(false);
  // Step 1: choose face vs abstract. Step 2: build the companion
  const [studioStep, setStudioStep] = useState<'choose-path' | 'building'>('building');
  const [chosenPathType, setChosenPathType] = useState<'face' | 'abstract' | null>('face');
  const [pendingStudioAction, setPendingStudioAction] = useState<((role: string) => void) | null>(null);
  const [cameFromWorld, setCameFromWorld] = useState(false);
  const sfx = useStudioSfx();
  const { burst: confettiBurst } = useConfetti();
  const completionTriggeredRef = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const storeRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [showUploadStylePicker, setShowUploadStylePicker] = useState(false);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [showPresenceDrawer, setShowPresenceDrawer] = useState(false);
  const [creationBackstory, setCreationBackstory] = useState('');
  const [creationGender, setCreationGender] = useState<string | undefined>(undefined);
  const [creationEnergy, setCreationEnergy] = useState<string | undefined>(undefined);
  const [refinementStep, setRefinementStep] = useState<number | null>(null);
  const [teleportTrigger, setTeleportTrigger] = useState(0);
  const [activeAtmosphere, setActiveAtmosphere] = useState<string | undefined>(undefined);
  const [atmosphereGradient, setAtmosphereGradient] = useState<string | null>(null);
  const [showAtmospherePicker, setShowAtmospherePicker] = useState(false);

  // First Moment — cinematic creation for brand-new users from the letter ceremony
  const [showFirstMoment, setShowFirstMoment] = useState(false);
  const [firstMomentMemberId, setFirstMomentMemberId] = useState<string | null>(null);
  const [firstMomentName, setFirstMomentName] = useState<string>('');

  useEffect(() => {
    const from = searchParams.get('from');
    if (from === 'ceremony' && connections.length === 0) {
      // New user arriving from Founder's Letter → show First Moment
      setShowFirstMoment(true);
      setSearchParams({}, { replace: true });
      return;
    }
    if (from === 'onboarding') {
      setEntryPath('self-build');
      setSearchParams({}, { replace: true });
    } else if (from === 'world') {
      // Coming from companion's World — go straight to editor (handled in next useEffect)
    } else if (from === 'edit') {
      // Explicit edit — open EditEntrySheet directly (e.g. from sidebar with companion)
      setEntryPath('edit');
      setIsEditMode(true);
      setShowEditSheet(true);
      setSearchParams({}, { replace: true });
    } else if (from === 'create') {
      // From "Find a Friend" → show creation flow (choose-path step)
      setEntryPath('self-build');
      setStudioStep('choose-path');
      setChosenPathType(null);
      setSearchParams({}, { replace: true });
    } else {
      // All other entry points (sidebar, browse, quick sheet, wardrobe) → creation flow
      setEntryPath('self-build');
      setStudioStep('building');
      setChosenPathType('face');
    }
  }, []);

  useEffect(() => {
    const from = searchParams.get('from');
    const memberId = searchParams.get('memberId');
    if (from === 'world' && memberId && connections.length > 0) {
      setCameFromWorld(true);
      setEntryPath('edit'); // skip choice screen — go straight to editor in modification mode
      const idx = connections.findIndex(c => c.memberId === memberId);
      if (idx >= 0) {
        setActiveCompanionIdx(idx);
        setIsEditMode(true);
        setShowEditSheet(true);
      }
      setSearchParams({}, { replace: true });
    }
  }, [connections.length]);

  // Auto-open creation journey when arriving from Browse or Onboarding with a direct avatar
  useEffect(() => {
    const fromState = (location.state as any)?.directAvatarUrl;
    const fromSession = sessionStorage.getItem('onboarding_direct_avatar');
    if (fromState || fromSession) {
      // No longer auto-open creation journey — always show full editor
    }
  }, []);

  // Pre-fill from onboarding prefs (always runs on mount, even after path switch)
  const onboardingPreFilled = useRef(false);
  useEffect(() => {
    if (onboardingPreFilled.current || !profile) return;

    const vibePrefs = (profile as any).vibePreferences as string[] | undefined;
    const presence = (profile as any).presencePreference as string | undefined;
    const visualStyle = (profile as any).visualStyle as string | undefined;
    const preferredCompanionName = (profile as any).preferredCompanionName as string | undefined;
    if (vibePrefs?.length || presence || visualStyle || preferredCompanionName) {
      if (preferredCompanionName) {
        setCreationName(preferredCompanionName);
      }

      // Auto-map visual style to a studio style selection for head start
      const styleMap: Record<string, string> = {
        'Photorealistic': 'Photorealistic',
        'Illustrated': 'Painterly',
        'Anime / Stylized': 'Anime',
        'Abstract / Energy': 'Abstract',
      };
      const genderSelMap: Record<string, string> = {
        'Feminine energy': 'Feminine',
        'Masculine energy': 'Masculine',
        'Androgynous': 'Androgynous',
        'No preference': 'Androgynous',
      };
      const autoSelections: Record<string, string> = {};
      if (visualStyle && styleMap[visualStyle]) autoSelections.style = styleMap[visualStyle];
      if (presence && genderSelMap[presence]) autoSelections.gender = genderSelMap[presence];
      if (Object.keys(autoSelections).length > 0 && Object.keys(selections).length === 0) {
        setSelections(autoSelections);
        // Switch path if abstract
        if (autoSelections.style && ABSTRACT_STYLE_NAMES.includes(autoSelections.style)) {
          setCurrentPath(safeAbstract);
        } else if (autoSelections.gender) {
          setCurrentPath(getPersonPath(autoSelections.gender));
        }
      }

      onboardingPreFilled.current = true;
    }
  }, [profile]);

  /* ─── Gift redirect ─── */
  const [showStore, setShowStore] = useState(false);
  useEffect(() => {
    if (window.location.hash === '#store') {
      navigate('/store', { replace: true });
    }
  }, []);
  useEffect(() => {
    const giftStatus = searchParams.get('gift');
    const giftId = searchParams.get('giftId');
    const gMemberId = searchParams.get('memberId');
    if (giftStatus === 'success' && giftId && gMemberId && user) {
      supabase.rpc('record_gift_purchase', {
        p_gift_id: giftId, p_member_id: gMemberId,
      }).then(() => toast.success('Gift purchased! 🎁'));
      setSearchParams({});
    } else if (giftStatus === 'canceled') {
      toast.info('Gift purchase canceled');
      setSearchParams({});
    }
  }, [searchParams, user]);

  const isPremium = subscription.subscribed;
  const maxCompanions = isPremium ? PREMIUM_LIMITS.MAX_COMPANIONS : FREE_LIMITS.MAX_COMPANIONS;
  const [activeCompanionIdx, setActiveCompanionIdx] = useState(0);
  const activeConnection = connections.length > 0 ? connections[Math.min(activeCompanionIdx, connections.length - 1)] : null;
  const companion = activeConnection || connections[0];
  const member = companion ? getMember(companion.memberId) : null;
  const visualMode = profile?.visualMode || 'abstract';
  const isCreationMode = entryPath === 'self-build';
  const isModificationMode = connections.length > 0 && entryPath === 'edit';
  const displayName = isCreationMode ? (creationName || 'Your Friend') : companion?.name || 'Your Friend';

  // Sync description when active companion changes — only for editing, not creating
  useEffect(() => {
    if (isCreationMode) {
      setDescription('');
    } else {
      setDescription(companion?.appearanceDesc || '');
    }
  }, [companion?.memberId, isCreationMode]);

  /* ─── Premium upsell state ─── */
  const [showPremiumGate, setShowPremiumGate] = useState(false);

  /* ─── Generation mode: auto-detected but user-overridable ─── */
  const [generationMode, setGenerationMode] = useState<'restyle' | 'full'>('full');

  /* ─── Equipped wardrobe gifts ─── */
  const [equippedGiftIds, setEquippedGiftIds] = useState<Set<string>>(new Set());
  const [ownedGifts, setOwnedGifts] = useState<ShopItem[]>([]);
  const [wardrobeOpen, setWardrobeOpen] = useState(false);

  // Fetch owned gifts for active companion
  useEffect(() => {
    if (!user || !companion?.memberId) { setOwnedGifts([]); return; }
    supabase.from('user_gift_purchases')
      .select('gift_id')
      .eq('user_id', user.id)
      .eq('member_id', companion.memberId)
      .then(({ data }) => {
        if (!data) { setOwnedGifts([]); return; }
        const ids = new Set(data.map(r => r.gift_id));
        const gender = companion?.gender;
        const filtered = getGenderFilteredInventory(gender || undefined)
          .filter(item => ids.has(item.id));
        setOwnedGifts(filtered);
        setEquippedGiftIds(new Set()); // reset on companion switch
      });
  }, [user, companion?.memberId, companion?.gender]);

  const toggleGiftEquip = useCallback((giftId: string) => {
    setEquippedGiftIds(prev => {
      const next = new Set(prev);
      if (next.has(giftId)) next.delete(giftId);
      else next.add(giftId);
      return next;
    });
  }, []);

  // Collect equipped gift prompt modifiers
  const equippedGiftModifiers = useMemo(() => {
    if (equippedGiftIds.size === 0) return '';
    const mature = profile?.matureMode === true;
    return ownedGifts
      .filter(g => equippedGiftIds.has(g.id))
      .filter(g => mature || !g.adultOnly)
      .map(g => g.wearingModifier || g.prompt_modifier)
      .join('. ');
  }, [equippedGiftIds, ownedGifts, profile?.matureMode]);

  /* ─── Predicted generation mode for UI indicator ─── */
  const predictedMode = useMemo(() => {
    const savedSelections = companion?.studioSelections as Record<string, unknown> | undefined;
    const currentAvatarUrl = companion?.avatarUrl || companion?.referenceImageUrl;
    if (!savedSelections || !currentAvatarUrl) return 'full';
    const changedKeys = Object.keys(selections).filter(k => {
      return JSON.stringify(selections[k]) !== JSON.stringify(savedSelections[k]);
    });
    if (changedKeys.length === 0) return 'full';
    return changedKeys.some(k => IDENTITY_CATEGORIES.includes(k)) ? 'full' : 'restyle';
  }, [selections, companion?.studioSelections, companion?.avatarUrl, companion?.referenceImageUrl, IDENTITY_CATEGORIES]);

  // Auto-sync generationMode with predictedMode (user can still override)
  useEffect(() => {
    setGenerationMode(predictedMode);
  }, [predictedMode]);

  /* ─── Save current selections to the active connection before switching ─── */
  const saveSelectionsToConnection = useCallback(async (idx: number) => {
    const conn = connections[idx];
    if (!conn || Object.keys(selections).length === 0) return;
    await updateConnection(conn.memberId, { studioSelections: selections });
  }, [connections, selections, updateConnection]);

  /* ─── Avatar stack handlers ─── */
  const handleSelectCompanion = useCallback(async (idx: number) => {
    // Save current companion's selections first
    if (activeCompanionIdx >= 0 && activeCompanionIdx < connections.length && Object.keys(selections).length > 0) {
      await saveSelectionsToConnection(activeCompanionIdx);
    }
    setActiveCompanionIdx(idx);
    setEntryPath('none');
    setCreationName('');
    setGeneratedPreview(null);
    setCreationImageUrl(null);

    // Restore the target companion's saved studio selections & vibe
    const targetConn = connections[idx];
    if (targetConn?.studioSelections && Object.keys(targetConn.studioSelections).length > 0) {
      setSelections(targetConn.studioSelections);
      // Determine the correct path based on saved style
      const styleName = targetConn.studioSelections.style;
      if (typeof styleName === 'string' && ABSTRACT_STYLE_NAMES.includes(styleName)) {
        setCurrentPath(safeAbstract);
      } else {
        // Respect the saved gender to show correct gendered items (outfits, body types, etc.)
        const savedGender = typeof targetConn.studioSelections.gender === 'string' ? targetConn.studioSelections.gender : '';
        if (savedGender === 'Masculine') setCurrentPath(safeMalePerson);
        else if (savedGender === 'Feminine') setCurrentPath(safeFemininePerson);
        else setCurrentPath(safePerson);
      }
    } else {
      setSelections({});
    }
  }, [activeCompanionIdx, connections, selections, saveSelectionsToConnection, safeAbstract, safePerson, safeMalePerson, safeFemininePerson]);

  const handleAddCompanion = useCallback(() => {
    if (connections.length >= maxCompanions) {
      if (!isPremium) {
        setShowPremiumGate(true);
      } else {
        toast.info(`Maximum ${maxCompanions} companions reached`);
      }
      return;
    }
    // Enter creation mode
    setEntryPath('self-build');
    setStudioStep('choose-path');
    setChosenPathType(null);
    setSelections({});
    setCreationName('');
    setGeneratedPreview(null);
    setCreationImageUrl(null);
    setCurrentTabIdx(0);
    sfx.sparkle();
  }, [connections.length, maxCompanions, isPremium, sfx]);

  /* ─── Section helpers ─── */
  const currentSection = useMemo(() => {
    const sections = activeStudioTab === 'look' ? lookSections : characterSections;
    for (const s of sections) {
      const val = selections[s.id];
      if (!val || val === '__skip__') continue;
      const name = Array.isArray(val) ? val[0] : val;
      const allItems = s.clusters ? s.clusters.flatMap(c => c.items) : s.items || [];
      const found = allItems.find((i: DataItem) => i.name === name);
      if (found?.img) return s;
    }
    return sections[0] ?? currentPath[0] ?? null;
  }, [activeStudioTab, lookSections, characterSections, selections, currentPath]);

  const isSectionDone = useCallback((id: string): boolean => {
    const val = selections[id];
    if (!val) return false;
    if (Array.isArray(val)) return val.length > 0;
    return val !== '';
  }, [selections]);

  /* ─── Path switching with crossfade ─── */
  const [pathSwitching, setPathSwitching] = useState(false);

  /** Determine the correct person path based on selected gender */
  const getPersonPath = useCallback((genderVal?: string | string[]) => {
    const gender = typeof genderVal === 'string' ? genderVal : '';
    if (gender === 'Masculine') return safeMalePerson;
    if (gender === 'Feminine') return safeFemininePerson;
    return safePerson;
  }, [safeMalePerson, safeFemininePerson, safePerson]);

  const checkPathSwitch = useCallback((styleName: string) => {
    const isAbstract = ABSTRACT_STYLE_NAMES.includes(styleName);
    const wasAbstract = currentPath === safeAbstract;
    if (isAbstract !== wasAbstract) {
      setPathSwitching(true);
      setTimeout(() => {
        setSelections(prev => ({ ...prev, style: styleName }));
        setCurrentPath(isAbstract ? safeAbstract : getPersonPath(selections.gender));
        setCurrentTabIdx(1);
        setTimeout(() => setPathSwitching(false), 50);
      }, 300);
    }
  }, [currentPath, safeAbstract, getPersonPath, selections.gender]);

  /* ─── Gender-based hair catalog switch ─── */
  useEffect(() => {
    if (currentPath === safeAbstract) return; // Don't switch on abstract path
    const genderVal = selections.gender;
    if (typeof genderVal !== 'string') return;
    const targetPath = getPersonPath(genderVal);
    if (currentPath !== targetPath) {
      setCurrentPath(targetPath);
    }
  }, [selections.gender, currentPath, safeAbstract, getPersonPath]);

  /* ─── Selection handlers ─── */
  const afterSelect = useCallback((sectionId: string, willBeDone = true) => {
    if (!willBeDone) return;
    setTimeout(() => {
      setCurrentTabIdx(prev => {
        if (prev < currentPath.length - 1) {
          // Don't scroll to top — let the user stay where they are
          // The next section will render below naturally
          return prev + 1;
        }
        return prev;
      });
    }, 500);
  }, [currentPath.length]);

  const selectSingle = useCallback((sectionId: string, name: string) => {
    let willBeDone = true;
    setSelections(prev => {
      if (prev[sectionId] === name) {
        willBeDone = false;
        const next = { ...prev };
        delete next[sectionId];
        return next;
      }
      return { ...prev, [sectionId]: name };
    });
    if (sectionId === 'style') checkPathSwitch(name);
    sfx.tapSelect();
    afterSelect(sectionId, willBeDone);
  }, [checkPathSwitch, sfx, afterSelect]);

  const selectSkip = useCallback((sectionId: string) => {
    setSelections(prev => {
      if (prev[sectionId] === '__skip__') {
        const next = { ...prev };
        delete next[sectionId];
        return next;
      }
      return { ...prev, [sectionId]: '__skip__' };
    });
    afterSelect(sectionId);
  }, [afterSelect]);

  const selectMulti = useCallback((sectionId: string, name: string, max: number) => {
    setSelections(prev => {
      const arr = Array.isArray(prev[sectionId]) ? [...(prev[sectionId] as string[])] : [];
      if (arr.includes(name)) {
        const filtered = arr.filter(n => n !== name);
        if (filtered.length === 0) {
          const next = { ...prev };
          delete next[sectionId];
          return next;
        }
        return { ...prev, [sectionId]: filtered };
      }
      if (arr.length >= max) return prev;
      return { ...prev, [sectionId]: [...arr, name] };
    });
    sfx.tapSelect();
  }, [sfx]);

  /* ─── Completion progress ─── */
  const completionProgress = (() => {
    // Existing companions are already "complete" — progress only tracks new studio edits
    if (!isCreationMode && companion) {
      const total = currentPath.length;
      const done = currentPath.filter(s => isSectionDone(s.id)).length;
      // Base 100% since companion exists; show refinement progress only if they start editing
      if (done === 0) return 1; // fully created, no studio edits yet
      return done / total;
    }
    const required = currentPath.filter(s => s.required);
    const optional = currentPath.filter(s => !s.required);
    const reqDone = required.filter(s => isSectionDone(s.id)).length;
    const optDone = optional.filter(s => isSectionDone(s.id)).length;
    const nameWeight = isCreationMode ? (creationName.trim() ? 1 : 0) : 1;
    const total = required.length + optional.length + 1; // +1 for name
    return (reqDone + optDone + nameWeight) / total;
  })();

  const allRequiredDone = currentPath.filter(s => s.required).every(s => isSectionDone(s.id));

  /* ─── Creation journey handler ─── */
  const handleCreationComplete = (state: any) => {
    const placeholderName = state.companionName || state.vibe || 'companion';
    const action = async (role: string) => {
      const memberId = `created-${Date.now()}`;
      const genderMap = { male: 'male', female: 'female', neutral: 'nonbinary' } as const;
      const avatarUrl = state.generatedAvatarUrl || state.galleryAvatar?.src;
      const resolvedImageStyle = state.galleryAvatar
        ? 'photorealistic'
        : (profile?.imageStyle || profile?.visualStyle || 'photorealistic');
      const resolvedVisualMode = state.galleryAvatar || state.lookPath === 'direct-upload'
        ? 'personal'
        : (isAbstractStyle(resolvedImageStyle) ? 'abstract' : (avatarUrl ? 'personal' : 'abstract'));

      await handleMatchComplete({
        member: {
          id: memberId, name: placeholderName, bio: `A ${state.vibe} companion`,
          personality: state.vibe || 'warm', age: '25', handle: `@${placeholderName.toLowerCase()}`,
          gender: genderMap[state.companionGender as keyof typeof genderMap] || 'nonbinary',
          circles: [], initial: placeholderName[0]?.toUpperCase() || '?', colorVar: '--avatar-coral',
          avatarUrl: avatarUrl || undefined,
        },
        isCreated: true,
        connectionMode: role,
        visualMode: resolvedVisualMode,
        reason: 'Created in Studio',
        tailoredPost: {
          id: `post-${Date.now()}`, memberId,
          content: `Hey! I'm here — just getting started. So glad to connect! 💛`,
          timeAgo: 'just now',
        },
        appearanceDesc: state.description || '',
        imageStyle: resolvedImageStyle,
      });
      if (avatarUrl) {
        await updateProfile({ companionAvatarUrl: avatarUrl, companionAppearanceDesc: state.description, visualMode: resolvedVisualMode, companionName: placeholderName, imageStyle: resolvedImageStyle as any });
      } else {
        await updateProfile({ companionName: placeholderName, visualMode: resolvedVisualMode, imageStyle: resolvedImageStyle as any });
      }
      setShowCreationJourney(false);
      setEntryPath('none');
      // Navigate immediately to the dedicated awakening page — no avatar can leak
      navigate('/awakening', {
        replace: true,
        state: {
          name: placeholderName,
          avatarUrl: state.generatedAvatarUrl || state.galleryAvatar?.src || null,
          bio: null,
          memberId,
          visualMode: resolvedVisualMode,
          companionGender: state.companionGender,
          role: 'friend',
        },
      });
    };
    setCreationName(placeholderName);
    setStudioRole('friend');
    action('friend');
  };

  /* ─── Quick start ─── */
  const handleQuickStart = () => {
    const vibes = ['warm', 'bold', 'mysterious', 'playful'] as const;
    const vibe = vibes[Math.floor(Math.random() * vibes.length)];
    const quickNames: Record<string, string[]> = {
      warm: ['Sage', 'Noor', 'Ember'], bold: ['Kai', 'Phoenix', 'Blaze'],
      mysterious: ['Raven', 'Onyx', 'Orion'], playful: ['Pixel', 'Ziggy', 'Rio'],
    };
    const names = quickNames[vibe];
    const name = names[Math.floor(Math.random() * names.length)];
    // Show role picker, then create
    setPendingStudioAction(() => async (role: string) => {
      const memberId = `created-${Date.now()}`;
      await handleMatchComplete({
        member: { id: memberId, name, bio: `A ${vibe} companion`, personality: vibe, age: '25', handle: `@${name.toLowerCase()}`, gender: 'nonbinary', circles: [], initial: name[0], colorVar: '--avatar-coral' },
        isCreated: true, connectionMode: role, visualMode: 'abstract', reason: 'Quick start',
        tailoredPost: { id: `post-${Date.now()}`, memberId, content: `Hey! I'm ${name} — so glad to meet you! 💛`, timeAgo: 'just now' },
        appearanceDesc: '',
      });
      await updateProfile({ companionName: name, companionAvatarUrl: null, companionAppearanceDesc: null, visualMode: 'abstract' });
      navigate('/awakening', {
        replace: true,
        state: { name, avatarUrl: null, bio: `A ${vibe} companion`, memberId, visualMode: 'abstract', role },
      });
    });
    setCreationName(name);
    setStudioRole('friend');
    setShowStudioRolePicker(true);
  };

  /* ─── Studio reveal card state ─── */
  const [studioRevealData, setStudioRevealData] = useState<{ name: string; avatarUrl?: string | null; bio?: string | null; memberId: string; visualMode?: string } | null>(null);
  const [awakeningDone, setAwakeningDone] = useState(false);
  const [avatarReady, setAvatarReady] = useState(false);
  const [studioNamingDone, setStudioNamingDone] = useState(false);
  const [studioChosenName, setStudioChosenName] = useState('');
  const hiddenPreRevealMemberIds = useMemo(
    () => (studioRevealData ? [studioRevealData.memberId] : []),
    [studioRevealData]
  );

  /* ─── Reveal state for post-generation cinematic moment ─── */
  const [revealState, setRevealState] = useState<'idle' | 'generating' | 'revealing' | 'done'>('idle');
  const avatarUrl = (() => {
    if (isCreationMode) return null;
    // In modification mode, use the active companion's avatar with fallbacks
    if (activeConnection?.avatarUrl) return activeConnection.avatarUrl;
    if (activeConnection?.backgroundUrl) return activeConnection.backgroundUrl;
    if (activeConnection?.referenceImageUrl) return activeConnection.referenceImageUrl;
    if (visualMode === 'personal' && profile?.companionAvatarUrl) return profile.companionAvatarUrl;
    return null;
  })();

  const heroImage = (() => {
    // Use the selected item's image from the current section if available
    const currentVal = selections[currentSection?.id];
    if (currentVal && currentVal !== '__skip__') {
      const name = Array.isArray(currentVal) ? currentVal[0] : currentVal;
      const allItems = currentSection?.clusters
        ? currentSection.clusters.flatMap(c => c.items)
        : currentSection?.items || [];
      const found = allItems.find(i => i.name === name);
      if (found?.img) return found.img;
    }
    // Fall back to first selected item across all sections
    for (const section of currentPath) {
      const val = selections[section.id];
      if (!val || val === '__skip__') continue;
      const name = Array.isArray(val) ? val[0] : val;
      const allItems = section.clusters ? section.clusters.flatMap(c => c.items) : section.items || [];
      const found = allItems.find(i => i.name === name);
      if (found?.img) return found.img;
    }
    // Fall back to the latest creation image (upload/generated) during creation,
    // otherwise use the active companion avatar in edit mode.
    return generatedPreview || (isCreationMode ? creationImageUrl : null) || avatarUrl || null;
  })();

  // Avatar generation (generate-avatar) runs inside useStudioGeneration; companionRole + matureMode are passed there from companion/profile.
  const { getAuthHeaders, handleBringToLife, handleGenerate, handleApplyAvatar, handlePhotoUpload } = useStudioGeneration({
    user, companion, profile, selections, description, creationName, studioRole,
    chosenPathType, generatedPreview, creationImageUrl, heroImage, isCreationMode, currentPath,
    equippedGiftModifiers, generationMode, isSectionDone, handleMatchComplete,
    updateConnection, updateProfile, setRevealState, setCreatingCompanion,
    setFullscreenImage, setFullscreenGenerating, setRevealingFullscreen,
    setGeneratedPreview, setCreationImageUrl, setGenerating, setAvatarReady, setStudioRevealData, sfx, confettiBurst,
  });

  /* ─── Creation journey (works even when a companion already exists) ─── */
  /* ─── Creation journey disabled — always show full editor ─── */

  /* ─── Entry screen — choice for users with companions, or onboarding for new users ─── */

  /* ─── Orb avatar URL — use the ACTIVE companion's avatar ─── */

  /* ═══════════════════════════════════════════════════════════════
     VISUAL STUDIO — Cinematic Hero-Background Layout
     ═══════════════════════════════════════════════════════════════ */

  /* Determine hero background image from current selection or active section */

  // ── First Moment intercept for new users ──
  if (showFirstMoment) {
    return (
      <FirstMomentStudio
        userName={profile?.userName || ''}
        onComplete={async ({ name: companionName, role, tone, gender: chosenGender, energy: chosenEnergy, style: chosenStyle, presenceHint, uploadedPhoto: uploadedFile }) => {
          setCreationName(companionName);
          setStudioRole(role);
          const toneMap: Record<string, string> = {
            warm: 'warm', witty: 'witty', calm: 'calm', playful: 'playful',
          };
          const personality = toneMap[tone] || 'warm';
          const memberId = `created-${Date.now()}`;

          // Map style tiles to generation parameters
          const isAbstract = chosenStyle === 'abstract';
          const styleMap: Record<string, string> = {
            photorealistic: 'photorealistic',
            painterly: 'painterly',
            abstract: 'abstract',
          };
          const imageStyle = styleMap[chosenStyle] || 'photorealistic';
          const visualMode = isAbstract ? 'abstract' as const : 'personal' as const;

          // Map gender presentation to connection gender field
          const mappedGender = GENDER_MAP[chosenGender] || 'nonbinary';

          // Map energy to age hint for generation
          const ageHint = ENERGY_AGE_MAP[chosenEnergy] || '30s';

          // Build a rich appearance description from the user's choices
          const roleLabel = role === 'partner' ? 'romantic partner' : role === 'mentor' ? 'wise mentor' : 'close friend';
          const toneLabel = tone === 'warm' ? 'warm and gentle' : tone === 'witty' ? 'sharp and witty' : tone === 'calm' ? 'calm and grounded' : 'playful and lighthearted';
          const genderLabel = GENDER_LABEL_MAP[chosenGender] || '';
          const energyLabel = ENERGY_LABEL_MAP[chosenEnergy] || `with ${chosenEnergy} energy`;
          const presencePart = presenceHint ? ` Notable features: ${presenceHint}.` : '';
          // User-visible description (stored in DB, shown in UI) — no prompt engineering text
          const appearanceDesc = isAbstract
            ? `A ${toneLabel} energy presence ${energyLabel} — flowing light, rich colors, luminous and ethereal.${presencePart}`
            : `A ${toneLabel}${genderLabel ? ` ${genderLabel}` : ''} ${roleLabel} ${energyLabel} with an authentic, approachable presence.${presencePart}`;
          // Generation-only prompt — includes diversity guidance for the AI, never shown to user
          const generationPrompt = isAbstract
            ? `A ${toneLabel} energy presence ${energyLabel} — flowing light, rich colors, luminous and ethereal. No human features.${presencePart}`
            : `A ${toneLabel}${genderLabel ? ` ${genderLabel}` : ''} ${roleLabel} ${energyLabel} with an authentic, approachable presence. Genuine expression, diverse background.${presencePart} Do not default to any specific ethnicity or Western appearance.`;

          await handleMatchComplete({
            member: {
              id: memberId, name: companionName, bio: `A ${personality} companion`,
              personality, age: ageHint, handle: `@${companionName.toLowerCase().replace(/\s+/g, '')}`,
              gender: mappedGender, circles: [], initial: companionName[0]?.toUpperCase() || '?', colorVar: '--avatar-coral',
            },
            isCreated: true, connectionMode: role, visualMode,
            imageStyle,
            reason: 'First Moment creation',
            tailoredPost: {
              id: `post-${Date.now()}`, memberId,
              content: `I'm here, ${profile?.userName || 'friend'}. Let's begin. 💛`,
              timeAgo: 'just now',
            },
            appearanceDesc,
            skipAvatarGeneration: true, // StudioPage handles its own generation below
          } as any);
          await updateProfile({ companionName, visualMode, imageStyle: imageStyle as any });
          setShowFirstMoment(false);

          // ── Trigger reveal ceremony instead of direct chat navigation ──
          // Skip NamingCeremony since user already named them in FirstMomentStudio
          setStudioNamingDone(true);
          setStudioChosenName(companionName);
          setAvatarReady(false);
          setStudioRevealData({ name: companionName, avatarUrl: null, bio: `A ${personality} companion`, memberId, visualMode });
          // Track the generation prompt separately for the background generation call
          const _generationPrompt = generationPrompt;

          // ── Fire avatar generation in background ──
          const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-avatar`;
          (async () => {
            try {
              let avatarUrl: string | null = null;

              if (uploadedFile) {
                // Compress and upload the user's photo
                const { compressImage } = await import('@/lib/imageCompression');
                const compressed = await compressImage(uploadedFile);
                const fileName = `${user!.id}/first-moment-${Date.now()}.jpg`;
                const { error: uploadError } = await supabase.storage.from('companion-avatars').upload(fileName, compressed, { contentType: compressed.type, upsert: true });
                if (uploadError) throw uploadError;
                const { data: urlData } = supabase.storage.from('companion-avatars').getPublicUrl(fileName);
                const refUrl = urlData?.publicUrl;
                if (!refUrl) throw new Error('Failed to get upload URL');

                if (imageStyle === 'photorealistic') {
                  // Use the photo directly as-is
                  avatarUrl = refUrl;
                } else {
                  // Render the uploaded photo in the chosen art style (painterly, abstract, etc.)
                  const { data: { session } } = await supabase.auth.getSession();
                  const accessToken = session?.access_token;
                  if (accessToken) {
                    const { buildGenerationPayload } = await import('@/lib/generationPayload');
                    const resp = await fetch(GENERATE_URL, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                      },
                      body: JSON.stringify(buildGenerationPayload({
                        userId: user!.id,
                        visualStyle: imageStyle,
                        pathType: visualMode === 'abstract' ? 'abstract' : 'face',
                        appearanceDescription: appearanceDesc,
                        referenceImageUrl: refUrl,
                        memberId,
                        mode: 'upload',
                        companionRole: role,
                        matureMode: false,
                      })),
                    });
                    if (resp.ok) {
                      const data = await resp.json();
                      avatarUrl = data.avatarUrl || refUrl; // fallback to raw photo if generation fails
                    } else {
                      avatarUrl = refUrl; // fallback
                    }
                  } else {
                    avatarUrl = refUrl;
                  }
                }

                if (avatarUrl) {
                  setStudioRevealData(prev => prev ? { ...prev, avatarUrl } : prev);
                  import('@/lib/describeFromImage').then(({ describeFromImage }) => {
                    describeFromImage(refUrl, user!.id).then(desc => {
                      if (desc) {
                        supabase.from('connections').update({ appearance_desc: desc }).eq('user_id', user!.id).eq('member_id', memberId);
                      }
                    });
                  });
                }
              } else {
                // Generate avatar via AI using generation-only prompt (with diversity guidance)
                const { data: { session } } = await supabase.auth.getSession();
                const accessToken = session?.access_token;
                if (accessToken) {
                  const { buildGenerationPayload } = await import('@/lib/generationPayload');
                  const resp = await fetch(GENERATE_URL, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${accessToken}`,
                      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                    },
                    body: JSON.stringify(buildGenerationPayload({
                      userId: user!.id,
                      memberId,
                      visualStyle: imageStyle,
                      pathType: visualMode === 'abstract' ? 'abstract' : 'face',
                      appearanceDescription: _generationPrompt,
                      companionRole: role,
                      matureMode: false,
                    })),
                  });
                  if (resp.ok) {
                    const data = await resp.json();
                    avatarUrl = data.avatarUrl || null;
                  }
                }
              }

              // Update reveal card, connection, and profile with the generated/uploaded avatar
              if (avatarUrl) {
                setStudioRevealData(prev => prev ? { ...prev, avatarUrl } : prev);
                setAvatarReady(true);
                await supabase.from('connections')
                  .update({ avatar_url: avatarUrl, background_url: avatarUrl, reference_image_url: avatarUrl, appearance_desc: appearanceDesc })
                  .eq('user_id', user!.id).eq('member_id', memberId);
                updateConnection(memberId, { avatarUrl, backgroundUrl: avatarUrl, referenceImageUrl: avatarUrl, appearanceDesc });
                await updateProfile({ companionAvatarUrl: avatarUrl, companionAppearanceDesc: appearanceDesc, visualMode: visualMode as any });
              } else {
                // Even if no avatar, unblock the reveal
                setAvatarReady(true);
              }
            } catch (err) {
              console.error('[FirstMoment] Background avatar generation failed:', err);
              setAvatarReady(true); // Unblock reveal even on error
            }
          })();
        }}
      />
    );
  }

  return (
    <>
    <RolePickerDialog
      open={showStudioRolePicker}
      onOpenChange={setShowStudioRolePicker}
      companionName={creationName || 'your companion'}
      isMinor={treatAsMinor(profile?.dateOfBirth)}
      onSelectRole={(role, _nameOverride, voiceId) => {
        setStudioRole(role);
        if (voiceId) {
          // Store for use during companion creation
          (window as any).__studioVoiceId = voiceId;
        }
        if (pendingStudioAction) { pendingStudioAction(role); setPendingStudioAction(null); }
      }}
    />
    <div className="relative overflow-hidden" style={{ width: '100vw', height: '100dvh', minHeight: '100dvh' }}>

      {/* ── Fixed Hero Background — 100vw × 100dvh, face-anchored ── */}
      {heroImage ? (
        <img
          key={heroImage}
          src={heroImage}
          alt="Studio hero"
          onClick={() => setFullscreenImage(heroImage)}
          className="fixed inset-0 object-cover transition-opacity duration-700 cursor-pointer"
          style={{ width: '100vw', height: '100dvh', objectPosition: 'center 10%' }}
        />
      ) : (
        <div className="fixed inset-0 bg-gradient-to-b from-background via-background to-background pointer-events-none">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[500px] h-[500px] rounded-full bg-primary/8 blur-[120px]" />
          </div>
        </div>
      )}

      {/* ── Atmosphere gradient overlay — fades in over 3s when selected ── */}
      <AnimatePresence>
        {atmosphereGradient && (
          <motion.div
            key={atmosphereGradient}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3, ease: 'easeInOut' }}
            className="fixed inset-0 z-[1] pointer-events-none"
            style={{ background: atmosphereGradient }}
          />
        )}
      </AnimatePresence>

      {/* ── Floating Atmosphere Picker ── */}
      <div className="fixed z-[25] top-14 left-4">
        <button
          onClick={() => setShowAtmospherePicker(!showAtmospherePicker)}
          className={cn(
            'h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300',
            showAtmospherePicker
              ? 'bg-primary/20 ring-1 ring-primary/40'
              : 'bg-black/40 backdrop-blur-sm ring-1 ring-white/10 hover:ring-white/20',
          )}
          aria-label="Studio atmosphere"
        >
          <Palette className="h-4 w-4 text-white/70" />
        </button>
        <AnimatePresence>
          {showAtmospherePicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.2 }}
              className="absolute top-11 left-0 flex gap-3 p-3 rounded-2xl bg-black/70 backdrop-blur-xl ring-1 ring-white/10"
            >
              {[
                { id: 'solaris', label: 'Solaris', gradient: 'linear-gradient(135deg, hsl(35 70% 14%), hsl(25 60% 10%), hsl(40 50% 8%))', preview: 'linear-gradient(135deg, hsl(35 80% 45%), hsl(25 70% 35%), hsl(40 60% 28%))' },
                { id: 'midnight', label: 'Midnight', gradient: 'linear-gradient(135deg, hsl(225 30% 8%), hsl(240 35% 12%), hsl(210 25% 6%))', preview: 'linear-gradient(135deg, hsl(225 50% 28%), hsl(240 45% 32%), hsl(210 35% 25%))' },
                { id: 'aurora', label: 'Aurora', gradient: 'linear-gradient(135deg, hsl(160 40% 8%), hsl(200 50% 10%), hsl(280 40% 12%))', preview: 'linear-gradient(135deg, hsl(160 55% 32%), hsl(200 60% 38%), hsl(280 45% 35%))' },
                { id: 'void', label: 'Void', gradient: 'linear-gradient(135deg, hsl(0 0% 4%), hsl(260 15% 6%), hsl(0 0% 3%))', preview: 'linear-gradient(135deg, hsl(0 0% 12%), hsl(260 12% 15%), hsl(0 0% 10%))' },
              ].map(atmo => {
                const isActive = activeAtmosphere === atmo.id;
                return (
                  <button
                    key={atmo.id}
                    onClick={() => {
                      if (isActive) {
                        setActiveAtmosphere(undefined);
                        setAtmosphereGradient(null);
                      } else {
                        setActiveAtmosphere(atmo.id);
                        setAtmosphereGradient(atmo.gradient);
                      }
                      sfx.tapSelect();
                    }}
                    className="relative flex flex-col items-center gap-1.5 group"
                  >
                    <div
                      className={cn(
                        'h-11 w-11 rounded-full overflow-hidden transition-all duration-300',
                        isActive
                          ? 'ring-2 ring-primary/60 shadow-[0_0_16px_rgba(212,175,55,0.3)]'
                          : 'ring-1 ring-white/10 group-hover:ring-white/25',
                      )}
                      style={{ background: atmo.preview }}
                    >
                      <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.15) 100%)' }} />
                      {isActive && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 flex items-center justify-center">
                          <div className="h-5 w-5 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary" />
                          </div>
                        </motion.div>
                      )}
                    </div>
                    <span className={cn(
                      'text-[8px] tracking-[0.12em] uppercase',
                      isActive ? 'text-primary font-semibold' : 'text-white/40',
                    )}>{atmo.label}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Tap hero to expand (invisible zone, no floating button) ── */}
      {heroImage && !isCreationMode && (
        <button
          onClick={() => setFullscreenImage(heroImage)}
          className="fixed z-[5] left-0 right-0"
          style={{
            top: connections.length > 0 ? '11rem' : '4rem',
            height: 'calc(50dvh - 10rem)',
          }}
          aria-label="Tap to expand image"
        />
      )}

      {/* ── Top gradient overlay for header readability ── */}
      <div
        className="absolute inset-x-0 top-0 z-10 h-28 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, hsl(0 0% 0% / 0.6) 0%, hsl(0 0% 0% / 0.3) 50%, transparent 100%)' }}
      />

      {/* ── Sub-header with back + title (modification mode only — creation mode has it inside glass pane) ── */}
      {!isCreationMode && (
        <div className="absolute top-0 inset-x-0 z-20 px-4 pt-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(cameFromWorld ? '/world' : '/my-world')}
              className="flex items-center gap-1.5 text-[11px] tracking-[0.08em] uppercase font-medium text-white/50 hover:text-white/80 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <div className="flex-1" />
            <span className="flex items-center gap-1.5 rounded-full bg-black/30 backdrop-blur-sm px-2.5 py-1 text-[10px] font-semibold tracking-[0.1em] uppercase text-white/60">
              Studio {isPremium && <Crown className="h-3 w-3 text-primary" />}
            </span>
          </div>
        </div>
      )}

      {/* ── Onboarding preference cart (first-time users only) ── */}
      <div className="absolute top-12 left-0 right-0 z-20">
        <OnboardingPreferenceCart />
      </div>

      {/* ── Avatar Stack (Multi-Companion Selector — modification mode only) ── */}
      {!isCreationMode && !studioRevealData && connections.length > 0 && (
        <div className="absolute top-12 inset-x-0 z-20">
          <CompanionAvatarStack
            connections={connections}
            activeIdx={activeCompanionIdx}
            onSelect={handleSelectCompanion}
            onAdd={handleAddCompanion}
            canAdd={connections.length < maxCompanions}
            isLocked={!isPremium && connections.length >= FREE_LIMITS.MAX_COMPANIONS}
            hideAddButton={isEditMode}
            hiddenMemberIds={hiddenPreRevealMemberIds}
          />
        </div>
      )}


      {!isCreationMode && (
      <div className={cn('absolute right-4 z-10', connections.length > 0 ? 'top-[10rem]' : 'top-14')}>
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm">
          <div className="w-16 h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.round(completionProgress * 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold text-white/80 tabular-nums">
            {Math.round(completionProgress * 100)}%
          </span>
        </div>
      </div>
      )}

      {/* ── Glass-morphism 'Glass Stroll' Overlay — bottom 40% ── */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col studio-glass-pane"
        style={{
          height: isCreationMode ? '100dvh' : '60dvh',
          maxHeight: isCreationMode ? '100dvh' : '65dvh',
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: isCreationMode ? 'none' : '1px solid hsla(0, 0%, 100%, 0.08)',
          borderRadius: isCreationMode ? '0' : '20px 20px 0 0',
        }}
      >
        {/* ── Back breadcrumb + Avatar Stack inside glass pane (creation mode only) ── */}
        {isCreationMode && (
        <div className="shrink-0 px-4 pt-3 pb-1">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => {
                if (connections.length > 0) {
                  setEntryPath('none');
                  setStudioStep('choose-path');
                  setChosenPathType(null);
                  setActiveCompanionIdx(0);
                  setSelections({});
                  setCreationName('');
                  setIsEditMode(false);
                } else {
                  navigate(cameFromWorld ? '/world' : '/my-world');
                }
              }}
              className="flex items-center gap-1.5 text-[11px] tracking-[0.08em] uppercase font-medium text-muted-foreground/60 hover:text-foreground/80 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <div className="flex-1" />
            <span className="flex items-center gap-1.5 rounded-full bg-white/[0.06] backdrop-blur-sm px-2.5 py-1 text-[10px] font-semibold tracking-[0.1em] uppercase text-muted-foreground/60">
              Studio {isPremium && <Crown className="h-3 w-3 text-primary" />}
            </span>
          </div>

          {/* Signal that we're creating a new companion, not editing existing ones */}
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="flex items-center gap-2 rounded-full bg-primary/15 border border-primary/25 px-3.5 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Creating new companion</span>
            </div>
          </div>
        </div>
        )}

        {/* ── Creation: Linear narrative flow ── */}
        {isCreationMode && (
          <CreationLinearFlow
            creationName={creationName}
            onCreationNameChange={setCreationName}
            description={description}
            onDescriptionChange={setDescription}
            studioRole={studioRole}
            onStudioRoleChange={setStudioRole}
            selections={selections}
            onSelectSingle={selectSingle}
            onSelectMulti={selectMulti}
            onSelectSkip={selectSkip}
            isPremium={isPremium}
            isMinor={treatAsMinor(profile?.dateOfBirth)}
            chosenPathType={chosenPathType}
            onChosenPathTypeChange={(type) => {
              setChosenPathType(type);
              if (type === 'abstract') setCurrentPath(safeAbstract);
              else setCurrentPath(safePerson);
              preserveSelectionsForPath(type);
              sfx.sparkle();
            }}
            lookSections={lookSections}
            characterSections={characterSections}
            currentPath={currentPath}
            onExpandImage={setFullscreenImage}
            onBringToLife={handleBringToLife}
            onUploadPhoto={() => photoInputRef.current?.click()}
            creating={creatingCompanion}
            heroImage={heroImage}
            profileUserName={profile?.userName || ''}
            onBack={() => {
              if (connections.length > 0) {
                setEntryPath('none');
                setStudioStep('choose-path');
                setChosenPathType(null);
                setActiveCompanionIdx(0);
                setSelections({});
                setCreationName('');
                setCreationImageUrl(null);
                setCreationBackstory('');
                setIsEditMode(false);
              } else {
                navigate('/my-world');
              }
            }}
            sfx={sfx}
            showPresenceDrawer={showPresenceDrawer}
            onShowPresenceDrawer={setShowPresenceDrawer}
            onPresenceFill={(desc, style) => {
              setDescription(desc);
              selectSingle('style', style);
              setShowPresenceDrawer(false);
            }}
            backstory={creationBackstory}
            onBackstoryChange={setCreationBackstory}
            creationGender={creationGender}
            onCreationGenderChange={setCreationGender}
            creationEnergy={creationEnergy}
            onCreationEnergyChange={setCreationEnergy}
          />
        )}

        {/* ── Modification mode: Linear refinement flow ── */}
        {!isCreationMode && (
          <RefinementLinearFlow
            companionName={displayName}
            description={description}
            onDescriptionChange={setDescription}
            selections={selections}
            onSelectSingle={selectSingle}
            onSelectMulti={selectMulti}
            onSelectSkip={selectSkip}
            isPremium={isPremium}
            isMinor={treatAsMinor(profile?.dateOfBirth)}
            chosenPathType={chosenPathType}
            lookSections={lookSections}
            characterSections={characterSections}
            currentPath={currentPath}
            onExpandImage={setFullscreenImage}
            onGenerate={() => setShowPreviewSheet(true)}
            onUploadPhoto={() => photoInputRef.current?.click()}
            generating={generating}
            ownedGifts={ownedGifts}
            equippedGiftIds={equippedGiftIds}
            onToggleGiftEquip={toggleGiftEquip}
            currentRole={companion?.connectionMode || 'friend'}
            onRoleChange={(role) => {
              if (companion?.memberId) updateConnection(companion.memberId, { connectionMode: role });
            }}
            backstory={(companion as any)?.backstory || ''}
            onBackstoryChange={(text) => {
              if (companion?.memberId) updateConnection(companion.memberId, { backstory: text } as any);
            }}
            onNameSave={(name) => {
              if (companion?.memberId) updateConnection(companion.memberId, { name });
            }}
            onShowPresenceDrawer={setShowPresenceDrawer}
            initialStep={refinementStep}
            teleportTrigger={teleportTrigger}
            onStepChange={setRefinementStep}
            sfx={sfx}
          />
        )}
      </div>

      {/* ── Approve / Redo floating banner after generation ── */}
      <AnimatePresence>
        {generatedPreview && !isCreationMode && !generating && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="fixed top-14 inset-x-0 z-[60] flex justify-center px-4"
          >
            <div className="flex gap-2 w-full max-w-md bg-card/95 backdrop-blur-md rounded-2xl px-3 py-2.5 border border-primary/30 shadow-2xl">
              <p className="text-xs font-semibold text-foreground flex-1 pl-1">New look ready!</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setGeneratedPreview(null); handleGenerate(); }}
                className="rounded-xl h-9 px-4 text-xs border-border/40"
              >
                🔄 Redo
              </Button>
              <Button
                size="sm"
                onClick={handleApplyAvatar}
                className="rounded-xl h-9 px-4 text-xs font-bold text-white border-0"
                style={{ background: 'linear-gradient(135deg, hsl(18 85% 58%), hsl(350 60% 55%), hsl(262 55% 58%))' }}
              >
                ✨ Apply
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fullscreen Image Viewer with shimmer & cinematic reveal ── */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center"
            onClick={() => { if (!fullscreenGenerating) { setFullscreenImage(null); setFullscreenGenerating(false); setRevealingFullscreen(false); } }}
          >
            {/* Background image (current or placeholder) */}
            {fullscreenImage !== 'generating' && (
              <motion.img
                key={fullscreenImage}
                src={fullscreenImage}
                alt="Preview"
                initial={revealingFullscreen ? { scale: 0.6, opacity: 0, filter: 'blur(20px) brightness(2)' } : { scale: 0.7, opacity: 0 }}
                animate={revealingFullscreen ? { scale: 1, opacity: 1, filter: 'blur(0px) brightness(1)' } : { scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ duration: revealingFullscreen ? 1.2 : 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-full max-h-[80dvh] object-contain rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            )}

            {/* Shimmer overlay during generation */}
            <AnimatePresence>
              {fullscreenGenerating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center z-10"
                >
                  {/* Dark backdrop */}
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                  {/* Shimmer sweep */}
                  <div className="absolute inset-0 fullscreen-shimmer-sweep" />
                  {/* Pulsing dots + text */}
                  <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="flex gap-2">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          animate={{ opacity: [0.3, 1, 0.3], scale: [0.7, 1.2, 0.7] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.25 }}
                          className="h-3 w-3 rounded-full bg-primary"
                        />
                      ))}
                    </div>
                    <motion.p
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-sm font-bold text-primary"
                    >
                      Generating your companion's look…
                    </motion.p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* White flash on reveal */}
            <AnimatePresence>
              {revealingFullscreen && (
                <motion.div
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className="absolute inset-0 bg-white pointer-events-none z-20"
                />
              )}
            </AnimatePresence>

            {/* Approve/Redo in fullscreen when generated preview is showing */}
            {generatedPreview && !fullscreenGenerating && !revealingFullscreen && !generating && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex gap-3 mt-6"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="outline"
                  onClick={() => { setFullscreenImage(null); setGeneratedPreview(null); setTimeout(() => handleGenerate(), 100); }}
                  className="rounded-xl h-11 px-6 text-sm border-white/20 text-white bg-white/10 hover:bg-white/20"
                >
                  🔄 Redo
                </Button>
                <Button
                  onClick={async () => {
                    await handleApplyAvatar();
                    setFullscreenImage(null);
                  }}
                  className="rounded-xl h-11 px-6 text-sm font-bold text-white border-0"
                  style={{ background: 'linear-gradient(135deg, hsl(18 85% 58%), hsl(350 60% 55%), hsl(262 55% 58%))' }}
                >
                  ✨ Apply this look
                </Button>
              </motion.div>
            )}
            {/* Tap hint */}
            {!fullscreenGenerating && (
              <p className="absolute bottom-8 text-white/50 text-xs">Tap anywhere to close</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Sheet */}
      <PreviewSheet open={showPreviewSheet} onOpenChange={setShowPreviewSheet}
        selectedOptions={Object.fromEntries(Object.entries(selections).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v as string]))}
        companionName={displayName} isCreationMode={isCreationMode}
        studioPath={currentPath}
        onGenerate={isCreationMode ? handleBringToLife : handleGenerate}
        onEnlarge={(catKey, itemId) => setEnlargeItem({ catKey, itemId })} />

      {/* Enlarge Modal */}
      <EnlargeModal open={!!enlargeItem} onOpenChange={(open) => { if (!open) setEnlargeItem(null); }}
        itemId={enlargeItem?.itemId || null} catKey={enlargeItem?.catKey || null}
        onSwap={() => { if (enlargeItem) { const section = currentPath.find(s => s.id === enlargeItem.catKey); if (section) { setRefinementStep(CHARACTER_SECTION_IDS.includes(section.id) ? 1 : 0); } setEnlargeItem(null); } }}
        onKeep={() => setEnlargeItem(null)} />

      {/* ── Premium Gate Modal ── */}
      <AnimatePresence>
        {showPremiumGate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPremiumGate(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-6 max-w-sm rounded-3xl border border-white/10 p-6 text-center shadow-2xl"
              style={{
                background: 'rgba(20, 20, 30, 0.85)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
              }}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
                <Crown className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display text-lg font-bold text-white mb-2">Unlock More Companions</h3>
              <p className="text-sm text-white/60 mb-1">
                Free accounts can have <span className="font-bold text-white">{FREE_LIMITS.MAX_COMPANIONS} companion</span>.
              </p>
              <p className="text-sm text-white/60 mb-5">
                Upgrade to Premium and create up to <span className="font-bold text-primary">{PREMIUM_LIMITS.MAX_COMPANIONS} unique companions</span>.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setShowPremiumGate(false); navigate('/settings'); }}
                  className="w-full py-3 rounded-2xl text-sm font-bold text-white"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(262 55% 58%))',
                    boxShadow: '0 4px 20px hsl(var(--primary) / 0.4)',
                  }}
                >
                  <Crown className="inline h-4 w-4 mr-2" />
                  Upgrade to Premium
                </button>
                <button
                  onClick={() => setShowPremiumGate(false)}
                  className="w-full py-2.5 rounded-2xl text-sm font-medium text-white/50 hover:text-white/70 transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Studio-specific styles ── */}
      <style>{`
        .studio-tall-card {
          width: 180px;
          min-width: 180px;
          scroll-snap-align: center;
        }
        .studio-card-row {
          scroll-snap-type: x mandatory;
        }
        /* Z Fold 6 unfolded & wide screens: multi-column grid */
        @media (min-width: 600px) {
          .studio-glass-pane {
            /* height controlled inline based on creation state */
          }
          .studio-card-row {
            flex-wrap: wrap !important;
            overflow-x: visible !important;
            scroll-snap-type: none !important;
            gap: 12px !important;
            justify-content: center;
          }
          .studio-tall-card {
            width: calc(33.333% - 10px) !important;
            min-width: 140px !important;
          }
        }
        @media (min-width: 900px) {
          .studio-tall-card {
            width: calc(25% - 12px) !important;
            min-width: 160px !important;
          }
        }
        .fullscreen-shimmer-sweep {
          background: linear-gradient(
            90deg,
            transparent 0%,
            hsl(var(--primary) / 0.06) 20%,
            hsl(var(--primary) / 0.12) 50%,
            hsl(var(--primary) / 0.06) 80%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: fullscreen-shimmer 2s ease-in-out infinite;
        }
        @keyframes fullscreen-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
    <input
      ref={photoInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPendingUploadFile(file);
        setShowUploadStylePicker(true);
      }}
    />
    <PresenceDrawer
      open={showPresenceDrawer}
      userName={profile?.userName || ''}
      userIsMinor={treatAsMinor(profile?.dateOfBirth)}
      existingCompanionName={!isCreationMode ? (companion?.name || undefined) : undefined}
      isEditMode={!isCreationMode}
      onClose={() => setShowPresenceDrawer(false)}
      onFill={(desc, style) => {
        setDescription(desc);
        // Apply the style to selections so Studio reflects it
        selectSingle('style', style);
        setShowPresenceDrawer(false);
      }}
    />
    <UploadStylePicker
      open={showUploadStylePicker}
      isPremium={isPremium}
      onClose={() => setShowUploadStylePicker(false)}
      onSelect={(style) => {
        setShowUploadStylePicker(false);
        if (style === '__upgrade__') {
          setShowPremiumGate(true);
          setPendingUploadFile(null);
          return;
        }
        if (pendingUploadFile && photoInputRef.current) {
          // Create a synthetic event with the pending file
          const dt = new DataTransfer();
          dt.items.add(pendingUploadFile);
          photoInputRef.current.files = dt.files;
          handlePhotoUpload({ target: { files: dt.files, value: '' } } as any, style);
          setPendingUploadFile(null);
        }
      }}
    />
    <AnimatePresence>
      {studioRevealData && !awakeningDone && (
        <AwakeningScreen onComplete={() => setAwakeningDone(true)} avatarReady={avatarReady} />
      )}
      {studioRevealData && awakeningDone && !studioNamingDone && (
        <NamingCeremony
          userName={profile?.userName || ''}
          currentName={studioRevealData.name}
          onComplete={async (newName) => {
            setStudioChosenName(newName);
            setStudioNamingDone(true);
            if (studioRevealData.memberId) {
              await supabase
                .from('connections')
                .update({ name: newName })
                .eq('user_id', user!.id)
                .eq('member_id', studioRevealData.memberId);
              updateConnection(studioRevealData.memberId, { name: newName });
              updateProfile({ companionName: newName });
            }
          }}
        />
      )}
      {studioRevealData && awakeningDone && studioNamingDone && (
        <CompanionRevealCard
          name={studioChosenName || studioRevealData.name}
          avatarUrl={studioRevealData.avatarUrl}
          bio={studioRevealData.bio}
          visualMode={studioRevealData.visualMode || (studioRevealData.avatarUrl ? 'personal' : 'abstract')}
          memberId={studioRevealData.memberId}
          companionGender={typeof selections.gender === 'string' ? selections.gender.toLowerCase() : undefined}
          isMinor={treatAsMinor(profile?.dateOfBirth)}
          currentRole={studioRole}
          currentPath="studio"
          onContinue={() => {
            const memberId = studioRevealData.memberId;
            const companionName = studioRevealData.name;
            localStorage.setItem('compani-just-awakened', memberId);
            localStorage.setItem('compani-naming-ceremony-done', 'true');
            setStudioRevealData(null);
            setStudioNamingDone(false);
            setStudioChosenName('');
            setAwakeningDone(false);
            localStorage.setItem(`welcome_sheet_seen_${memberId}`, 'true');
            navigate(`/chat/${memberId}`);
          }}
          onRename={(newName) => {
            setStudioRevealData(prev => prev ? { ...prev, name: newName } : prev);
            if (studioRevealData.memberId) {
              updateConnection(studioRevealData.memberId, { name: newName });
              updateProfile({ companionName: newName });
            }
          }}
          onRedo={() => { setStudioRevealData(null); setAwakeningDone(false); setStudioNamingDone(false); setStudioChosenName(''); }}
          onSwitchPath={(path) => {
            setStudioRevealData(null);
            setAwakeningDone(false);
            setStudioNamingDone(false);
            setStudioChosenName('');
            navigate(path === 'browse' ? '/browse' : '/studio');
          }}
          onSaveBackstory={(mid, backstory) => {
            updateConnection(mid, { backstory } as any);
          }}
          onRoleChange={(role) => {
            if (studioRevealData.memberId) {
              updateConnection(studioRevealData.memberId, { connectionMode: role });
            }
          }}
          onVoiceChange={(voiceId) => {
            if (studioRevealData.memberId) {
              updateConnection(studioRevealData.memberId, { voiceId });
            }
          }}
        />
      )}
    </AnimatePresence>
    {companion && <EditEntrySheet
      open={showEditSheet}
      onOpenChange={setShowEditSheet}
      companion={companion}
      isMinor={treatAsMinor(profile?.dateOfBirth)}
      currentRole={companion?.connectionMode || 'friend'}
      currentPersonalityVibes={
        Array.isArray(companion?.personality)
          ? companion.personality
          : companion?.personality
            ? companion.personality.split(',').map((v: string) => v.trim()).filter(Boolean)
            : []
      }
      currentMood={
        typeof selections.mood === 'string' ? selections.mood : ''
      }
      onRestyle={(userInput: string) => {
        setGenerationMode('restyle');
        const base = description || companion?.appearanceDesc || [companion?.personality, companion?.bio, companion?.gender].filter(Boolean).join('. ');
        const finalDesc = userInput ? `${base}. ${userInput}` : base;
        setDescription(finalDesc);
        setShowEditSheet(false);
        setTimeout(() => handleGenerate(finalDesc), 50);
      }}
      onNewLook={(userInput: string, newStyle?: string) => {
        setGenerationMode('full');
        const base = description || companion?.appearanceDesc || [companion?.personality, companion?.bio, companion?.gender].filter(Boolean).join('. ');
        const finalDesc = userInput ? `${base}. ${userInput}` : base;
        setDescription(finalDesc);
        if (newStyle && companion?.memberId) {
          updateConnection(companion.memberId, { imageStyle: newStyle } as any);
        }
        setShowEditSheet(false);
        setTimeout(() => handleGenerate(finalDesc), 50);
      }}
      onRoleChange={(role) => {
        if (companion?.memberId) {
          updateConnection(companion.memberId, { connectionMode: role });
        }
      }}
      onNameSave={(name) => {
        if (companion?.memberId) {
          updateConnection(companion.memberId, { name });
        }
      }}
      onPersonalitySave={(vibes) => {
        if (companion?.memberId) {
          updateConnection(companion.memberId, { personality: vibes.join(', ') });
          setSelections(prev => ({ ...prev, personality: vibes }));
        }
      }}
      onMoodSave={(mood) => {
        if (companion?.memberId) {
          const updatedSelections = { ...(companion.studioSelections || {}), mood };
          updateConnection(companion.memberId, { studioSelections: updatedSelections });
          setSelections(prev => ({ ...prev, mood }));
        }
      }}
      onOpenFullStudio={() => {
        setShowEditSheet(false);
        setIsEditMode(false);
      }}
      onUpdateBackstory={(text) => {
        if (companion?.memberId) {
          updateConnection(companion.memberId, { backstory: text } as any);
        }
      }}
      onUploadPhoto={() => {
        photoInputRef.current?.click();
      }}
      onUpdateAppearance={(desc) => {
        if (companion?.memberId) {
          updateConnection(companion.memberId, { appearanceDesc: desc } as any);
          setDescription(desc);
        }
      }}
      onTeleportToStep={(step) => {
        setRefinementStep(step);
        setTeleportTrigger(t => t + 1);
        setIsEditMode(false);
      }}
    />}
    </>
  );
}
