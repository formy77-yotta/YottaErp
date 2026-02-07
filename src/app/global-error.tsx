/**
 * Global Error Boundary
 * 
 * Gestisce errori globali che non possono essere catturati da error.tsx
 * Questo componente DEVE essere un client component e DEVE includere <html> e <body>
 * 
 * IMPORTANTE: Non può essere pre-renderizzato, quindi non usa React hooks
 * che richiedono context durante il rendering iniziale.
 */

'use client';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  // Non usare useEffect o altri hooks che richiedono React context
  // durante il rendering iniziale per evitare problemi di pre-rendering

  return (
    <html lang="it">
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            Qualcosa è andato storto
          </h1>
          <p style={{ marginBottom: '2rem', color: '#666' }}>
            Si è verificato un errore imprevisto. Riprova più tardi.
          </p>
          {error?.digest && (
            <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#999' }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={() => {
              // Reset error boundary
              reset();
            }}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#0070f3',
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
