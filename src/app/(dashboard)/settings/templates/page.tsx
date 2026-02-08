/**
 * Pagina gestione Modelli di stampa PDF (PrintTemplate)
 *
 * MULTITENANT: Ogni modello appartiene a un'organizzazione.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { getTemplatesAction } from '@/services/actions/template-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Pencil, Star } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Modelli di stampa</h1>
          <p className="text-muted-foreground mt-1">
            Crea e gestisci i modelli grafici per fatture, DDT e ordini
          </p>
        </div>
        <Link href="/settings/templates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo modello
          </Button>
        </Link>
      </div>

      <Suspense fallback={<TemplatesTableSkeleton />}>
        <TemplatesTable />
      </Suspense>
    </div>
  );
}

async function TemplatesTable() {
  const result = await getTemplatesAction();

  if (!result.success) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-destructive">Errore: {result.error}</p>
      </div>
    );
  }

  const templates = result.data;

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nessun modello di stampa configurato</p>
          <p className="text-sm text-muted-foreground mt-2">
            Crea il primo modello per personalizzare colori, layout e colonne dei PDF
          </p>
          <Link href="/settings/templates/new">
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Nuovo modello
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modelli</CardTitle>
        <CardDescription>
          {templates.length} modello{templates.length !== 1 ? 'i' : ''} configurato{templates.length !== 1 ? 'i' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Colore primario</TableHead>
                <TableHead>Layout</TableHead>
                <TableHead>Predefinito</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>
                    <span
                      className="inline-block w-6 h-6 rounded border mr-2 align-middle"
                      style={{ backgroundColor: t.config.colors.primary }}
                    />
                    <span className="font-mono text-sm">{t.config.colors.primary}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{t.config.baseLayout}</Badge>
                  </TableCell>
                  <TableCell>
                    {t.isDefault ? (
                      <Badge className="bg-amber-600">
                        <Star className="h-3 w-3 mr-1" />
                        Predefinito
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/settings/templates/${t.id}/edit`}>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplatesTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Modelli</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Colore primario</TableHead>
                <TableHead>Layout</TableHead>
                <TableHead>Predefinito</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-8 w-8 bg-muted animate-pulse rounded ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
