/**
 * Componente tabella per visualizzare le aliquote IVA
 * 
 * Mostra le aliquote in una tabella con possibilità di modifica
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { VatRateForm } from '@/components/features/VatRateForm';
import { Edit } from 'lucide-react';
import { Decimal } from 'decimal.js';

interface VatRate {
  id: string;
  name: string;
  value: string; // Decimal come stringa
  nature: string | null;
  description: string | null;
  active: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface VatRateTableProps {
  vatRates: VatRate[];
}

export function VatRateTable({ vatRates }: VatRateTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Valore</TableHead>
            <TableHead>Natura</TableHead>
            <TableHead>Descrizione</TableHead>
            <TableHead>Default</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead className="text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vatRates.map((rate) => (
            <VatRateRow key={rate.id} rate={rate} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Riga singola della tabella con dialog di modifica
 */
function VatRateRow({ rate }: { rate: VatRate }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  // Converte Decimal (stringa) in percentuale per visualizzazione
  // Es. "0.2200" -> "22%"
  const valuePercent = new Decimal(rate.value).mul(100).toFixed(2);

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{rate.name}</TableCell>
        <TableCell>
          <span className="font-mono">{valuePercent}%</span>
        </TableCell>
        <TableCell>
          {rate.nature ? (
            <Badge variant="outline">{rate.nature}</Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell>
          <div className="max-w-md truncate text-sm">
            {rate.description || <span className="text-muted-foreground">-</span>}
          </div>
        </TableCell>
        <TableCell>
          {rate.isDefault ? (
            <Badge variant="default">Default</Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell>
          <Badge variant={rate.active ? 'default' : 'secondary'}>
            {rate.active ? 'Attiva' : 'Disattiva'}
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
                <DialogTitle>Modifica Aliquota IVA</DialogTitle>
                <DialogDescription>
                  Modifica i dati dell'aliquota IVA. Il nome deve essere unico per organizzazione.
                </DialogDescription>
              </DialogHeader>
              <VatRateForm
                key={key}
                vatRate={rate}
                onSuccess={() => {
                  setOpen(false);
                  setKey((k) => k + 1); // Reset form
                  // La revalidazione viene fatta automaticamente dalla Server Action
                }}
                onError={(error) => {
                  console.error('Errore aggiornamento aliquota:', error);
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
