/**
 * Componente tabella per visualizzare le entità
 * 
 * Mostra le entità in una tabella con possibilità di modifica
 */

'use client';

import React, { useEffect } from 'react';
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
import Link from 'next/link';
import { Edit } from 'lucide-react';
import { DeleteEntityButton } from './DeleteEntityButton';

interface Entity {
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
 * Riga singola della tabella con link alla pagina di dettaglio
 */
function EntityRow({ entity }: { entity: Entity }) {

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
    <TableRow>
      <TableCell>
        <Badge variant={typeVariants[entity.type]}>
          {typeLabels[entity.type]}
        </Badge>
      </TableCell>
      <TableCell className="font-medium">
        <Link 
          href={`/entities/${entity.id}`}
          className="hover:underline"
        >
          {entity.businessName}
        </Link>
      </TableCell>
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
            {entity.address && <div>{entity.address}</div>}
            <div className="text-muted-foreground">
              {[entity.zipCode, entity.city, entity.province]
                .filter(Boolean)
                .join(' ')}
              {!entity.zipCode && !entity.city && !entity.province && (
                <span className="text-muted-foreground">-</span>
              )}
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
        <div className="flex items-center justify-end gap-2">
          <Link href={`/entities/${entity.id}`}>
            <Button variant="ghost" size="icon">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
          <DeleteEntityButton 
            entityId={entity.id} 
            entityName={entity.businessName}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
