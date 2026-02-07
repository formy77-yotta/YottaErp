/**
 * Hook per registrazione audio PWA-compatible
 * 
 * Gestisce MediaRecorder API con supporto per iOS Safari e Android.
 * 
 * COMPATIBILITÀ:
 * - iOS Safari: audio/mp4, audio/aac
 * - Android Chrome: audio/webm
 * - Fallback automatico al formato supportato
 */

'use client';

import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderReturn {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  isRecording: boolean;
  error: string | null;
  hasPermission: boolean | null;
}

/**
 * Determina il mimeType supportato dal browser
 */
function getSupportedMimeType(): string | null {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/m4a',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  // Fallback: usa il default del browser
  return null;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Richiedi permesso microfono
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      streamRef.current = stream;
      setHasPermission(true);

      // Determina mimeType supportato
      const mimeType = getSupportedMimeType();
      
      // Crea MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined, // Se null, usa default browser
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Gestisci eventi
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('Errore MediaRecorder:', event);
        setError('Errore durante la registrazione audio');
      };

      // Avvia registrazione
      mediaRecorder.start(100); // Raccoglie dati ogni 100ms
      setIsRecording(true);
    } catch (err) {
      console.error('Errore avvio registrazione:', err);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Permesso microfono negato. Abilita il microfono nelle impostazioni del browser.');
          setHasPermission(false);
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('Nessun microfono trovato. Verifica che un microfono sia collegato.');
        } else {
          setError(`Errore: ${err.message}`);
        }
      } else {
        setError('Errore sconosciuto durante l\'avvio della registrazione');
      }
      
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }

      const mediaRecorder = mediaRecorderRef.current;

      mediaRecorder.onstop = () => {
        // Crea Blob finale
        const mimeType = getSupportedMimeType() || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        
        // Pulisci risorse
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        setIsRecording(false);
        
        resolve(audioBlob);
      };

      // Ferma registrazione
      mediaRecorder.stop();
    });
  }, [isRecording]);

  return {
    startRecording,
    stopRecording,
    isRecording,
    error,
    hasPermission,
  };
}
