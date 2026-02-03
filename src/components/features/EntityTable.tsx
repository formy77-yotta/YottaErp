/**
 * Componente tabella per visualizzare le entità
 * 
 * Mostra le entità in una tabella con possibilità di modifica
 */

'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EntityForm } from '@/components/features/EntityForm';
import { Edit } from 'lucide-react';

interface Entity {
  id: string;
  type: 'CUSTOMER' | 'SUPPLIER' | 'LEAD';
  businessName: string;
  vatNumber: string | null;
  fiscalCode: string | null;
  address: string;
  city: string;
  province: string;
  zipCode: string;
  email: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface EntityTableProps {
  entities: Entity[];
}

export function EntityTable({ entities }: EntityTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Ragione Sociale</TableHead>
            <TableHead>P.IVA / CF</TableHead>
            <TableHead>Indirizzo</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead className="text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entities.map((entity) => (
            <EntityRow key={entity.id} entity={entity} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Riga singola della tabella con dialog di modifica
 */
function EntityRow({ entity }: { entity: Entity }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  const typeLabels: Record<Entity['type'], string> = {
    CUSTOMER: 'Cliente',
    SUPPLIER: 'Fornitore',
    LEAD: 'Lead',
  };

  const typeVariants: Record<Entity['type'], 'default' | 'secondary' | 'outline'> = {
    CUSTOMER: 'default',
    SUPPLIER: 'secondary',
    LEAD: 'outline',
  };

  return (
    <>
      <TableRow>
        <TableCell>
          <Badge variant={typeVariants[entity.type]}>
            {typeLabels[entity.type]}
          </Badge>
        </TableCell>
        <TableCell className="font-medium">{entity.businessName}</TableCell>
        <TableCell>
          <div className="text-sm">
            {entity.vatNumber && (
              <div>P.IVA: {entity.vatNumber}</div>
            )}
            {entity.fiscalCode && (
              <div className="text-muted-foreground">
                CF: {entity.fiscalCode}
              </div>
            )}
            {!entity.vatNumber && !entity.fiscalCode && (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="text-sm">
            <div>{entity.address}</div>
            <div className="text-muted-foreground">
              {entity.zipCode} {entity.city} ({entity.province})
            </div>
          </div>
        </TableCell>
        <TableCell>
          {entity.email ? (
            <a 
              href={`mailto:${entity.email}`}
              className="text-sm text-blue-600 hover:underline"
            >
              {entity.email}
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell>
          <Badge variant={entity.active ? 'default' : 'secondary'}>
            {entity.active ? 'Attiva' : 'Disattiva'}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Edit className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Modifica Anagrafica</DialogTitle>
                <DialogDescription>
                  Modifica i dati dell'anagrafica. La P.IVA deve essere unica per organizzazione.
                </DialogDescription>
              </DialogHeader>
              <EntityForm
                key={key}
                entity={entity}
                onSuccess={() => {
                  setOpen(false);
                  setKey((k) => k + 1); // Reset form
                  // La revalidazione viene fatta automaticamente dalla Server Action
                }}
                onError={(error) => {
                  console.error('Errore aggiornamento entità:', error);
                  // L'errore viene mostrato nel form tramite setError
                }}
              />
            </DialogContent>
          </Dialog>
        </TableCell>
      </TableRow>
    </>
  );
}
