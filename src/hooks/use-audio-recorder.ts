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
  const startTimeRef = useRef<number | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Richiedi permesso microfono

      // Richiedi permesso microfono con configurazione migliorata
      // Specifica che vogliamo un dispositivo audio input (microfono)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Forza l'uso di un dispositivo input (microfono) e non output
          // Questo aiuta Edge a selezionare il dispositivo corretto
          channelCount: 1, // Mono (più compatibile)
          sampleRate: 48000, // Sample rate standard
        } 
      });

      // Log informazioni sul dispositivo utilizzato e verifica che sia attivo
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('Nessun track audio disponibile. Verifica che un microfono sia collegato e funzionante.');
      }

      const audioTrack = audioTracks[0];
      
      // Verifica che il track sia attivo
      if (audioTrack.readyState !== 'live') {
        throw new Error('Il track audio non è attivo. Verifica le impostazioni del microfono.');
      }

      // Verifica impostazioni dispositivo
      const settings = audioTrack.getSettings();

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
      startTimeRef.current = Date.now();
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
        // Verifica durata registrazione (minimo 500ms)
        const duration = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
        
        if (duration < 500) {
          // Pulisci risorse
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          mediaRecorderRef.current = null;
          chunksRef.current = [];
          setIsRecording(false);
          startTimeRef.current = null;
          resolve(null);
          return;
        }
        
        // Verifica che ci siano dati registrati
        if (chunksRef.current.length === 0) {
          // Pulisci risorse
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          mediaRecorderRef.current = null;
          chunksRef.current = [];
          setIsRecording(false);
          startTimeRef.current = null;
          resolve(null);
          return;
        }

        // Crea Blob finale
        const mimeType = getSupportedMimeType() || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        
        // Verifica che il blob abbia una dimensione ragionevole (almeno 1KB per secondo di registrazione)
        const minExpectedSize = Math.max(1024, (duration / 1000) * 1024); // 1KB al secondo minimo
        if (audioBlob.size < minExpectedSize) {
          // Blob troppo piccolo, potrebbe indicare problemi con il microfono
        }
        
        // Pulisci risorse
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        setIsRecording(false);
        startTimeRef.current = null;
        
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
