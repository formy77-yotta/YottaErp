/**
 * Componente Client-Side per visualizzare P.IVA
 * 
 * Necessario per evitare errori di hydration causati da estensioni del browser
 * (es. 3CX) che modificano il DOM aggiungendo elementi attorno ai numeri.
 */

'use client';

import { useEffect, useState } from 'react';

interface VatNumberDisplayProps {
  /**
   * Numero P.IVA da visualizzare
   */
  vatNumber: string;
  
  /**
   * Prefisso da mostrare prima del numero (default: "P.IVA: ")
   */
  prefix?: string;
  
  /**
   * Classi CSS aggiuntive
   */
  className?: string;
}

export function VatNumberDisplay({ 
  vatNumber, 
  prefix = 'P.IVA: ',
  className = 'text-sm text-muted-foreground'
}: VatNumberDisplayProps) {
  const [mounted, setMounted] = useState(false);

  // Renderizza solo lato client per evitare hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Durante SSR, mostra solo il prefisso senza il numero
    return <span className={className}>{prefix}...</span>;
  }

  return (
    <span className={className}>
      {prefix}{vatNumber}
    </span>
  );
}
