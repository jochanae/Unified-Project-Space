import { useState, useEffect, useRef, forwardRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Hand, Zap } from 'lucide-react';
import FireflyLayer from './FireflyLayer';
import MemorySpark from './MemorySpark';
import PresentationSurface from './PresentationSurface';
import CinemaMode from './CinemaMode';
import SpatialMinimap, { type MinimapParticipant } from './SpatialMinimap';
import VirtualJoystick from './VirtualJoystick';
import { useSpatialAudio } from '@/hooks/useSpatialAudio';
import { supabase } from '@/integrations/supabase/client';
import { useSpatialWebRTC } from '@/hooks/useSpatialWebRTC';
import { useSpatialCompanions } from '@/hooks/useSpatialCompanions';
import type { CircleMember, CircleMessage } from '@/hooks/useCircles';
import type { Connection } from '@/hooks/useProfile';

const KIDS_ZONES = [
  { id: 'Start Line', emoji: '🏁', fx: 0.12, fy: 0.12, bg: 'hsl(142 60% 40% / 0.25)', border: 'hsl(142 60% 40% / 0.6)', activeBg: 'hsl(142 60% 40% / 0.45)', activeBorder: 'hsl(142 60% 40% / 0.9)' },
  { id: 'Treasure Cove', emoji: '💎', fx: 0.88, fy: 0.12, bg: 'hsl(38 90% 55% / 0.25)', border: 'hsl(38 90% 55% / 0.6)', activeBg: 'hsl(38 90% 55% / 0.45)', activeBorder: 'hsl(38 90% 55% / 0.9)' },
  { id: 'Cloud Island', emoji: '☁️', fx: 0.50, fy: 0.46, bg: 'hsl(200 80% 60% / 0.25)', border: 'hsl(200 80% 60% / 0.6)', activeBg: 'hsl(200 80% 60% / 0.45)', activeBorder: 'hsl(200 80% 60% / 0.9)' },
  { id: 'Home Base', emoji: '🏠', fx: 0.50, fy: 0.88, bg: 'hsl(280 60% 55% / 0.25)', border: 'hsl(280 60% 55% / 0.6)', activeBg: 'hsl(280 60% 55% / 0.45)', activeBorder: 'hsl(280 60% 55% / 0.9)' },
] as const;
const ZONE_HIT_RADIUS = 0.08;

export type { Participant, CircleType } from './types';
import type { Participant, CircleType } from './types';

const PHYSICS_PRESETS: Record<CircleType, {
  dragMomentum: boolean;
  bounceStiffness: number;
  bounceDamping: number;
  floatAmplitude: number;
  floatDuration: number;
  dragElastic: number;
  fireflySpeed: 'calm' | 'medium' | 'energetic';
  showHandRaise: boolean;
  showReactionBurst: boolean;
}> = {
  social: {
    dragMomentum: true,
    bounceStiffness: 100,
    bounceDamping: 10,
    floatAmplitude: 10,
    floatDuration: 3.5,
    dragElastic: 0.3,
    fireflySpeed: 'energetic',
    showHandRaise: false,
    showReactionBurst: true,
  },
  personal: {
    dragMomentum: false,
    bounceStiffness: 300,
    bounceDamping: 35,
    floatAmplitude: 4,
    floatDuration: 7,
    dragElastic: 0.08,
    fireflySpeed: 'calm',
    showHandRaise: false,
    showReactionBurst: false,
  },
  kids: {
    dragMomentum: true,
    bounceStiffness: 80,
    bounceDamping: 8,
    floatAmplitude: 12,
    floatDuration: 3,
    dragElastic: 0.35,
    fireflySpeed: 'energetic',
    showHandRaise: false,
    showReactionBurst: true,
  },
  circle: {
    dragMomentum: false,
    bounceStiffness: 400,
    bounceDamping: 40,
    floatAmplitude: 3,
    floatDuration: 8,
    dragElastic: 0.05,
    fireflySpeed: 'calm',
    showHandRaise: true,
    showReactionBurst: false,
  },
  service: {
    dragMomentum: false,
    bounceStiffness: 400,
    bounceDamping: 40,
    floatAmplitude: 3,
    floatDuration: 8,
    dragElastic: 0.05,
    fireflySpeed: 'calm',
    showHandRaise: true,
    showReactionBurst: false,
  },
  fireside: {
    dragMomentum: false,
    bounceStiffness: 500,
    bounceDamping: 45,
    floatAmplitude: 2,
    floatDuration: 9,
    dragElastic: 0.02,
    fireflySpeed: 'calm',
    showHandRaise: true,
    showReactionBurst: false,
  },
};

interface SpatialRoomProps {
  circleId: string;
  userId: string;
  userName: string;
  circleType?: CircleType;
  onLeave?: () => void;
  members: CircleMember[];
  messages: CircleMessage[];
  sendMessage: (content: string, senderName: string, senderType?: string) => Promise<void>;
  connections?: Connection[];
  profile: any;
  subscription?: any;
  activeConnection?: any;
  isPresenting?: boolean;
  presenterId?: string;
  slides?: string[];
  currentSlide?: number;
  onSlideChange?: (index: number) => void;
  presentationMode?: 'iframe' | 'image';
  onStopPresenting?: () => void;
  raceActive?: boolean;
  raceTargetZone?: string | null;
  onZoneReached?: (zoneName: string) => void;
  atmosphereGradient: string;
  vibeHubNode?: React.ReactNode;
  camOn?: boolean;
  onCamToggle?: (on: boolean) => void;
  /** Surfaces live audio state so parent can wire TranscriptSheet / SessionFocusMode */
  onAudioState?: (state: { amplitude: number; isMuted: boolean; isSpeaking: boolean; toggleMute: () => void }) => void;
}

function getWorldScale(participantCount: number, circleType: CircleType = 'social'): number {
  if (circleType === 'circle' || circleType === 'service') return 4;
  let base: number;
  if (participantCount >= 20) base = 8;
  else if (participantCount >= 10) base = 7;
  else if (participantCount >= 5) base = 6;
  else base = 5;
  if (circleType === 'kids') return base * 2.5;
  return base;
}

