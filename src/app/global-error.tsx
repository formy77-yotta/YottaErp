'use client';

/**
 * Boundary globale per errori non gestiti.
 * Sostituisce il root layout quando attivo; nessun contesto esterno.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="it">
      <body>
        <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
          <h1 style={{ marginBottom: '1rem' }}>Si è verificato un errore</h1>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            {error?.message ?? 'Errore imprevisto. Riprova più tardi.'}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            Riprova
          </button>
        </div>
      </body>
    </html>
  );
}
