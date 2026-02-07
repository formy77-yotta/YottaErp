/**
 * Loading state per la pagina Scadenze (DataTable).
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ScadenzeLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-9 w-32 bg-muted animate-pulse rounded" />
        <div className="mt-2 h-5 w-96 bg-muted animate-pulse rounded" />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scadenza</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Cliente / Fornitore</TableHead>
              <TableHead className="text-right">Importo</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-right" />
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="h-4 w-28 bg-muted animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="h-4 w-20 bg-muted animate-pulse rounded ml-auto" />
                </TableCell>
                <TableCell>
                  <div className="h-5 w-20 bg-muted animate-pulse rounded" />
                </TableCell>
                <TableCell />
                <TableCell className="text-right">
                  <div className="h-8 w-24 bg-muted animate-pulse rounded ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
