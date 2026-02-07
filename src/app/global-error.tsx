/**
 * Global Error Boundary per Next.js
 * 
 * IMPORTANTE: Questo componente DEVE essere completamente statico
 * e NON può usare React hooks o context durante il pre-rendering.
 * 
 * Next.js pre-renderizza questo componente durante il build,
 * quindi non può dipendere da alcun provider o context.
 * 
 * NOTA: Anche se è un client component, Next.js cerca comunque
 * di pre-renderizzarlo durante il build per verificare che funzioni.
 */

'use client';

// Disabilita il pre-rendering statico per questo componente
export const dynamic = 'force-dynamic';

export default function GlobalError({
  error,
  reset: _reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Funzione di reset completamente statica, senza dipendenze
  // Non usiamo reset() direttamente per evitare dipendenze da context
  const handleReset = () => {
    if (typeof window !== 'undefined') {
      // Usa window.location invece di router per evitare dipendenze
      window.location.href = '/';
    }
  };

  // Render completamente statico, senza hooks o context
  return (
    <html lang="it">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Errore - YottaErp</title>
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#dc2626', margin: 0 }}>
            Qualcosa è andato storto
          </h1>
          <p style={{ marginBottom: '2rem', color: '#6b7280', textAlign: 'center', maxWidth: '500px' }}>
            Si è verificato un errore critico nell&apos;applicazione.
          </p>
          {error?.digest && (
            <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#9ca3af' }}>
              ID Errore: {error.digest}
            </p>
          )}
          <button
            onClick={handleReset}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Riprova
          </button>
        </div>
      </body>
    </html>
  );
}
