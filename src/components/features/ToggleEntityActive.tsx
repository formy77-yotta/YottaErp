/**
 * Componente per toggle attiva/disattiva anagrafica
 * 
 * Client component per gestire lo switch di attivazione/disattivazione
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toggleEntityActiveAction } from '@/services/actions/entity-actions';
import { Loader2 } from 'lucide-react';

interface ToggleEntityActiveProps {
  entityId: string;
  initialActive: boolean;
}

export function ToggleEntityActive({ entityId, initialActive }: ToggleEntityActiveProps) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [isPending, startTransition] = useTransition();

  async function handleToggle(checked: boolean) {
    setActive(checked); // Ottimistic update
    
    startTransition(async () => {
      try {
        const result = await toggleEntityActiveAction(entityId, checked);
        
        if (!result.success) {
          // Rollback in caso di errore
          setActive(!checked);
          console.error('Errore aggiornamento stato:', result.error);
          // TODO: Mostrare toast di errore
        } else {
          // Ricarica la pagina per mostrare lo stato aggiornato
          router.refresh();
        }
      } catch (error) {
        // Rollback in caso di errore
        setActive(!checked);
        console.error('Errore aggiornamento stato:', error);
      }
    });
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="entity-active"
        checked={active}
        onCheckedChange={handleToggle}
        disabled={isPending}
      />
      <Label 
        htmlFor="entity-active" 
        className={isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Aggiornamento...
          </span>
        ) : (
          active ? 'Anagrafica attiva' : 'Anagrafica disattiva'
        )}
      </Label>
    </div>
  );
}
