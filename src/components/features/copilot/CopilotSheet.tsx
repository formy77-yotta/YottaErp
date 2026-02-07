/**
 * Componente CopilotSheet - AI Copilot per ERP
 * 
 * Fornisce un'interfaccia chat con supporto vocale per interagire con l'AI
 * e eseguire azioni ERP tramite tools.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, MicOff, Send, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';

interface CopilotSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CopilotSheet({ open, onOpenChange }: CopilotSheetProps) {
  const [input, setInput] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    sendMessage,
    toolInvocations,
  } = useChat({
    api: '/api/chat',
    onError: (error) => {
      console.error('Errore chat:', error);
    },
  });

  const {
    startRecording,
    stopRecording,
    isRecording,
    error: recorderError,
    hasPermission,
  } = useAudioRecorder();

  // Scroll automatico ai nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, toolInvocations]);

  // Gestione invio messaggio
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    sendMessage({
      role: 'user',
      content: input,
    });

    setInput('');
  };

  // Gestione registrazione vocale
  const handleMicClick = async () => {
    if (isRecording) {
      // Ferma registrazione e trascrivi
      setIsTranscribing(true);
      try {
        const audioBlob = await stopRecording();
        
        if (!audioBlob) {
          setIsTranscribing(false);
          return;
        }

        // Invia audio al server per trascrizione
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || errorData.details || 'Errore durante la trascrizione';
          throw new Error(errorMessage);
        }

        const data = await response.json();
        
        // Verifica se c'è un errore nella risposta
        if (data.error) {
          throw new Error(data.error);
        }
        
        const transcribedText = data.text;

        if (transcribedText && transcribedText.trim()) {
          // Inserisci testo trascritto e invia automaticamente
          setInput(transcribedText);
          sendMessage({
            role: 'user',
            content: transcribedText,
          });
        }
      } catch (error) {
        console.error('Errore trascrizione:', error);
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Errore durante la trascrizione. Riprova.';
        alert(`Errore trascrizione: ${errorMessage}\n\nNota: Assicurati che l'API Speech-to-Text sia abilitata nel Google Cloud Console.`);
      } finally {
        setIsTranscribing(false);
      }
    } else {
      // Inizia registrazione
      await startRecording();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>AI Copilot</SheetTitle>
          <SheetDescription>
            Chiedi all'AI di creare lead, opportunità o altre azioni ERP.
          </SheetDescription>
        </SheetHeader>

        {/* Area messaggi */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {(!messages || messages.length === 0) && (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">
                Ciao! Sono il tuo assistente ERP. Puoi chiedermi di:
              </p>
              <ul className="text-sm mt-4 space-y-2 text-left max-w-md mx-auto">
                <li>• Creare un nuovo lead</li>
                <li>• Creare un'opportunità commerciale</li>
                <li>• Ottenere informazioni sul sistema</li>
              </ul>
              <p className="text-xs mt-4 text-muted-foreground">
                Usa il microfono per parlare o scrivi direttamente.
              </p>
            </div>
          )}

          {messages && messages.length > 0 && messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {/* Tool invocations */}
          {toolInvocations && toolInvocations.length > 0 && toolInvocations.map((toolInvocation) => (
            <div key={toolInvocation.toolInvocationId} className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {toolInvocation.state === 'call' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Esecuzione azione: {toolInvocation.toolName}...</span>
                  </>
                )}
                {toolInvocation.state === 'result' && (
                  <>
                    {toolInvocation.result?.success ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">
                          {toolInvocation.result.message || 'Azione completata con successo'}
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-red-600">
                          {toolInvocation.result?.error || 'Errore durante l\'esecuzione'}
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && messages && messages.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}

          {/* Errori recorder */}
          {recorderError && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-2">
              {recorderError}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Area input */}
        <div className="border-t px-6 py-4">
          <form onSubmit={handleFormSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isRecording
                  ? 'Registrazione in corso...'
                  : isTranscribing
                  ? 'Trascrizione in corso...'
                  : 'Scrivi un messaggio...'
              }
              disabled={isLoading || isRecording || isTranscribing}
              className="flex-1"
            />
            <Button
              type="button"
              variant={isRecording ? 'destructive' : 'outline'}
              size="icon"
              onClick={handleMicClick}
              disabled={isLoading || isTranscribing}
              title={
                isRecording
                  ? 'Ferma registrazione'
                  : hasPermission === false
                  ? 'Permesso microfono negato'
                  : 'Inizia registrazione vocale'
              }
            >
              {isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : isTranscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="submit"
              disabled={!input.trim() || isLoading || isRecording || isTranscribing}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
