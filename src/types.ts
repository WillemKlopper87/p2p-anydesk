export type AppMode = 'landing' | 'host' | 'client';

export type ConnectionState = 'idle' | 'waiting' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface SignalingData {
  type: 'offer' | 'answer' | 'ice-candidate';
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

export interface RemoteInput {
  channel: 'input';
  type: 'mousemove' | 'mousedown' | 'mouseup' | 'click' | 'dblclick' | 'keydown' | 'keyup' | 'wheel';
  x: number;
  y: number;
  button?: number;
  key?: string;
  code?: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  deltaX?: number;
  deltaY?: number;
  buttons?: number;
}

export interface ChatMessageData {
  channel: 'chat';
  text: string;
  timestamp: number;
}

export type DataChannelMessage = RemoteInput | ChatMessageData;
