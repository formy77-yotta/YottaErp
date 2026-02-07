/**
 * Loading state per la pagina Documenti (DataTable).
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function DocumentsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-9 w-40 bg-muted animate-pulse rounded" />
          <div className="mt-2 h-5 w-80 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-10 w-36 bg-muted animate-pulse rounded" />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numero</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cliente/Fornitore</TableHead>
              <TableHead className="text-right">Imponibile</TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-right">Totale</TableHead>
              <TableHead className="text-right" />
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="h-5 w-24 bg-muted animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="h-4 w-20 bg-muted animate-pulse rounded ml-auto" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="h-4 w-16 bg-muted animate-pulse rounded ml-auto" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded ml-auto" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="h-8 w-24 bg-muted animate-pulse rounded ml-auto" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="h-8 w-16 bg-muted animate-pulse rounded ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
