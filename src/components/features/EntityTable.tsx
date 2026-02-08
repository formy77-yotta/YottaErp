/**
 * DataTable entità con @tanstack/react-table.
 * L'intestazione (sort + ricerca) è in EntitiesDataTableHeader; qui si renderizza solo il body.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Edit } from 'lucide-react';
import { DeleteEntityButton } from './DeleteEntityButton';
import type { EntityRow } from '@/services/actions/entity-actions';

/** Evita hydration mismatch quando estensioni (es. 3CX) modificano numeri nel DOM */
function VatFiscalCell({ vatNumber, fiscalCode }: { vatNumber: string | null; fiscalCode: string | null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="text-sm text-muted-foreground">
        {vatNumber || fiscalCode ? '…' : '—'}
      </div>
    );
  }
  return (
    <div className="text-sm">
      {vatNumber && <div>P.IVA: {vatNumber}</div>}
      {fiscalCode && <div className="text-muted-foreground">CF: {fiscalCode}</div>}
      {!vatNumber && !fiscalCode && <span className="text-muted-foreground">—</span>}
    </div>
  );
}

interface EntityTableProps {
  entities: EntityRow[];
}

const typeLabels: Record<EntityRow['type'], string> = {
  CUSTOMER: 'Cliente',
  SUPPLIER: 'Fornitore',
  LEAD: 'Lead',
};

const typeVariants: Record<EntityRow['type'], 'default' | 'secondary' | 'outline'> = {
  CUSTOMER: 'default',
  SUPPLIER: 'secondary',
  LEAD: 'outline',
};

const columns: ColumnDef<EntityRow>[] = [
  {
    accessorKey: 'type',
    header: '',
    cell: ({ row }) => (
      <Badge variant={typeVariants[row.original.type]}>
        {typeLabels[row.original.type]}
      </Badge>
    ),
  },
  {
    accessorKey: 'businessName',
    header: '',
    cell: ({ row }) => (
      <Link href={`/entities/${row.original.id}`} className="font-medium hover:underline">
        {row.original.businessName}
      </Link>
    ),
  },
  {
    id: 'vatFiscal',
    header: '',
    cell: ({ row }) => {
      const e = row.original;
      return <VatFiscalCell vatNumber={e.vatNumber} fiscalCode={e.fiscalCode} />;
    },
  },
  {
    id: 'address',
    header: '',
    cell: ({ row }) => {
      const e = row.original;
      return (
        <div className="text-sm">
          {e.address && <div>{e.address}</div>}
          <div className="text-muted-foreground">
            {[e.zipCode, e.city, e.province].filter(Boolean).join(' ')}
            {!e.zipCode && !e.city && !e.province && (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'email',
    header: '',
    cell: ({ row }) => {
      const email = row.original.email;
      return email ? (
        <a
          href={`mailto:${email}`}
          className="text-sm text-blue-600 hover:underline"
        >
          {email}
        </a>
      ) : (
        <span className="text-sm text-muted-foreground">-</span>
      );
    },
  },
  {
    accessorKey: 'active',
    header: '',
    cell: ({ row }) => (
      <Badge variant={row.original.active ? 'default' : 'secondary'}>
        {row.original.active ? 'Attiva' : 'Disattiva'}
      </Badge>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <Link href={`/entities/${row.original.id}`}>
          <Button variant="ghost" size="icon">
            <Edit className="h-4 w-4" />
          </Button>
        </Link>
        <DeleteEntityButton
          entityId={row.original.id}
          entityName={row.original.businessName}
        />
      </div>
    ),
  },
];

export function EntityTable({ entities }: EntityTableProps) {
  const table = useReactTable({
    data: entities,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <TableBody>
      {table.getRowModel().rows.map((row) => (
        <TableRow key={row.id}>
          {row.getVisibleCells().map((cell) => (
            <TableCell
              key={cell.id}
              className={cell.column.id === 'actions' ? 'text-right' : undefined}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}
