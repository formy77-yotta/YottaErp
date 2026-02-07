/**
 * Pagina gestione Unità di Misura
 * 
 * Permette di visualizzare, creare e modificare le unità di misura dell'organizzazione.
 * MULTITENANT: Tutte le unità di misura sono filtrate per organizationId
 */

import { Suspense } from 'react';
import { getUnitsOfMeasureAction } from '@/services/actions/unit-of-measure-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreateUnitOfMeasureDialog } from '@/components/features/CreateUnitOfMeasureDialog';
import { EditUnitOfMeasureDialog } from '@/components/features/EditUnitOfMeasureDialog';
import { DeleteUnitOfMeasureButton } from '@/components/features/DeleteUnitOfMeasureButton';
import { SeedDefaultUnitsOfMeasureButton } from '@/components/features/SeedDefaultUnitsOfMeasureButton';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

/**
 * Componente principale della pagina
 */
export default function UnitOfMeasurePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Unità di Misura</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci le unità di misura della tua organizzazione
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SeedDefaultUnitsOfMeasureButton />
          <CreateUnitOfMeasureDialog />
        </div>
      </div>

      {/* Tabella Unità di Misura */}
      <Suspense fallback={<UnitsOfMeasureTableSkeleton />}>
        <UnitsOfMeasureTable />
      </Suspense>
    </div>
  );
}

/**
 * Tabella unità di misura con dati dal server
 */
async function UnitsOfMeasureTable() {
  const result = await getUnitsOfMeasureAction();

  if (!result.success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">{result.error}</p>
        </CardContent>
      </Card>
    );
  }

  const units = result.data;

  // Etichette per le classi di misura
  const measureClassLabels: Record<string, string> = {
    WEIGHT: 'Peso',
    LENGTH: 'Lunghezza',
    VOLUME: 'Volume',
    PIECE: 'Pezzi',
    AREA: 'Superficie',
    TIME: 'Tempo',
  };

  // Colori badge per classi
  const measureClassColors: Record<string, string> = {
    WEIGHT: 'bg-blue-100 text-blue-800',
    LENGTH: 'bg-green-100 text-green-800',
    VOLUME: 'bg-purple-100 text-purple-800',
    PIECE: 'bg-orange-100 text-orange-800',
    AREA: 'bg-pink-100 text-pink-800',
    TIME: 'bg-yellow-100 text-yellow-800',
  };

  if (units.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Un unità di misura</CardTitle>
          <CardDescription>
            Crea la prima unità di misura per la tua organizzazione
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateUnitOfMeasureDialog />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unità di misura ({units.length})</CardTitle>
        <CardDescription>
          Elenco completo delle unità di misura configurate
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Codice</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Fattore</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell className="font-mono font-medium">{unit.code}</TableCell>
                <TableCell>{unit.name}</TableCell>
                <TableCell>
                  <Badge 
                    variant="secondary"
                    className={measureClassColors[unit.measureClass] || ''}
                  >
                    {measureClassLabels[unit.measureClass] || unit.measureClass}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono">
                  {parseFloat(unit.baseFactor).toLocaleString('it-IT', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 6,
                  })}
                </TableCell>
                <TableCell>
                  {unit.active ? (
                    <Badge variant="default">Attiva</Badge>
                  ) : (
                    <Badge variant="secondary">Disattiva</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <EditUnitOfMeasureDialog unit={unit} />
                    <DeleteUnitOfMeasureButton unitId={unit.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton per il caricamento della tabella
 */
function UnitsOfMeasureTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Un unità di misura</CardTitle>
        <CardDescription>Caricamento...</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
