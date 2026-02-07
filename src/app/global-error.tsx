/**
 * Global Error Boundary per Next.js
 * 
 * Gestisce errori critici che non possono essere gestiti da error.tsx
 * Questo componente NON deve dipendere da provider o context esterni
 * per evitare errori durante il prerendering.
 */

'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log dell'errore per debugging
    console.error('Global error:', error);
  }, [error]);

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
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#dc2626' }}>
            Qualcosa è andato storto
          </h1>
          <p style={{ marginBottom: '2rem', color: '#6b7280', textAlign: 'center' }}>
            Si è verificato un errore critico nell&apos;applicazione.
          </p>
          {error.digest && (
            <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#9ca3af' }}>
              ID Errore: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
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
