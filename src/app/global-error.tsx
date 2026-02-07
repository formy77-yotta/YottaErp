/**
 * Global Error Boundary per Next.js
 * 
 * Gestisce errori critici che non possono essere gestiti da error.tsx
 * Questo componente NON deve dipendere da provider o context esterni
 * per evitare errori durante il prerendering.
 * 
 * IMPORTANTE: Questo componente deve essere completamente statico e non usare
 * hooks che potrebbero dipendere da context durante il prerendering.
 * 
 * NOTA: In Next.js 14, il global-error viene renderizzato durante il build
 * per testare che funzioni. Assicurarsi che non dipenda da nulla.
 */

'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Funzione di reset sicura che non dipende da context
  const handleReset = () => {
    try {
      if (typeof reset === 'function') {
        reset();
      } else {
        // Fallback: ricarica la pagina
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }
    } catch (err) {
      // Se reset fallisce, ricarica la pagina
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

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
