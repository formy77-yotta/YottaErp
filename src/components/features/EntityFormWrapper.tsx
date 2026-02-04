/**
 * Wrapper Client Component per EntityForm
 * 
 * Necessario perché non possiamo passare funzioni da Server Component a Client Component
 */

'use client';

import { EntityForm } from './EntityForm';

interface EntityFormWrapperProps {
  entity: {
    id: string;
    type: 'CUSTOMER' | 'SUPPLIER' | 'LEAD';
    businessName: string;
    vatNumber: string | null;
    fiscalCode: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    zipCode: string | null;
    email: string | null;
  };
}

export function EntityFormWrapper({ entity }: EntityFormWrapperProps) {
  return (
    <EntityForm
      entity={entity}
      onSuccess={() => {
        // La revalidazione viene fatta automaticamente dalla Server Action
      }}
      onError={(error) => {
        console.error('Errore aggiornamento entità:', error);
      }}
    />
  );
}
