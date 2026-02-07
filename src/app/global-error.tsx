/**
 * Global Error Boundary per Next.js
 * 
 * IMPORTANTE: Questo componente DEVE essere completamente statico
 * e NON può usare React hooks o context durante il pre-rendering.
 * 
 * Next.js pre-renderizza questo componente durante il build,
 * quindi non può dipendere da alcun provider o context.
 * 
 * NOTA: Questo componente è minimale e non usa nulla che possa
 * causare problemi durante il pre-rendering.
 */

'use client';

// #region agent log
if (typeof window === 'undefined') {
  fetch('http://127.0.0.1:7242/ingest/96985e5f-b98b-4622-8e18-baf91c50b762', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'global-error.tsx:16',
      message: 'GlobalError module loaded during SSR/build',
      data: { isServer: true, timestamp: Date.now() },
      timestamp: Date.now(),
      runId: 'initial',
      hypothesisId: 'A'
    })
  }).catch(() => {});
}
// #endregion

// Nota: 'force-static' non esiste in Next.js 16 per client components
// Usiamo invece un approccio completamente isolato

export default function GlobalError({
  error,
  reset: _reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // #region agent log
  if (typeof window === 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/96985e5f-b98b-4622-8e18-baf91c50b762', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'global-error.tsx:25',
        message: 'GlobalError component rendering during SSR/build',
        data: { hasError: !!error, errorDigest: error?.digest, timestamp: Date.now() },
        timestamp: Date.now(),
        runId: 'initial',
        hypothesisId: 'B'
      })
    }).catch(() => {});
  }
  // #endregion

  // Render completamente statico, senza hooks, senza context, senza nulla
  // Usa solo HTML puro e inline styles per evitare qualsiasi dipendenza
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
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            }}
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
