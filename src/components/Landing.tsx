import React from 'react';
import { AppMode } from '../types';

interface LandingProps {
  onModeSelect: (mode: AppMode) => void;
}

export default function Landing({ onModeSelect }: LandingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white">RemoteDesk</h1>
          </div>
          <p className="text-blue-200/70 text-lg max-w-2xl mx-auto">
            Secure peer-to-peer remote desktop for your local network. 
            No servers, no cloud — direct connections using WebRTC.
          </p>
        </div>

        {/* Mode Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Share Screen Card */}
          <button
            onClick={() => onModeSelect('host')}
            className="group relative bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 text-left hover:bg-slate-800/80 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mb-5 group-hover:bg-blue-500/30 transition-colors">
                <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Share My Screen</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Share your screen with a remote user. They can view and control your desktop. 
                You generate a connection code for them to connect.
              </p>
              <div className="mt-5 flex items-center gap-2 text-blue-400 text-sm font-medium">
                <span>Start Sharing</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>

          {/* Remote Control Card */}
          <button
            onClick={() => onModeSelect('client')}
            className="group relative bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 text-left hover:bg-slate-800/80 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-5 group-hover:bg-emerald-500/30 transition-colors">
                <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Remote Control</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Connect to a remote machine and control it. Enter the connection code 
                provided by the host to establish a P2P connection.
              </p>
              <div className="mt-5 flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <span>Connect Now</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-2xl mb-1">🔒</div>
            <p className="text-slate-400 text-xs">End-to-End Encrypted</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">⚡</div>
            <p className="text-slate-400 text-xs">Low Latency P2P</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">🖥️</div>
            <p className="text-slate-400 text-xs">Full Remote Control</p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-12 max-w-3xl mx-auto">
          <h3 className="text-center text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">How It Works</h3>
          <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-400 font-bold text-sm">1</span>
                </div>
                <h4 className="text-sm font-medium text-white mb-1">Host Shares Screen</h4>
                <p className="text-xs text-slate-500">The host starts sharing their screen and gets a connection code</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-emerald-400 font-bold text-sm">2</span>
                </div>
                <h4 className="text-sm font-medium text-white mb-1">Exchange Codes</h4>
                <p className="text-xs text-slate-500">Share the code with the remote user. They connect and send back a response code</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-purple-400 font-bold text-sm">3</span>
                </div>
                <h4 className="text-sm font-medium text-white mb-1">Connected!</h4>
                <p className="text-xs text-slate-500">Direct P2P connection established. View and control the remote desktop</p>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-700/30">
              <p className="text-xs text-slate-500 text-center">
                💡 <strong className="text-slate-400">Note:</strong> This uses WebRTC for direct peer-to-peer connections. 
                No data passes through any server — all communication is direct between your machines on the same network.
                For best performance, both devices should be on the same local network.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
