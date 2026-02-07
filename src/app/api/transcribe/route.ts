/**
 * API Route per Trascrizione Audio
 * 
 * Riceve un file audio e lo trascrive usando Google Cloud Speech-to-Text API.
 * Supporta formati webm, mp4, m4a per compatibilità PWA (iOS/Android).
 */

export async function POST(req: Request) {
  try {
    // Verifica che la chiave API sia configurata
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_GENERATIVE_AI_API_KEY non configurata' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: 'File audio non fornito' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verifica tipo file supportato
    const supportedTypes = ['audio/webm', 'audio/mp4', 'audio/m4a', 'audio/aac', 'audio/wav', 'audio/mpeg'];
    if (!supportedTypes.includes(audioFile.type)) {
      return new Response(
        JSON.stringify({ error: `Tipo file non supportato: ${audioFile.type}. Tipi supportati: ${supportedTypes.join(', ')}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Converte audio in base64 per l'API Google
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    // Mappa mimeType a encoding supportato da Google Speech-to-Text
    const encodingMap: Record<string, string> = {
      'audio/webm': 'WEBM_OPUS',
      'audio/mp4': 'MP4',
      'audio/m4a': 'MP4',
      'audio/aac': 'MP4',
      'audio/wav': 'LINEAR16',
      'audio/mpeg': 'MP3',
    };

    const encoding = encodingMap[audioFile.type] || 'WEBM_OPUS';

    // Chiama Google Cloud Speech-to-Text API
    // Usiamo l'API REST direttamente per evitare dipendenze pesanti
    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            encoding: encoding,
            sampleRateHertz: 16000, // Standard per web audio
            languageCode: 'it-IT', // Italiano
            enableAutomaticPunctuation: true,
            model: 'latest_long', // Modello ottimizzato per audio lunghi
          },
          audio: {
            content: base64Audio,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || errorData.error || JSON.stringify(errorData);
      
      // Messaggi di errore più chiari
      if (response.status === 403) {
        throw new Error(
          `Accesso negato. Verifica che:\n` +
          `1. L'API "Cloud Speech-to-Text" sia abilitata nel Google Cloud Console\n` +
          `2. La chiave API abbia i permessi corretti\n` +
          `3. Stai usando una chiave API di Google Cloud Platform (non Gemini)\n\n` +
          `Dettagli: ${errorMessage}`
        );
      } else if (response.status === 401) {
        throw new Error(
          `Autenticazione fallita. Verifica che la chiave API sia valida.\n\n` +
          `Dettagli: ${errorMessage}`
        );
      } else {
        throw new Error(
          `Errore API Google Speech-to-Text (${response.status}): ${errorMessage}`
        );
      }
    }

    const data = await response.json();

    // Estrai il testo dalla risposta
    if (data.results && data.results.length > 0 && data.results[0].alternatives) {
      const transcript = data.results[0].alternatives[0].transcript;
      return new Response(
        JSON.stringify({ text: transcript }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ text: '' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Errore trascrizione audio:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Errore durante la trascrizione',
        details: error instanceof Error ? error.message : 'Errore sconosciuto'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