const POSITIONS_FALLBACK = [
  { x: 0.30, y: 0.30 },
  { x: 0.70, y: 0.28 },
  { x: 0.50, y: 0.50 },
  { x: 0.22, y: 0.62 },
  { x: 0.78, y: 0.58 },
  { x: 0.38, y: 0.40 },
  { x: 0.62, y: 0.68 },
  { x: 0.45, y: 0.22 },
  { x: 0.55, y: 0.75 },
  { x: 0.25, y: 0.45 },
];

function generateSpawnPositions(count: number, type: CircleType): { x: number; y: number }[] {
  if (type === 'circle' || type === 'service') {
    return computeCommunitySpawns(count);
  }
  if (type === 'fireside') {
    return computeFiresideRing(count);
  }
  const positions: { x: number; y: number }[] = [];
  const minDist = 0.08;
  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let pos = { x: 0.5, y: 0.5 };
    while (attempts < 30) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.10 + Math.random() * 0.32;
      pos = {
        x: 0.5 + Math.cos(angle) * radius,
        y: 0.5 + Math.sin(angle) * radius,
      };
      pos.x = Math.max(0.05, Math.min(0.95, pos.x));
      pos.y = Math.max(0.05, Math.min(0.95, pos.y));
      const tooClose = positions.some(p => Math.sqrt((p.x - pos.x) ** 2 + (p.y - pos.y) ** 2) < minDist);
      if (!tooClose) break;
      attempts++;
    }
    positions.push(pos);
  }
  return positions;
}

/** Fireside: full circle ring, evenly spaced, centered */
function computeFiresideRing(count: number): { x: number; y: number }[] {
  const centerX = 0.50;
  const centerY = 0.50;
  const radius = 0.28;
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / Math.max(count, 1) - Math.PI / 2; // start from top
    positions.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }
  return positions;
}

function computeCommunitySpawns(count: number): { x: number; y: number }[] {
  const centerX = 0.50;
  const centerY = 0.65;
  const radiusX = 0.28;
  const radiusY = 0.15;
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.PI * ((i + 1) / (count + 1));
    positions.push({
      x: centerX - radiusX * Math.cos(angle),
      y: centerY + radiusY * Math.sin(angle),
    });
  }
  return positions;
}

const FLOAT_DELAYS = [0, 0.8, 1.6, 2.4, 0.4, 1.2, 2.0, 0.6];
const OWNER_HUES = [210, 280, 340, 160, 45, 30, 190, 120];

const HUDDLE_ENTER_DIST = 0.06;
const HUDDLE_EXIT_DIST = 0.09;
const SPARK_DELAY_MS = 15000;
const CRUSH_DIST = 0.03;
const CAMERA_SPEED = 8;
const AUTO_PAN_EDGE = 80;
const AUTO_PAN_SPEED = 6;

function computePewsPositions(count: number): { x: number; y: number }[] {
  const centerX = 0.50;
  const centerY = 0.78;
  const radiusX = 0.34;
  const radiusY = 0.14;
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.PI * ((i + 1) / (count + 1));
    positions.push({
      x: centerX - radiusX * Math.cos(angle),
      y: centerY - radiusY * Math.sin(angle),
    });
  }
  return positions;
}

const PRESENTER_POS = { x: 0.78, y: 0.30 };

const LiveVideoOrb = forwardRef<HTMLVideoElement, { stream: MediaStream; isLocal?: boolean }>(
  function LiveVideoOrb({ stream, isLocal = true }, _ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
      if (videoRef.current) videoRef.current.srcObject = stream;
    }, [stream]);
    return (
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="absolute inset-0 h-full w-full object-cover rounded-full"
        style={isLocal ? { transform: 'scaleX(-1)' } : undefined}
      />
    );
  }
);

function buildMemberMap(members: CircleMember[], currentUserId?: string, currentUserName?: string): Record<string, string> {
  const map: Record<string, string> = {};
  members.forEach(m => { map[m.user_id] = m.display_name || ''; });
  if (currentUserId && currentUserName) map[currentUserId] = currentUserName;
  return map;
}

