import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { ConnectionState, RemoteInput } from '../types';

interface ChatMessage {
  from: 'local' | 'remote';
  text: string;
  time: string;
}

interface ClientSessionProps {
  onBack: () => void;
}

export default function ClientSession({ onBack }: ClientSessionProps) {
  const [step, setStep] = useState<'idle' | 'offer-entered' | 'connecting' | 'connected'>('idle');
  const [offerInput, setOfferInput] = useState('');
  const [answerCode, setAnswerCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [controlEnabled, setControlEnabled] = useState(true);
  const [showCursor, setShowCursor] = useState(true);
  const [cursorPos, setCursorPos] = useState({ x: 0.5, y: 0.5 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleRemoteStream = useCallback((stream: MediaStream) => {
    remoteStreamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, []);

  const { connectionState, acceptOffer, sendInput, sendChat, disconnect } = useWebRTC({
    onRemoteStream: handleRemoteStream,
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
      if (state === 'connecting') {
        setStep('connecting');
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
    if (videoRef.current && remoteStreamRef.current) {
      videoRef.current.srcObject = remoteStreamRef.current;
    }
  }, [step]);

  const handleConnect = async () => {
    try {
      const answer = await acceptOffer(offerInput.trim());
      setAnswerCode(answer);
      setStep('offer-entered');
    } catch (err) {
      console.error('Failed to connect:', err);
    }
  };

  const handleCopyAnswer = () => {
    navigator.clipboard.writeText(answerCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    disconnect();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    remoteStreamRef.current = null;
    setStep('idle');
    setOfferInput('');
    setAnswerCode('');
  };

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
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

  // Handle mouse/keyboard input for remote control
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!controlEnabled || step !== 'connected' || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setCursorPos({ x, y });
    sendInput({ channel: 'input', type: 'mousemove', x, y });
  }, [controlEnabled, step, sendInput]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!controlEnabled || step !== 'connected' || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    sendInput({ channel: 'input', type: 'mousedown', x, y, button: e.button });
  }, [controlEnabled, step, sendInput]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!controlEnabled || step !== 'connected' || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    sendInput({ channel: 'input', type: 'mouseup', x, y, button: e.button });
    
    if (e.detail === 1) {
      sendInput({ channel: 'input', type: 'click', x, y, button: e.button });
    } else if (e.detail === 2) {
      sendInput({ channel: 'input', type: 'dblclick', x, y, button: e.button });
    }
  }, [controlEnabled, step, sendInput]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!controlEnabled || step !== 'connected' || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    sendInput({ channel: 'input', type: 'wheel', x, y, deltaX: e.deltaX, deltaY: e.deltaY });
  }, [controlEnabled, step, sendInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!controlEnabled || step !== 'connected') return;
    e.preventDefault();
    sendInput({
      channel: 'input',
      type: 'keydown',
      x: cursorPos.x,
      y: cursorPos.y,
      key: e.key,
      code: e.code,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
    });
  }, [controlEnabled, step, cursorPos, sendInput]);

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (!controlEnabled || step !== 'connected') return;
    e.preventDefault();
    sendInput({
      channel: 'input',
      type: 'keyup',
      x: cursorPos.x,
      y: cursorPos.y,
      key: e.key,
      code: e.code,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
    });
  }, [controlEnabled, step, cursorPos, sendInput]);

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
              <h1 className="text-xl font-semibold text-white">Remote Control</h1>
              <p className="text-sm text-slate-400">Connect to a remote desktop</p>
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
          {/* Remote Screen */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">Remote Screen</span>
                {step === 'connected' && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setControlEnabled(!controlEnabled)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                        controlEnabled 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                      }`}
                    >
                      {controlEnabled ? '🖱️ Control ON' : '🖱️ Control OFF'}
                    </button>
                    <button
                      onClick={() => setShowCursor(!showCursor)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                        showCursor 
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                          : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                      }`}
                    >
                      {showCursor ? '👁 Cursor' : '👁 No Cursor'}
                    </button>
                    <button
                      onClick={toggleFullscreen}
                      className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-600/50 transition-colors"
                    >
                      {isFullscreen ? '⊡ Exit Fullscreen' : '⊞ Fullscreen'}
                    </button>
                  </div>
                )}
              </div>
              <div
                ref={containerRef}
                className="aspect-video bg-slate-900/50 relative overflow-hidden"
                tabIndex={0}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
              >
                {step === 'connected' ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                    {/* Remote cursor overlay */}
                    {showCursor && (
                      <div
                        className="absolute pointer-events-none z-20 transition-all duration-75"
                        style={{
                          left: `${cursorPos.x * 100}%`,
                          top: `${cursorPos.y * 100}%`,
                          transform: 'translate(-2px, -2px)',
                        }}
                      >
                        <svg className="w-5 h-5 text-white drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M4 0l16 12.274-7.735 1.632L17.81 24l-3.905 1.268L8.55 15.176 4 20.182V0z" />
                        </svg>
                      </div>
                    )}
                    {/* Control status overlay */}
                    {!controlEnabled && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-30">
                        <div className="bg-slate-800/90 px-4 py-2 rounded-lg text-sm text-slate-300">
                          Remote control disabled
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-16 h-16 text-slate-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                      <p className="text-slate-500 text-sm">
                        {step === 'idle' ? 'Enter connection code to connect' :
                         step === 'offer-entered' ? 'Send response code back to host' :
                         'Establishing connection...'}
                      </p>
                    </div>
                  </div>
                )}
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
                    step !== 'idle' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>1</div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-300">Enter host's connection code</p>
                    {step === 'idle' && (
                      <div className="mt-2">
                        <textarea
                          value={offerInput}
                          onChange={(e) => setOfferInput(e.target.value)}
                          placeholder="Paste the host's code here..."
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-xs text-slate-300 placeholder-slate-500 resize-none h-16 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={handleConnect}
                          disabled={!offerInput.trim()}
                          className="mt-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Connect
                        </button>
                      </div>
                    )}
                    {step !== 'idle' && (
                      <p className="text-xs text-green-400 mt-1">✓ Code accepted</p>
                    )}
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    step === 'offer-entered' || step === 'connected' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>2</div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-300">Send response code to host</p>
                    {answerCode && (
                      <div className="mt-2">
                        <div className="bg-slate-900/50 rounded-lg p-2 max-h-20 overflow-auto">
                          <code className="text-xs text-emerald-300 break-all">{answerCode.slice(0, 80)}...</code>
                        </div>
                        <button
                          onClick={handleCopyAnswer}
                          className="mt-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          {copied ? '✓ Copied!' : 'Copy Response Code'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    step === 'connected' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>3</div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-300">Control remote desktop</p>
                    {step === 'connected' && (
                      <p className="text-xs text-green-400 mt-1">✓ Connected & controlling</p>
                    )}
                    {step === 'connecting' && (
                      <p className="text-xs text-yellow-400 mt-1">⏳ Waiting for host...</p>
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
                Disconnect
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
                      <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
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
                                ? 'bg-emerald-500/20 text-emerald-200' 
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.stopPropagation();
                            handleSendChat();
                          }
                        }}
                        placeholder="Type a message..."
                        className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={handleSendChat}
                        disabled={!chatInput.trim()}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-slate-400 mb-2">Tips</h3>
              <ul className="text-xs text-slate-500 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">•</span>
                  Click the remote screen area to focus it for keyboard input
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">•</span>
                  Toggle control on/off to prevent accidental inputs
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">•</span>
                  Use scroll wheel to scroll on the remote machine
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">•</span>
                  Both users must be on the same network for best performance
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
