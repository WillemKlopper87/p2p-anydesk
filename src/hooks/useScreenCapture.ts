import { useState, useRef, useCallback } from 'react';

export function useScreenCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startCapture = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
        } as any,
        audio: false,
      });

      setStream(mediaStream);
      setIsCapturing(true);

      // Handle stream ending (user clicks "Stop sharing")
      mediaStream.getVideoTracks()[0].onended = () => {
        setIsCapturing(false);
        setStream(null);
      };

      return mediaStream;
    } catch (err) {
      console.error('Screen capture failed:', err);
      throw err;
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCapturing(false);
    }
  }, [stream]);

  return {
    isCapturing,
    stream,
    videoRef,
    startCapture,
    stopCapture,
  };
}
