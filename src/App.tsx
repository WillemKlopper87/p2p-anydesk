import React, { useState } from 'react';
import { AppMode } from './types';
import Landing from './components/Landing';
import HostSession from './components/HostSession';
import ClientSession from './components/ClientSession';

export default function App() {
  const [mode, setMode] = useState<AppMode>('landing');

  const handleBack = () => {
    setMode('landing');
  };

  switch (mode) {
    case 'host':
      return <HostSession onBack={handleBack} />;
    case 'client':
      return <ClientSession onBack={handleBack} />;
    default:
      return <Landing onModeSelect={setMode} />;
  }
}
