/**
 * Global Error Boundary per Next.js
 * 
 * Gestisce errori critici che non possono essere gestiti da error.tsx
 * Questo componente NON deve dipendere da provider o context esterni
 * per evitare errori durante il prerendering.
 * 
 * IMPORTANTE: Questo componente deve essere completamente statico e non usare
 * hooks che potrebbero dipendere da context durante il prerendering.
 */

'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Non usare useEffect o altri hooks che potrebbero dipendere da context
  // Il componente deve essere completamente statico per funzionare durante il prerendering

  return (
    <html lang="it">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Errore - YottaErp</title>
      </head>
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#dc2626' }}>
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
              if (typeof reset === 'function') {
                reset();
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
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#1d4ed8';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
          >
            Riprova
          </button>
        </div>
      </body>
    </html>
  );
}
