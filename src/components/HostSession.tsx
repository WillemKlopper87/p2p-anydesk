import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useScreenCapture } from '../hooks/useScreenCapture';
import { useWebRTC } from '../hooks/useWebRTC';
import { ConnectionState, RemoteInput } from '../types';

interface ChatMessage {
  from: 'local' | 'remote';
  text: string;
  time: string;
}

interface HostSessionProps {
  onBack: () => void;
}

export default function HostSession({ onBack }: HostSessionProps) {
  const { isCapturing, stream, startCapture, stopCapture } = useScreenCapture();
  const [step, setStep] = useState<'idle' | 'sharing' | 'waiting-answer' | 'connected'>('idle');
  const [offerCode, setOfferCode] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [remoteInputs, setRemoteInputs] = useState<RemoteInput[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleRemoteInput = useCallback((input: RemoteInput) => {
    setRemoteInputs(prev => [...prev.slice(-50), input]);
    
    // Apply remote input to the host screen
    if (overlayRef.current) {
      const rect = overlayRef.current.getBoundingClientRect();
      const x = input.x * rect.width;
      const y = input.y * rect.height;

      switch (input.type) {
        case 'mousemove': {
          const moveEvent = new MouseEvent('mousemove', {
            clientX: rect.left + x,
            clientY: rect.top + y,
            bubbles: true,
          });
          document.elementFromPoint(rect.left + x, rect.top + y)?.dispatchEvent(moveEvent);
          break;
        }
        case 'click': {
          const clickEvent = new MouseEvent('click', {
            clientX: rect.left + x,
            clientY: rect.top + y,
            button: input.button || 0,
            bubbles: true,
          });
          document.elementFromPoint(rect.left + x, rect.top + y)?.dispatchEvent(clickEvent);
          break;
        }
        case 'mousedown': {
          const downEvent = new MouseEvent('mousedown', {
            clientX: rect.left + x,
            clientY: rect.top + y,
            button: input.button || 0,
            bubbles: true,
          });
          document.elementFromPoint(rect.left + x, rect.top + y)?.dispatchEvent(downEvent);
          break;
        }
        case 'mouseup': {
          const upEvent = new MouseEvent('mouseup', {
            clientX: rect.left + x,
            clientY: rect.top + y,
            button: input.button || 0,
            bubbles: true,
          });
          document.elementFromPoint(rect.left + x, rect.top + y)?.dispatchEvent(upEvent);
          break;
        }
        case 'keydown': {
          const keyDownEvent = new KeyboardEvent('keydown', {
            key: input.key,
            code: input.code,
            ctrlKey: input.ctrlKey,
            shiftKey: input.shiftKey,
            altKey: input.altKey,
            metaKey: input.metaKey,
            bubbles: true,
          });
          document.dispatchEvent(keyDownEvent);
          break;
        }
        case 'keyup': {
          const keyUpEvent = new KeyboardEvent('keyup', {
            key: input.key,
            code: input.code,
            ctrlKey: input.ctrlKey,
            shiftKey: input.shiftKey,
            altKey: input.altKey,
            metaKey: input.metaKey,
            bubbles: true,
          });
          document.dispatchEvent(keyUpEvent);
          break;
        }
      }
    }
  }, []);

  const { connectionState, createOffer, acceptAnswer, sendChat, disconnect } = useWebRTC({
    onRemoteInput: handleRemoteInput,
    onChatMessage: (msg) => {
      setChatMessages(prev => [...prev, {
        from: 'remote',
        text: msg.text,
        time: new Date(msg.timestamp).toLocaleTimeString(),
      }]);
    },
    onConnectionStateChange: (state) => {
      if (state === 'connected') {
        setStep('connected');
      }
    },
  });

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    sendChat(chatInput.trim());
    setChatMessages(prev => [...prev, {
      from: 'local',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString(),
    }]);
    setChatInput('');
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleStartSharing = async () => {
    try {
      const mediaStream = await startCapture();
      setStep('sharing');
      const offer = await createOffer(mediaStream);
      setOfferCode(offer);
      setStep('waiting-answer');
    } catch (err) {
      console.error('Failed to start sharing:', err);
    }
  };

  const handleAcceptAnswer = async () => {
    try {
      await acceptAnswer(answerInput.trim());
    } catch (err) {
      console.error('Failed to accept answer:', err);
    }
  };

  const handleCopyOffer = () => {
    navigator.clipboard.writeText(offerCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    const container = overlayRef.current?.parentElement;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleDisconnect = () => {
    disconnect();
    stopCapture();
    setStep('idle');
    setOfferCode('');
    setAnswerInput('');
    setRemoteInputs([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-white">Share Screen</h1>
              <p className="text-sm text-slate-400">Host a remote desktop session</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionState === 'connected' ? 'bg-green-400 animate-pulse' :
              connectionState === 'connecting' ? 'bg-yellow-400 animate-pulse' :
              'bg-slate-500'
            }`} />
            <span className="text-sm text-slate-400 capitalize">{connectionState}</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Preview */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">Screen Preview</span>
                <div className="flex items-center gap-3">
                  {isCapturing && (
                    <span className="flex items-center gap-1.5 text-xs text-red-400">
                      <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                      LIVE
                    </span>
                  )}
                  {step === 'connected' && (
                    <button
                      onClick={toggleFullscreen}
                      className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-600/50 transition-colors"
                    >
                      {isFullscreen ? '⊡ Exit Fullscreen' : '⊞ Fullscreen'}
                    </button>
                  )}
                </div>
              </div>
              <div className="aspect-video bg-slate-900/50 relative">
                {stream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-16 h-16 text-slate-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <p className="text-slate-500 text-sm">No screen being shared</p>
                    </div>
                  </div>
                )}
                {/* Invisible overlay for receiving remote inputs */}
                <div ref={overlayRef} className="absolute inset-0 z-10" />
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="space-y-4">
            {/* Connection Steps */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Connection Steps</h3>
              
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    step !== 'idle' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>1</div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-300">Start sharing your screen</p>
                    {step === 'idle' && (
                      <button
                        onClick={handleStartSharing}
                        className="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Start Sharing
                      </button>
                    )}
                    {step !== 'idle' && (
                      <p className="text-xs text-green-400 mt-1">✓ Screen is being shared</p>
                    )}
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    step === 'waiting-answer' || step === 'connected' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>2</div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-300">Send code to remote user</p>
                    {offerCode && (
                      <div className="mt-2">
                        <div className="bg-slate-900/50 rounded-lg p-2 max-h-20 overflow-auto">
                          <code className="text-xs text-blue-300 break-all">{offerCode.slice(0, 80)}...</code>
                        </div>
                        <button
                          onClick={handleCopyOffer}
                          className="mt-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          {copied ? '✓ Copied!' : 'Copy Code'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    step === 'connected' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>3</div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-300">Paste their response code</p>
                    {step === 'waiting-answer' && (
                      <div className="mt-2">
                        <textarea
                          value={answerInput}
                          onChange={(e) => setAnswerInput(e.target.value)}
                          placeholder="Paste the answer code here..."
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-xs text-slate-300 placeholder-slate-500 resize-none h-16 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          onClick={handleAcceptAnswer}
                          disabled={!answerInput.trim()}
                          className="mt-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          Connect
                        </button>
                      </div>
                    )}
                    {step === 'connected' && (
                      <p className="text-xs text-green-400 mt-1">✓ Connected!</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Disconnect */}
            {step !== 'idle' && (
              <button
                onClick={handleDisconnect}
                className="w-full px-4 py-3 bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-xl transition-colors"
              >
                End Session
              </button>
            )}

            {/* Chat Panel */}
            {step === 'connected' && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    💬 Chat
                    {chatMessages.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                        {chatMessages.length}
                      </span>
                    )}
                  </span>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform ${showChat ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showChat && (
                  <div className="border-t border-slate-700/50">
                    <div className="h-40 overflow-y-auto p-3 space-y-2">
                      {chatMessages.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center">No messages yet</p>
                      ) : (
                        chatMessages.map((msg, i) => (
                          <div key={i} className={`flex ${msg.from === 'local' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] px-3 py-1.5 rounded-lg text-xs ${
                              msg.from === 'local' 
                                ? 'bg-blue-500/20 text-blue-200' 
                                : 'bg-slate-700/50 text-slate-300'
                            }`}>
                              <p>{msg.text}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{msg.time}</p>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="p-3 border-t border-slate-700/50 flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                        placeholder="Type a message..."
                        className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={handleSendChat}
                        disabled={!chatInput.trim()}
                        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Input Log */}
            {remoteInputs.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-slate-400 mb-2">Recent Remote Inputs ({remoteInputs.length})</h3>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {remoteInputs.slice(-10).map((input, i) => (
                    <div key={i} className="text-xs text-slate-500 font-mono">
                      {input.type} ({input.x.toFixed(2)}, {input.y.toFixed(2)})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