export default function SpatialRoom({
  circleId,
  userId,
  userName,
  circleType = 'social',
  onLeave,
  members,
  messages,
  sendMessage,
  connections = [],
  profile,
  subscription,
  activeConnection,
  isPresenting = false,
  presenterId,
  slides = [],
  currentSlide = 0,
  onSlideChange,
  presentationMode = 'image',
  onStopPresenting,
  raceActive = false,
  raceTargetZone,
  onZoneReached,
  atmosphereGradient,
  vibeHubNode,
  camOn = false,
  onCamToggle,
  onAudioState,
}: SpatialRoomProps) {
  const localUserId = userId;
  const memberNames = useMemo(() => buildMemberMap(members, userId, userName), [members, userId, userName]);

  const localMember = members.find(m => m.user_id === userId);
  const localParticipantId = localMember?.id || '';

  const spatialCompanions = useSpatialCompanions({
    circleId,
    userId,
    userName,
    vibe: profile?.vibe,
    companionGender: profile?.companionGender || 'neutral',
    imageStyle: profile?.imageStyle || 'photorealistic',
    circleName: '',
    circleDescription: '',
    circleVibe: '',
    effectiveCircleType: circleType,
    members: members.map(m => ({ user_id: m.user_id, display_name: m.display_name })),
    memberNames,
    messages,
    connections: connections.map(c => ({
      memberId: c.memberId,
      name: c.name,
      personality: c.personality,
      gender: c.gender,
      age: c.age,
      bio: c.bio,
      avatarUrl: c.avatarUrl,
      communicationStyle: c.communicationStyle,
      appearanceDesc: c.appearanceDesc,
      referenceImageUrl: c.referenceImageUrl,
    })),
    sendMessage,
  });

  const { thinkingCompanionIds, lastSpeakingCompanion, companions: allCircleCompanions } = spatialCompanions;

  const spatialAudio = useSpatialAudio({
    micSensitivity: profile?.micSensitivity ?? 50,
    localParticipantId,
    autoStart: true,
    autoStartMuted: true,
    onSpeechStart: spatialCompanions.onSpeechStart,
  });

  const { localAmplitude, speakingPeerIds: speakingParticipantIds, localStream: audioLocalStream, isMuted, isSpeaking, toggleMute } = spatialAudio;

  // Surface live audio state so CircleChatPage can wire TranscriptSheet / SessionFocusMode
  useEffect(() => {
    onAudioState?.({ amplitude: localAmplitude, isMuted, isSpeaking, toggleMute });
  }, [localAmplitude, isMuted, isSpeaking]); // eslint-disable-line react-hooks/exhaustive-deps

  const webrtc = useSpatialWebRTC({
    circleId,
    userId,
    userName,
    enabled: true,
  });

  const { localStream: videoLocalStream, remoteStreams, cameraEnabled, startVideo: webrtcStartVideo, stopVideo: webrtcStopVideo } = webrtc;

  useEffect(() => {
    if (camOn && !cameraEnabled) {
      webrtcStartVideo().catch(() => {
        onCamToggle?.(false);
      });
    } else if (!camOn && cameraEnabled) {
      webrtcStopVideo();
    }
  }, [camOn, cameraEnabled, webrtcStartVideo, webrtcStopVideo, onCamToggle]);

  const localStream = videoLocalStream || audioLocalStream;

   const participants: Participant[] = useMemo(() => {
    const list: Participant[] = [];
    members.forEach(m => {
      // Resolve avatar: check circle_members row first, then profile for local user,
      // then try to find a matching connection avatar for ANY member (not just local)
      let memberAvatar = m.avatar_url;
      if (!memberAvatar && m.user_id === userId) {
        // Local user: robust fallback chain — activeConnection avatar first (the companion they're chatting with)
        memberAvatar = activeConnection?.avatarUrl || profile?.userReferenceImageUrl || profile?.avatarUrl || profile?.companionAvatarUrl || null;
        // Last resort: use any connection's avatar so the orb isn't blank
        if (!memberAvatar && connections?.length) {
          memberAvatar = connections[0]?.avatarUrl || null;
        }
      }
      if (!memberAvatar) {
        // Try to find avatar from connections (covers other members who may have companion avatars stored)
        const connMatch = connections.find(c => c.avatarUrl && m.display_name && c.name === m.display_name);
        if (connMatch) memberAvatar = connMatch.avatarUrl;
      }
      list.push({ id: m.id, name: m.display_name || memberNames[m.user_id] || 'Member', avatar: memberAvatar, type: 'human', userId: m.user_id });
    });
    allCircleCompanions.forEach(cc => {
      const matchedConn = connections.find(c => c.memberId === cc.member_id);
      const companionAvatar = matchedConn?.avatarUrl || cc.avatar_url || null;
      list.push({ id: cc.id, name: cc.companion_name, avatar: companionAvatar, type: 'companion', memberId: cc.member_id, ownerUserId: cc.user_id });
    });
    return list;
  }, [members, allCircleCompanions, connections, userId, profile?.avatarUrl, profile?.userReferenceImageUrl, profile?.companionAvatarUrl, activeConnection?.avatarUrl, memberNames]);

  const [latestSnippets, setLatestSnippets] = useState<{ participantId: string; text: string; ts: number }[]>([]);
  const lastSnippetMsgRef = useRef<string | null>(null);

  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.id === lastSnippetMsgRef.current) return;
    lastSnippetMsgRef.current = last.id;
    const participant = participants.find(
      p => (p.type === 'companion' && last.sender_type === 'companion' && p.name === last.sender_name) ||
           (p.type === 'human' && last.user_id === p.userId)
    );
    if (participant) {
      const snippet = { participantId: participant.id, text: last.content.slice(0, 60), ts: Date.now() };
      setLatestSnippets(prev => [...prev.filter(s => s.participantId !== participant.id), snippet]);
      setTimeout(() => {
        setLatestSnippets(prev => prev.filter(s => s.ts !== snippet.ts));
      }, 4500);
    }
  }, [messages.length, participants]); // eslint-disable-line react-hooks/exhaustive-deps

  const physics = PHYSICS_PRESETS[circleType];
  const isSocialMode = circleType === 'social';
  const isKidsMode = circleType === 'kids';
  const hasSpeedTrails = isSocialMode || isKidsMode;

  const velocityRef = useRef<Record<string, { vx: number; vy: number; lastX: number; lastY: number; trail: { x: number; y: number; age: number }[] }>>({});
  const humanIds = Array.from(new Set(participants.filter(p => p.type === 'human').map(p => p.userId!)));
  const ownerHueMap: Record<string, number> = {};
  humanIds.forEach((uid, i) => { ownerHueMap[uid] = OWNER_HUES[i % OWNER_HUES.length]; });

  const [zoomedId, setZoomedId] = useState<string | null>(null);
  const [cinemaMode, setCinemaMode] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [raisedHandIds, setRaisedHandIds] = useState<Set<string>>(new Set());

  // Listen for hand raise broadcasts
  useEffect(() => {
    const ch = supabase.channel(`circle-hands-${circleId}`)
      .on('broadcast', { event: 'hand:toggle' }, ({ payload }) => {
        if (!payload) return;
        setRaisedHandIds(prev => {
          const next = new Set(prev);
          if (payload.raised) next.add(payload.participantId);
          else next.delete(payload.participantId);
          return next;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [circleId]);
  
  const spawnPositions = useMemo(() => {
    return generateSpawnPositions(Math.max(participants.length, 10), circleType);
  }, [participants.length, circleType]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);

  const [cameraX, setCameraX] = useState(0);
  const [cameraY, setCameraY] = useState(0);

  const localSpawnIdx = participants.findIndex(p => p.type === 'human' && p.userId === localUserId);
  const localSpawnPos = localSpawnIdx >= 0 ? spawnPositions[localSpawnIdx % spawnPositions.length] : { x: 0.5, y: 0.5 };
  const [localOrbPos, setLocalOrbPos] = useState<{ x: number; y: number } | null>(localSpawnPos);

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const positionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const [huddlePartnerId, setHuddlePartnerId] = useState<string | null>(null);
  const [huddleCenter, setHuddleCenter] = useState<{ x: number; y: number } | null>(null);

  const huddleStartRef = useRef<number | null>(null);
  const [showSpark, setShowSpark] = useState(false);
  const [sparkPos, setSparkPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const sparkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [flashVisible, setFlashVisible] = useState(false);

  const localParticipant = participants.find(p => p.type === 'human' && p.userId === localUserId);

  useEffect(() => {
    if (!viewportRef.current) return;
    const vw = viewportRef.current.clientWidth;
    const vh = viewportRef.current.clientHeight;
    const scale = getWorldScale(participants.length, circleType);
    const worldW = vw * scale;
    const worldH = vh * scale;
    // Center camera on the local orb spawn position
    const spawn = localOrbPos || localSpawnPos;
    const targetX = spawn.x * worldW - vw / 2;
    const targetY = spawn.y * worldH - vh / 2;
    setCameraX(Math.max(0, Math.min(targetX, worldW - vw)));
    setCameraY(Math.max(0, Math.min(targetY, worldH - vh)));
  }, [participants.length, circleType]);

  function getParticipantHue(p: Participant): number {
    if (p.type === 'human' && p.userId) return ownerHueMap[p.userId] ?? 210;
    if (p.type === 'companion' && p.ownerUserId) return ownerHueMap[p.ownerUserId] ?? 280;
    return 280;
  }

  const getWorldSize = useCallback(() => {
    if (!viewportRef.current) return { w: 1200, h: 800 };
    const scale = getWorldScale(participants.length, circleType);
    return {
      w: viewportRef.current.clientWidth * scale,
      h: viewportRef.current.clientHeight * scale,
    };
  }, [participants.length, circleType]);

  const getViewportSize = useCallback(() => {
    if (!viewportRef.current) return { w: 400, h: 300 };
    return { w: viewportRef.current.clientWidth, h: viewportRef.current.clientHeight };
  }, []);

  const clampCamera = useCallback((x: number, y: number) => {
    const world = getWorldSize();
    const vp = getViewportSize();
    return {
      x: Math.max(0, Math.min(x, world.w - vp.w)),
      y: Math.max(0, Math.min(y, world.h - vp.h)),
    };
  }, [getWorldSize, getViewportSize]);

  const cameraRef = useRef({ x: 0, y: 0 });
  useEffect(() => { cameraRef.current = { x: cameraX, y: cameraY }; }, [cameraX, cameraY]);
  const localOrbRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { localOrbRef.current = localOrbPos; }, [localOrbPos]);

  const JOYSTICK_SPEED: Record<string, number> = {
    kids: 0.014,
    fireside: 0.005,
    hangout: 0.007,
    focus: 0.006,
    default: 0.007,
  };

  const handleJoystickMove = useCallback((dx: number, dy: number) => {
    const world = getWorldSize();
    const vp = getViewportSize();
    const currentPos = localOrbRef.current || localSpawnPos;
    const orbSpeed = JOYSTICK_SPEED[circleType] ?? JOYSTICK_SPEED.default;
    const newX = Math.max(0.03, Math.min(0.97, currentPos.x + dx * orbSpeed));
    const newY = Math.max(0.03, Math.min(0.97, currentPos.y + dy * orbSpeed));
    setLocalOrbPos({ x: newX, y: newY });

    const targetCamX = newX * world.w - vp.w / 2;
    const targetCamY = newY * world.h - vp.h / 2;
    const clamped = clampCamera(targetCamX, targetCamY);
    const camLerp = 0.15;
    const cur = cameraRef.current;
    setCameraX(cur.x + (clamped.x - cur.x) * camLerp);
    setCameraY(cur.y + (clamped.y - cur.y) * camLerp);

    if (localParticipant) {
      positionsRef.current[localParticipant.id] = { x: newX, y: newY };
    }

    if (raceActive && raceTargetZone && onZoneReached && circleType === 'kids') {
      const targetZone = KIDS_ZONES.find(z => z.id === raceTargetZone);
      if (targetZone) {
        const dist = Math.sqrt((newX - targetZone.fx) ** 2 + (newY - targetZone.fy) ** 2);
        if (dist < ZONE_HIT_RADIUS) {
          onZoneReached(raceTargetZone);
        }
      }
    }
  }, [clampCamera, getWorldSize, getViewportSize, localSpawnPos, localParticipant, raceActive, raceTargetZone, onZoneReached, circleType]);

  const handleMinimapNavigate = useCallback((worldFracX: number, worldFracY: number) => {
    const world = getWorldSize();
    const vp = getViewportSize();
    const targetX = worldFracX * world.w - vp.w / 2;
    const targetY = worldFracY * world.h - vp.h / 2;
    const clamped = clampCamera(targetX, targetY);
    setCameraX(clamped.x);
    setCameraY(clamped.y);
  }, [getWorldSize, getViewportSize, clampCamera]);

  const audienceParticipants = useMemo(() => {
    if (!isPresenting || !presenterId) return [];
    return participants.filter(p => p.id !== presenterId);
  }, [isPresenting, presenterId, participants]);

  const pewsPositions = useMemo(() => computePewsPositions(audienceParticipants.length), [audienceParticipants.length]);

  const presentationPositionMap = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    if (!isPresenting || !presenterId) return map;
    map[presenterId] = PRESENTER_POS;
    audienceParticipants.forEach((p, i) => {
      map[p.id] = pewsPositions[i] || spawnPositions[i % spawnPositions.length];
    });
    return map;
  }, [isPresenting, presenterId, audienceParticipants, pewsPositions]);

  const minimapParticipants: MinimapParticipant[] = useMemo(() => {
    return participants.map((p, i) => {
      const tracked = positionsRef.current[p.id];
      const isLocal = p.type === 'human' && p.userId === localUserId;
      const pos = tracked
        ? tracked
        : isPresenting && presentationPositionMap[p.id]
          ? presentationPositionMap[p.id]
          : isLocal && localOrbPos
            ? localOrbPos
            : spawnPositions[i % spawnPositions.length];
      const isCompanionSpeaking = p.type === 'companion' && p.memberId === lastSpeakingCompanion;
      const isInSpeakingList = speakingParticipantIds.includes(p.id);
      return {
        id: p.id,
        x: pos.x,
        y: pos.y,
        hue: getParticipantHue(p),
        isPresenter: isPresenting && p.id === presenterId,
        isSpeaking: isCompanionSpeaking || isInSpeakingList,
      };
    });
  }, [participants, isPresenting, presentationPositionMap, presenterId, lastSpeakingCompanion, speakingParticipantIds, localOrbPos]);

  const viewportFrac = useMemo(() => {
    const world = getWorldSize();
    const vp = getViewportSize();
    return {
      pos: { x: (cameraX + vp.w / 2) / world.w, y: (cameraY + vp.h / 2) / world.h },
      size: { w: vp.w / world.w, h: vp.h / world.h },
    };
  }, [cameraX, cameraY, getWorldSize, getViewportSize]);

  useEffect(() => {
    participants.forEach((p, i) => {
      if (!positionsRef.current[p.id]) {
        const pos = spawnPositions[i % spawnPositions.length];
        positionsRef.current[p.id] = { x: pos.x, y: pos.y };
      }
    });
  }, [participants]);

  const checkHuddle = useCallback(() => {
    if (!localParticipant) return;
    const localPos = positionsRef.current[localParticipant.id];
    if (!localPos) return;

    let closest: { id: string; dist: number } | null = null;
    for (const p of participants) {
      if (p.id === localParticipant.id) continue;
      const pPos = positionsRef.current[p.id];
      if (!pPos) continue;
      const dist = Math.sqrt((localPos.x - pPos.x) ** 2 + (localPos.y - pPos.y) ** 2);
      if (!closest || dist < closest.dist) closest = { id: p.id, dist };
    }

    if (!closest) return;

    if (huddlePartnerId) {
      if (closest.id !== huddlePartnerId || closest.dist > HUDDLE_EXIT_DIST) {
        setHuddlePartnerId(null);
        setHuddleCenter(null);
        setShowSpark(false);
        huddleStartRef.current = null;
        if (sparkTimerRef.current) clearTimeout(sparkTimerRef.current);
      } else {
        const partnerPos = positionsRef.current[huddlePartnerId];
        if (partnerPos) {
          setHuddleCenter({
            x: (localPos.x + partnerPos.x) / 2,
            y: (localPos.y + partnerPos.y) / 2,
          });
        }
      }
    } else {
      if (closest.dist < HUDDLE_ENTER_DIST) {
        setHuddlePartnerId(closest.id);
        try { navigator.vibrate?.(20); } catch {}
        const partnerPos = positionsRef.current[closest.id];
        if (partnerPos) {
          const cx = (localPos.x + partnerPos.x) / 2;
          const cy = (localPos.y + partnerPos.y) / 2;
          setHuddleCenter({ x: cx, y: cy });
          setSparkPos({ x: cx, y: cy });
        }
        huddleStartRef.current = Date.now();
        sparkTimerRef.current = setTimeout(() => {
          setShowSpark(true);
          try { navigator.vibrate?.([10, 50, 10]); } catch {}
        }, SPARK_DELAY_MS);
      }
    }
  }, [localParticipant, participants, huddlePartnerId]);

  useEffect(() => {
    if (!showSpark || !huddlePartnerId || !localParticipant) return;
    const localPos = positionsRef.current[localParticipant.id];
    const partnerPos = positionsRef.current[huddlePartnerId];
    if (!localPos || !partnerPos) return;

    const d1 = Math.sqrt((localPos.x - sparkPos.x) ** 2 + (localPos.y - sparkPos.y) ** 2);
    const d2 = Math.sqrt((partnerPos.x - sparkPos.x) ** 2 + (partnerPos.y - sparkPos.y) ** 2);

    if (d1 < CRUSH_DIST && d2 < CRUSH_DIST) {
      setFlashVisible(true);
      try { navigator.vibrate?.([20, 30, 40]); } catch {}
      setTimeout(() => {
        setFlashVisible(false);
        setShowSpark(false);
      }, 300);
    }
  }, [sparkPos, showSpark, huddlePartnerId, localParticipant]);

  const handleDrag = useCallback((participantId: string, element: HTMLElement) => {
    if (!worldRef.current) return;
    const containerRect = worldRef.current.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const x = rect.left - containerRect.left + rect.width / 2;
    const y = rect.top - containerRect.top + rect.height / 2;
    const fracX = containerRect.width > 0 ? x / containerRect.width : 0.5;
    const fracY = containerRect.height > 0 ? y / containerRect.height : 0.5;
    positionsRef.current[participantId] = { x: fracX, y: fracY };

    if (hasSpeedTrails) {
      const prev = velocityRef.current[participantId];
      if (prev) {
        const vx = x - prev.lastX;
        const vy = y - prev.lastY;
        const speed = Math.sqrt(vx * vx + vy * vy);
        prev.vx = vx;
        prev.vy = vy;
        prev.lastX = x;
        prev.lastY = y;
        if (speed > 3) {
          prev.trail.push({ x, y, age: 0 });
          if (prev.trail.length > 12) prev.trail.shift();
        }
      } else {
        velocityRef.current[participantId] = { vx: 0, vy: 0, lastX: x, lastY: y, trail: [] };
      }
    }

    if (localParticipant && participantId === localParticipant.id) {
      setDragOffset({ x: x - containerRect.width / 2, y: y - containerRect.height / 2 });

      setLocalOrbPos({ x: fracX, y: fracY });

      // Soft-follow camera: always track the local orb during drag
      if (!cinemaMode) {
        const world = getWorldSize();
        const vp = getViewportSize();
        const targetCamX = fracX * world.w - vp.w / 2;
        const targetCamY = fracY * world.h - vp.h / 2;
        const clamped = clampCamera(targetCamX, targetCamY);
        const camLerp = 0.12;
        const cur = cameraRef.current;
        setCameraX(cur.x + (clamped.x - cur.x) * camLerp);
        setCameraY(cur.y + (clamped.y - cur.y) * camLerp);
      }
    }
    checkHuddle();
  }, [localParticipant, checkHuddle, hasSpeedTrails, cinemaMode, clampCamera, getWorldSize, getViewportSize]);

  const isSpeaker = localParticipant?.id === presenterId;

  return (
    <div ref={viewportRef} className="relative w-full h-full overflow-hidden" style={{ touchAction: 'none' }}>
      <motion.div
        ref={worldRef}
        className="absolute"
        animate={{
          width: `${getWorldScale(participants.length, circleType) * 100}%`,
          height: `${getWorldScale(participants.length, circleType) * 100}%`,
          x: -cameraX,
          y: -cameraY,
        }}
        transition={{ type: 'spring', stiffness: 60, damping: 22 }}
      >
        <div className="absolute inset-0 transition-all duration-1000 pointer-events-none" style={{ background: atmosphereGradient }} />
        <div className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 35%, hsl(0 0% 100% / 0.04) 0%, transparent 50%), radial-gradient(circle at 75% 55%, hsl(0 0% 100% / 0.03) 0%, transparent 40%)',
          }}
        />

        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
          <FireflyLayer dragOffset={dragOffset} amplitude={localAmplitude} huddleCenter={huddleCenter} />
        </div>

        <AnimatePresence>
          {isPresenting && slides.length > 0 && !cinemaMode && !isSocialMode && (
            <PresentationSurface
              isSpeaker={!!isSpeaker}
              slides={slides}
              currentSlide={currentSlide}
              onSlideChange={onSlideChange || (() => {})}
              onStopPresenting={isSpeaker ? onStopPresenting : undefined}
              containerRef={worldRef as React.RefObject<HTMLDivElement>}
              mode={presentationMode}
              onEnterCinema={() => setCinemaMode(true)}
            />
          )}
        </AnimatePresence>

        {isKidsMode && (
          <>
            {KIDS_ZONES.map((zone) => {
              const isTarget = raceActive && raceTargetZone === zone.id;
              const isDimmed = raceActive && raceTargetZone && raceTargetZone !== zone.id;
              return (
                <motion.div
                  key={zone.id}
                  className="absolute flex flex-col items-center justify-center pointer-events-none"
                  style={{
                    width: isTarget ? 160 : 140,
                    height: isTarget ? 100 : 90,
                    left: `${zone.fx * 100}%`,
                    top: `${zone.fy * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    background: isTarget ? zone.activeBg : zone.bg,
                    border: isTarget ? `3px solid ${zone.activeBorder}` : `2px dashed ${zone.border}`,
                    borderRadius: 16,
                    zIndex: isTarget ? 4 : 2,
                    opacity: isDimmed ? 0.3 : 1,
                    boxShadow: isTarget ? `0 0 24px 8px ${zone.activeBorder}` : undefined,
                    transition: 'opacity 0.3s, box-shadow 0.3s, width 0.3s, height 0.3s',
                  }}
                  animate={isTarget ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                  transition={isTarget ? { repeat: Infinity, duration: 1.5, ease: 'easeInOut' } : { duration: 0.3 }}
                >
                  <motion.span
                    style={{ fontSize: isTarget ? 30 : 24 }}
                    animate={isTarget ? { rotate: [-8, 8, -8] } : { rotate: 0 }}
                    transition={isTarget ? { repeat: Infinity, duration: 0.8, ease: 'easeInOut' } : {}}
                  >
                    {zone.emoji}
                  </motion.span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: 500 }}>
                    {zone.id}
                  </span>
                  {isTarget && (
                    <motion.span
                      style={{ fontSize: 9, color: 'hsl(38 90% 65%)', marginTop: 2, fontWeight: 700 }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                    >
                      ← Race here!
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </>
        )}

        {isSocialMode && vibeHubNode}

        <AnimatePresence>
          {huddlePartnerId && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: 5, background: 'hsl(0 0% 0% / 0.35)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {huddleCenter && huddlePartnerId && (
            <motion.div
              className="absolute pointer-events-none rounded-full"
              style={{
                left: huddleCenter.x,
                top: huddleCenter.y,
                x: '-50%',
                y: '-50%',
                width: 200,
                height: 200,
                background: `radial-gradient(circle, hsla(${getParticipantHue(participants.find(p => p.id === huddlePartnerId)!)}, 50%, 50%, 0.15) 0%, transparent 70%)`,
                zIndex: 55,
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.6 }}
            />
          )}
        </AnimatePresence>

        {participants.map((p, i) => {
          const isLocal = p.type === 'human' && p.userId === localUserId;
          const worldPos = isPresenting && presentationPositionMap[p.id]
            ? presentationPositionMap[p.id]
            : isLocal && localOrbPos
              ? localOrbPos
              : spawnPositions[i % spawnPositions.length];

          const isCompanionSpeaking = p.type === 'companion' && p.memberId === lastSpeakingCompanion;
          const isInSpeakingList = speakingParticipantIds.includes(p.id);
          const isSpeaking = isCompanionSpeaking || isInSpeakingList;
          const snippet = latestSnippets.find(s => s.participantId === p.id);
          const delay = FLOAT_DELAYS[i % FLOAT_DELAYS.length];

          const hasLocalVideo = isLocal && !!localStream;
          const remoteStream = !isLocal && p.type === 'human' && p.userId ? remoteStreams.get(p.userId) : undefined;
          const hasRemoteVideo = !!remoteStream;

          const hue = getParticipantHue(p);
          const isZoomed = zoomedId === p.id;
          const isPresenter = isPresenting && p.id === presenterId;

          const isInHuddle = huddlePartnerId && (p.id === localParticipant?.id || p.id === huddlePartnerId);

          const isLocalSpeaking = p.type === 'human' && p.userId === localUserId && isInSpeakingList;
          const amp = isLocalSpeaking ? localAmplitude : (isSpeaking ? 0.6 : 0);
          const glowSpread = 10 + amp * 20;
          const glowOpacity = 0.2 + amp * 0.4;
          const isCompanion = p.type === 'companion';
          const isThinking = isCompanion && thinkingCompanionIds.includes(p.memberId || '');
          const hasHandRaised = (isLocal && handRaised) || raisedHandIds.has(p.id);

          const borderColor = isCompanion && !isSpeaking && !isPresenter
            ? `hsl(var(--accent) / 0.6)`
            : `hsl(${hue} 60% 55% / ${isSpeaking ? 0.7 + amp * 0.3 : 0.5})`;
          const glowColor = `hsl(${hue} 60% 50% / ${glowOpacity})`;

          const baseSize = isPresenter ? 96 : (hasLocalVideo || hasRemoteVideo) ? 88 : isSpeaking ? 80 : 64;
          const displayScale = isPresenter ? 2 : isZoomed ? 1.75 : 1;

          const posLeft = `${worldPos.x * 100}%`;
          const posTop = `${worldPos.y * 100}%`;

          return (
            <motion.div
              key={p.id}
              className="absolute flex flex-col items-center cursor-grab active:cursor-grabbing touch-none"
              style={{ left: posLeft, top: posTop, x: '-50%', y: '-50%', zIndex: isInHuddle ? 60 : isZoomed ? 55 : 50 }}
              drag={!isPresenting || isPresenter}
              dragConstraints={worldRef}
              dragElastic={physics.dragElastic}
              dragMomentum={physics.dragMomentum}
              dragTransition={{ bounceStiffness: physics.bounceStiffness, bounceDamping: physics.bounceDamping }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: 1,
                scale: displayScale,
                left: posLeft,
                top: posTop,
              }}
              transition={{
                scale: { type: 'spring', stiffness: 300, damping: 25 },
                opacity: { duration: 0.4 },
                left: { type: 'spring', stiffness: 120, damping: 20 },
                top: { type: 'spring', stiffness: 120, damping: 20 },
              }}
              onTap={() => setZoomedId(prev => prev === p.id ? null : p.id)}
              whileDrag={{ scale: displayScale * 1.08 }}
              onDrag={(event) => {
                const el = (event as any).currentTarget as HTMLElement;
                if (el) handleDrag(p.id, el);
              }}
            >
              <motion.div
                className={`relative spatial-orb rounded-full ${isSpeaking ? 'spatial-orb-speaking' : ''}`}
                style={{
                  width: baseSize,
                  height: baseSize,
                  animationDelay: `${delay}s`,
                  border: isPresenter
                    ? `3px solid hsl(${hue} 70% 60% / 0.9)`
                    : `2px solid ${borderColor}`,
                  boxShadow: isPresenter
                    ? `0 0 24px 10px hsl(${hue} 60% 50% / 0.4), 0 0 48px 20px hsl(${hue} 60% 50% / 0.15)`
                    : isCompanion && !isSpeaking
                      ? `0 0 10px 3px hsl(var(--accent) / 0.2), 0 0 4px 1px hsl(var(--accent) / 0.1)`
                      : isSpeaking
                        ? `0 0 ${glowSpread}px ${glowSpread / 2}px ${glowColor}, 0 0 ${glowSpread * 2}px ${glowSpread}px ${glowColor}`
                        : `0 0 10px 2px hsl(${hue} 60% 50% / 0.35)`,
                  transition: 'box-shadow 0.15s ease-out, border-color 0.15s ease-out',
                }}
                animate={{
                  y: [0, -physics.floatAmplitude, physics.floatAmplitude * 0.5, 0],
                  scale: isThinking
                    ? [1, 1.06, 1]
                    : isSpeaking
                      ? [1, 1.04, 1]
                      : 1,
                  opacity: isThinking ? [1, 0.7, 1] : 1,
                }}
                transition={{
                  y: { repeat: Infinity, duration: physics.floatDuration, delay, ease: 'easeInOut' },
                  scale: isThinking
                    ? { repeat: Infinity, duration: 1.5, ease: 'easeInOut' }
                    : isSpeaking
                      ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut', type: 'spring', stiffness: 300, damping: 30 }
                      : { type: 'spring', stiffness: 300, damping: 30 },
                  opacity: isThinking ? { repeat: Infinity, duration: 1.5, ease: 'easeInOut' } : {},
                }}
              >
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  {hasLocalVideo && localStream ? (
                    <LiveVideoOrb stream={localStream} isLocal={true} />
                  ) : hasRemoteVideo && remoteStream ? (
                    <LiveVideoOrb stream={remoteStream} isLocal={false} />
                  ) : p.avatar ? (
                    <img src={p.avatar} referrerPolicy="no-referrer" alt="" className="absolute inset-0 h-full w-full object-cover rounded-full" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-lg font-bold text-white/90"
                      style={{
                        background: `linear-gradient(135deg, hsl(${hue} 50% 35%), hsl(${(hue + 40) % 360} 45% 45%))`,
                      }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {p.type === 'companion' && (
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent/30 border border-accent/40 backdrop-blur-sm z-10">
                    <Sparkles className="h-2.5 w-2.5 text-accent" />
                  </div>
                )}

                {p.type === 'human' && (
                  <div className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full ring-2 ring-background z-10 transition-colors ${isSpeaking ? 'bg-primary' : 'bg-emerald-500'}`} />
                )}

                {isSpeaking && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="animate-wave-orbit absolute top-1/2 left-1/2 h-2 w-2 rounded-full" style={{ backgroundColor: `hsl(${hue} 60% 55% / 0.6)` }} />
                    <div className="animate-wave-orbit absolute top-1/2 left-1/2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: `hsl(${hue} 60% 55% / 0.4)`, animationDelay: '1s' }} />
                  </div>
                )}

                {hasHandRaised && (
                  <motion.div
                    className="absolute -top-2 -left-1 z-20"
                    animate={{ y: [0, -4, 0], rotate: [-8, 8, -8] }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/30 border border-primary/50 backdrop-blur-sm shadow-[0_0_12px_3px_hsl(var(--primary)/0.3)]">
                      <Hand className="h-3 w-3 text-primary" />
                    </div>
                  </motion.div>
                )}
              </motion.div>

              <span className="mt-1.5 text-[10px] font-medium text-foreground/70 drop-shadow-md max-w-[72px] truncate text-center pointer-events-none">
                {p.name}
                {isPresenter && <span className="block text-[8px] text-primary/80 font-semibold">Presenting</span>}
              </span>

              {snippet ? (
                <motion.div
                  key={snippet.ts}
                  className={`absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 rounded-xl glass-card text-center pointer-events-none ${
                    isPresenter ? 'max-w-[200px]' : 'max-w-[140px]'
                  }`}
                  initial={{ opacity: 0, y: 8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                >
                  <p className={`leading-tight line-clamp-2 ${
                    isPresenter ? 'text-[12px] text-foreground font-medium' : 'text-[10px] text-foreground/90'
                  }`}>{snippet.text}</p>
                </motion.div>
              ) : null}
            </motion.div>
          );
        })}

        <AnimatePresence>
          {showSpark && huddleCenter && (
            <MemorySpark
              position={sparkPos}
              amplitude={localAmplitude}
              containerRef={worldRef as React.RefObject<HTMLDivElement>}
              onPositionUpdate={setSparkPos}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {flashVisible && (
            <motion.div
              className="absolute inset-0 bg-white z-50 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      <SpatialMinimap
        participants={minimapParticipants}
        isPresenting={isPresenting}
        presentationRect={isPresenting ? { x: 0.5, y: 0.3, w: 0.35, h: 0.2 } : undefined}
        viewportPos={viewportFrac.pos}
        viewportSize={viewportFrac.size}
        onNavigateTo={handleMinimapNavigate}
      />

      {!cinemaMode && <VirtualJoystick onMove={handleJoystickMove} />}

      {!cinemaMode && physics.showHandRaise && (
        <motion.button
          className={`absolute bottom-36 right-4 z-40 flex items-center gap-2 rounded-full px-4 py-2.5 glass-card border text-sm font-medium transition-all ${
            handRaised
              ? 'border-primary/60 bg-primary/15 text-primary shadow-[0_0_20px_4px_hsl(var(--primary)/0.25)]'
              : 'border-border/50 text-foreground'
          }`}
          whileTap={{ scale: 0.92 }}
          animate={handRaised ? { scale: [1, 1.06, 1] } : { scale: 1 }}
          transition={handRaised ? { repeat: Infinity, duration: 1.8, ease: 'easeInOut' } : {}}
          onClick={() => {
            const next = !handRaised;
            setHandRaised(next);
            try { navigator.vibrate?.(next ? [15, 30, 15] : 10); } catch {}
            // Broadcast hand raise to others
            supabase.channel(`circle-hands-${circleId}`).send({
              type: 'broadcast',
              event: 'hand:toggle',
              payload: { participantId: localParticipantId, raised: next, name: userName },
            });
          }}
        >
          <Hand className={`h-4 w-4 ${handRaised ? 'text-primary' : ''}`} />
          <span>{handRaised ? 'Lower Hand' : 'Raise Hand'}</span>
        </motion.button>
      )}

      {!cinemaMode && physics.showReactionBurst && (
        <motion.button
          className="absolute bottom-36 right-4 z-40 flex items-center gap-2 rounded-full px-4 py-2.5 glass-card border border-border/50 text-sm font-medium text-foreground"
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            try { navigator.vibrate?.([10, 30, 10]); } catch {}
            const emojis = ['🔥', '💜', '⚡', '🎉', '✨', '🚀'];
            const emoji = emojis[Math.floor(Math.random() * emojis.length)];
            const container = document.querySelector('[data-spatial-room]');
            if (container) {
              for (let i = 0; i < 8; i++) {
                const el = document.createElement('div');
                el.textContent = emoji;
                el.style.cssText = `position:fixed;z-index:100;font-size:24px;pointer-events:none;left:${30 + Math.random() * 40}%;bottom:20%;opacity:1;transition:all 1.5s ease-out;`;
                container.appendChild(el);
                requestAnimationFrame(() => {
                  el.style.transform = `translateY(-${100 + Math.random() * 200}px) translateX(${(Math.random() - 0.5) * 120}px) scale(${0.5 + Math.random()})`;
                  el.style.opacity = '0';
                });
                setTimeout(() => el.remove(), 1600);
              }
            }
          }}
        >
          <Zap className="h-4 w-4 text-pink-400" />
          <span>React!</span>
        </motion.button>
      )}

      <AnimatePresence>
        {cinemaMode && isPresenting && slides.length > 0 && (
          <CinemaMode
            slides={slides}
            currentSlide={currentSlide}
            onSlideChange={onSlideChange || (() => {})}
            mode={presentationMode}
            isSpeaker={!!isSpeaker}
            participants={participants.map((p, i) => ({
              id: p.id,
              name: p.name,
              avatar: p.avatar,
              type: p.type,
              hue: getParticipantHue(p),
              isSpeaking: speakingParticipantIds.includes(p.id) || (p.type === 'companion' && p.memberId === lastSpeakingCompanion),
            }))}
            snippets={latestSnippets}
            onExit={() => setCinemaMode(false)}
            onStopPresenting={isSpeaker ? onStopPresenting : undefined}
            atmosphereGradient={atmosphereGradient}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
