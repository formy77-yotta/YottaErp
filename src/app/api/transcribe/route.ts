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
    // Estrai il MIME type base (prima del ;) per gestire codec come "audio/webm; codecs=opus"
    const mimeTypeBase = audioFile.type.split(';')[0].trim();
    const supportedTypes = ['audio/webm', 'audio/mp4', 'audio/m4a', 'audio/aac', 'audio/wav', 'audio/mpeg'];
    if (!supportedTypes.includes(mimeTypeBase)) {
      return new Response(
        JSON.stringify({ error: `Tipo file non supportato: ${audioFile.type}. Tipi supportati: ${supportedTypes.join(', ')}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verifica dimensione file (minimo 1KB per essere valido)
    const fileSize = audioFile.size;

    if (fileSize < 1024) {
      return new Response(
        JSON.stringify({ 
          error: 'File audio troppo piccolo. Assicurati di aver registrato almeno qualche secondo di audio.',
          text: ''
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Converte audio in base64 per l'API Google
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    // Mappa mimeType a encoding supportato da Google Speech-to-Text
    // Per WEBM con codec opus, usiamo WEBM_OPUS esplicitamente
    // Se il MIME type contiene "opus", usa WEBM_OPUS, altrimenti prova ENCODING_UNSPECIFIED
    let encoding: string;
    if (mimeTypeBase === 'audio/webm') {
      // Se il tipo contiene "opus", usa WEBM_OPUS esplicitamente
      if (audioFile.type.includes('opus') || audioFile.type.includes('codecs=opus')) {
        encoding = 'WEBM_OPUS';
      } else {
        // Altrimenti prova ENCODING_UNSPECIFIED
        encoding = 'ENCODING_UNSPECIFIED';
      }
    } else {
      const encodingMap: Record<string, string> = {
        'audio/mp4': 'MP4',
        'audio/m4a': 'MP4',
        'audio/aac': 'MP4',
        'audio/wav': 'LINEAR16',
        'audio/mpeg': 'MP3',
      };
      encoding = encodingMap[mimeTypeBase] || 'ENCODING_UNSPECIFIED';
    }

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
            // Includi sempre l'encoding (anche se è ENCODING_UNSPECIFIED, Google lo accetta)
            encoding: encoding,
            // sampleRateHertz rimosso: Google lo rileva automaticamente dall'header del file audio
            // Questo evita errori quando il sample rate dell'audio (es. 48000) non corrisponde al valore configurato
            languageCode: 'it-IT', // Italiano
            enableAutomaticPunctuation: true,
            model: 'latest_long', // Modello ottimizzato per audio lunghi
            // Aggiungi alternativeLanguageCodes per migliorare il rilevamento
            alternativeLanguageCodes: ['it-IT', 'en-US'],
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
        // Verifica se l'errore è specifico per il metodo bloccato
        const isMethodBlocked = errorMessage.includes('are blocked') || errorMessage.includes('method');
        
        if (isMethodBlocked) {
          throw new Error(
            `Metodo API bloccato dalle restrizioni della chiave API.\n\n` +
            `Soluzione:\n` +
            `1. Vai su Google Cloud Console > "API & Services" > "Credentials"\n` +
            `2. Clicca sulla tua chiave API\n` +
            `3. Nella sezione "API restrictions", assicurati che:\n` +
            `   - "Cloud Speech-to-Text API" sia permessa\n` +
            `   - OPPURE rimuovi le restrizioni (per test)\n\n` +
            `Dettagli: ${errorMessage}`
          );
        } else {
          throw new Error(
            `Accesso negato. Verifica che:\n` +
            `1. L'API "Cloud Speech-to-Text" sia abilitata nel Google Cloud Console\n` +
            `2. La chiave API abbia i permessi corretti\n` +
            `3. Stai usando una chiave API di Google Cloud Platform (non Gemini)\n\n` +
            `Dettagli: ${errorMessage}`
          );
        }
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
      
      if (transcript && transcript.trim()) {
        return new Response(
          JSON.stringify({ text: transcript }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        console.warn('Trascrizione vuota o solo spazi');
        return new Response(
          JSON.stringify({ 
            text: '',
            error: 'Nessun testo rilevato nella registrazione. Riprova parlando più chiaramente.'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.warn('Nessun risultato nella risposta Google:', data);
      
      // Verifica se c'è un errore nella risposta
      if (data.error) {
        return new Response(
          JSON.stringify({ 
            text: '',
            error: `Errore Google Speech-to-Text: ${data.error.message || JSON.stringify(data.error)}`
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Se non ci sono risultati ma la richiesta è andata a buon fine,
      // probabilmente l'audio non conteneva parlato rilevabile
      return new Response(
        JSON.stringify({ 
          text: '',
          error: 'Nessun parlato rilevato nell\'audio. Assicurati di:\n' +
                 '1. Parlare chiaramente e abbastanza forte\n' +
                 '2. Registrare almeno 1-2 secondi di audio\n' +
                 '3. Non ci sia troppo rumore di fondo\n' +
                 '4. Il microfono sia acceso e funzionante'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Errore trascrizione audio:', error);
    
    // Estrai dettagli dell'errore per messaggio più informativo
    let errorMessage = 'Errore sconosciuto durante la trascrizione';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      // Se il messaggio contiene già dettagli strutturati, usali
      if (error.message.includes('\n')) {
        const parts = error.message.split('\n');
        errorMessage = parts[0];
        errorDetails = parts.slice(1).join('\n');
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails || (error instanceof Error ? error.message : 'Errore sconosciuto')
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
