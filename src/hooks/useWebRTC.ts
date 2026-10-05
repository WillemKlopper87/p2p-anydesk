import { useState, useRef, useCallback, useEffect } from 'react';
import { ConnectionState, RemoteInput, ChatMessageData, DataChannelMessage } from '../types';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

interface UseWebRTCOptions {
  onRemoteStream?: (stream: MediaStream) => void;
  onRemoteInput?: (input: RemoteInput) => void;
  onChatMessage?: (message: ChatMessageData) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
}

export function useWebRTC(options: UseWebRTCOptions = {}) {
  const { onRemoteStream, onRemoteInput, onChatMessage, onConnectionStateChange } = options;
  
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [localOffer, setLocalOffer] = useState<string>('');
  const [localAnswer, setLocalAnswer] = useState<string>('');
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const updateState = useCallback((state: ConnectionState) => {
    setConnectionState(state);
    onConnectionStateChange?.(state);
  }, [onConnectionStateChange]);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    
    pc.oniceconnectionstatechange = () => {
      switch (pc.iceConnectionState) {
        case 'connected':
        case 'completed':
          updateState('connected');
          break;
        case 'disconnected':
          updateState('disconnected');
          break;
        case 'failed':
          updateState('error');
          break;
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        onRemoteStream?.(event.streams[0]);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [onRemoteStream, updateState]);

  // Create offer (Host side)
  const createOffer = useCallback(async (screenStream: MediaStream) => {
    const pc = createPeerConnection();
    localStreamRef.current = screenStream;

    // Add screen tracks
    screenStream.getTracks().forEach(track => {
      pc.addTrack(track, screenStream);
    });

    // Create data channel for input and chat
    const dc = pc.createDataChannel('control', { ordered: true });
    dc.onopen = () => console.log('Data channel opened');
    dc.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as DataChannelMessage;
        if (msg.channel === 'input') {
          onRemoteInput?.(msg as RemoteInput);
        } else if (msg.channel === 'chat') {
          onChatMessage?.(msg as ChatMessageData);
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };
    dataChannelRef.current = dc;

    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering to complete
    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
      } else {
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            resolve();
          }
        };
      }
    });

    const offerStr = btoa(JSON.stringify(pc.localDescription));
    setLocalOffer(offerStr);
    updateState('waiting');
    
    return offerStr;
  }, [createPeerConnection, onRemoteInput, updateState]);

  // Accept offer and create answer (Client side)
  const acceptOffer = useCallback(async (offerStr: string) => {
    const pc = createPeerConnection();
    
    // Set up data channel handler
    pc.ondatachannel = (event) => {
      const dc = event.channel;
      dc.onopen = () => console.log('Data channel opened (client)');
      dataChannelRef.current = dc;
    };

    const offer = JSON.parse(atob(offerStr));
    await pc.setRemoteDescription(offer);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Wait for ICE gathering
    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
      } else {
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            resolve();
          }
        };
      }
    });

    const answerStr = btoa(JSON.stringify(pc.localDescription));
    setLocalAnswer(answerStr);
    updateState('connecting');
    
    return answerStr;
  }, [createPeerConnection, updateState]);

  // Accept answer (Host side)
  const acceptAnswer = useCallback(async (answerStr: string) => {
    const pc = peerConnectionRef.current;
    if (!pc) throw new Error('No peer connection');

    const answer = JSON.parse(atob(answerStr));
    await pc.setRemoteDescription(answer);
    updateState('connecting');
  }, [updateState]);

  // Send input to remote (Client side)
  const sendInput = useCallback((input: RemoteInput) => {
    const dc = dataChannelRef.current;
    if (dc && dc.readyState === 'open') {
      dc.send(JSON.stringify(input));
    }
  }, []);

  // Send chat message (both sides)
  const sendChat = useCallback((text: string) => {
    const dc = dataChannelRef.current;
    if (dc && dc.readyState === 'open') {
      const msg: ChatMessageData = {
        channel: 'chat',
        text,
        timestamp: Date.now(),
      };
      dc.send(JSON.stringify(msg));
    }
  }, []);

  // Cleanup
  const disconnect = useCallback(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    localStreamRef.current = null;
    setLocalOffer('');
    setLocalAnswer('');
    updateState('idle');
  }, [updateState]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    connectionState,
    localOffer,
    localAnswer,
    createOffer,
    acceptOffer,
    acceptAnswer,
    sendInput,
    sendChat,
    disconnect,
    dataChannelRef,
  };
}
