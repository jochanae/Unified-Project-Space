import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface UseSpatialWebRTCParams {
  circleId: string | undefined;
  userId: string | undefined;
  userName: string;
  enabled?: boolean;
}

const FALLBACK_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

async function fetchTurnCredentials(): Promise<RTCConfiguration> {
  try {
    const { data, error } = await supabase.functions.invoke('turn-credentials');
    if (error || !data?.iceServers?.length) {
      logger.warn('[useSpatialWebRTC] TURN fetch failed, using STUN fallback', error);
      return FALLBACK_RTC_CONFIG;
    }
    logger.log('[useSpatialWebRTC] Got TURN credentials, servers:', data.iceServers.length);
    return { iceServers: data.iceServers };
  } catch (err) {
    logger.warn('[useSpatialWebRTC] TURN fetch error, using STUN fallback', err);
    return FALLBACK_RTC_CONFIG;
  }
}

export function useSpatialWebRTC({
  circleId,
  userId,
  userName,
  enabled = true,
}: UseSpatialWebRTCParams) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(new Set());

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const makingOfferRef = useRef<Set<string>>(new Set());
  const ignoreOfferRef = useRef<Set<string>>(new Set());
  const rtcConfigRef = useRef<RTCConfiguration>(FALLBACK_RTC_CONFIG);

  const updateRemoteStreams = useCallback((peerId: string, stream: MediaStream) => {
    setRemoteStreams(prev => {
      const next = new Map(prev);
      next.set(peerId, stream);
      return next;
    });
  }, []);

  const removeRemoteStream = useCallback((peerId: string) => {
    setRemoteStreams(prev => {
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  const createPeerConnection = useCallback(
    (peerId: string): RTCPeerConnection => {
      const existing = peerConnections.current.get(peerId);
      if (existing) {
        existing.close();
      }

      const pc = new RTCPeerConnection(rtcConfigRef.current);
      peerConnections.current.set(peerId, pc);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) {
          updateRemoteStreams(peerId, stream);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: {
              senderId: userId,
              targetId: peerId,
              candidate: event.candidate.toJSON(),
            },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setConnectedPeers(prev => {
            const next = new Set(prev);
            next.add(peerId);
            return next;
          });
        } else if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          setConnectedPeers(prev => {
            const next = new Set(prev);
            next.delete(peerId);
            return next;
          });
        }
      };

      pc.onnegotiationneeded = async () => {
        try {
          makingOfferRef.current.add(peerId);
          const offer = await pc.createOffer();
          if (pc.signalingState !== 'stable') return;
          await pc.setLocalDescription(offer);
          channelRef.current?.send({
            type: 'broadcast',
            event: 'offer',
            payload: {
              senderId: userId,
              targetId: peerId,
              sdp: pc.localDescription?.toJSON(),
            },
          });
        } catch (err) {
          console.error('[useSpatialWebRTC] negotiation error', err);
        } finally {
          makingOfferRef.current.delete(peerId);
        }
      };

      return pc;
    },
    [userId, updateRemoteStreams],
  );

  const handleOffer = useCallback(
    async (senderId: string, sdp: RTCSessionDescriptionInit) => {
      if (senderId === userId) return;

      let pc = peerConnections.current.get(senderId);
      const isPolite = userId! > senderId;
      const offerCollision =
        makingOfferRef.current.has(senderId) || (pc?.signalingState !== 'stable' && pc?.signalingState !== undefined);

      if (!isPolite && offerCollision) {
        ignoreOfferRef.current.add(senderId);
        return;
      }

      if (!pc) {
        pc = createPeerConnection(senderId);
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channelRef.current?.send({
          type: 'broadcast',
          event: 'answer',
          payload: {
            senderId: userId,
            targetId: senderId,
            sdp: pc.localDescription?.toJSON(),
          },
        });
      } catch (err) {
        console.error('[useSpatialWebRTC] handle offer error', err);
      }
    },
    [userId, createPeerConnection],
  );

  const handleAnswer = useCallback(
    async (senderId: string, sdp: RTCSessionDescriptionInit) => {
      if (senderId === userId) return;
      const pc = peerConnections.current.get(senderId);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.error('[useSpatialWebRTC] handle answer error', err);
      }
    },
    [userId],
  );

  const handleIceCandidate = useCallback(
    async (senderId: string, candidate: RTCIceCandidateInit) => {
      if (senderId === userId) return;
      const pc = peerConnections.current.get(senderId);
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        if (!ignoreOfferRef.current.has(senderId)) {
          console.error('[useSpatialWebRTC] ice candidate error', err);
        }
      }
    },
    [userId],
  );

  const handlePeerJoined = useCallback(
    (peerId: string) => {
      if (peerId === userId) return;
      if (!localStreamRef.current) return;

      const pc = createPeerConnection(peerId);
      (async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channelRef.current?.send({
            type: 'broadcast',
            event: 'offer',
            payload: {
              senderId: userId,
              targetId: peerId,
              sdp: pc.localDescription?.toJSON(),
            },
          });
        } catch (err) {
          console.error('[useSpatialWebRTC] peer joined offer error', err);
        }
      })();
    },
    [userId, createPeerConnection],
  );

  const handlePeerLeft = useCallback(
    (peerId: string) => {
      const pc = peerConnections.current.get(peerId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(peerId);
      }
      removeRemoteStream(peerId);
      setConnectedPeers(prev => {
        const next = new Set(prev);
        next.delete(peerId);
        return next;
      });
    },
    [removeRemoteStream],
  );

  const startVideo = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCameraEnabled(true);

      peerConnections.current.forEach(pc => {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      });

      channelRef.current?.send({
        type: 'broadcast',
        event: 'peer-joined',
        payload: { peerId: userId, userName },
      });
    } catch (err) {
      console.error('[useSpatialWebRTC] failed to get camera', err);
      throw err;
    }
  }, [userId, userName]);

  const stopVideo = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setCameraEnabled(false);

    peerConnections.current.forEach((pc, peerId) => {
      pc.close();
      peerConnections.current.delete(peerId);
    });

    setRemoteStreams(new Map());
    setConnectedPeers(new Set());

    channelRef.current?.send({
      type: 'broadcast',
      event: 'peer-left',
      payload: { peerId: userId },
    });
  }, [userId]);

  const toggleCamera = useCallback(() => {
    if (cameraEnabled) {
      stopVideo();
    } else {
      startVideo();
    }
  }, [cameraEnabled, startVideo, stopVideo]);

  // Fetch TURN credentials on mount
  useEffect(() => {
    if (!enabled) return;
    fetchTurnCredentials().then(config => {
      rtcConfigRef.current = config;
    });
  }, [enabled]);

  useEffect(() => {
    if (!circleId || !userId || !enabled) return;

    const channel = supabase.channel(`webrtc-spatial-${circleId}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'offer' }, ({ payload }) => {
        if (payload && payload.targetId === userId) {
          handleOffer(payload.senderId, payload.sdp);
        }
      })
      .on('broadcast', { event: 'answer' }, ({ payload }) => {
        if (payload && payload.targetId === userId) {
          handleAnswer(payload.senderId, payload.sdp);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
        if (payload && payload.targetId === userId) {
          handleIceCandidate(payload.senderId, payload.candidate);
        }
      })
      .on('broadcast', { event: 'peer-joined' }, ({ payload }) => {
        if (payload) {
          handlePeerJoined(payload.peerId);
        }
      })
      .on('broadcast', { event: 'peer-left' }, ({ payload }) => {
        if (payload) {
          handlePeerLeft(payload.peerId);
        }
      })
      .on('presence', { event: 'sync' }, () => {
        // presence sync handled externally if needed
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key) {
          handlePeerLeft(key);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId, userName });
        }
      });

    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;

      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();

      supabase.removeChannel(channel);
      channelRef.current = null;

      setLocalStream(null);
      setRemoteStreams(new Map());
      setConnectedPeers(new Set());
      setCameraEnabled(false);
    };
  }, [circleId, userId, enabled, userName, handleOffer, handleAnswer, handleIceCandidate, handlePeerJoined, handlePeerLeft]);

  return {
    localStream,
    remoteStreams,
    cameraEnabled,
    connectedPeers,
    startVideo,
    stopVideo,
    toggleCamera,
  };
}
