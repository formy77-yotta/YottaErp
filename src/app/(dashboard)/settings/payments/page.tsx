/**
 * Pagina gestione Pagamenti
 * 
 * Permette di visualizzare, creare e modificare:
 * - Tipi di Pagamento (PaymentType) - SDI/SEPA compliant
 * - Condizioni di Pagamento (PaymentCondition) - Logica scadenze
 * 
 * MULTITENANT: Tutti i dati sono filtrati per organizationId
 */

'use client';

import { Suspense, useState } from 'react';
import { getPaymentTypesAction, getPaymentConditionsAction } from '@/services/actions/payment-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreatePaymentTypeDialog } from '@/components/features/CreatePaymentTypeDialog';
import { EditPaymentTypeDialog } from '@/components/features/EditPaymentTypeDialog';
import { CreatePaymentConditionDialog } from '@/components/features/CreatePaymentConditionDialog';
import { EditPaymentConditionDialog } from '@/components/features/EditPaymentConditionDialog';

/**
 * Componente principale della pagina
 */
export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState('types');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Gestione Pagamenti</h1>
        <p className="text-muted-foreground mt-1">
          Configura tipi di pagamento (SDI/SEPA) e condizioni di pagamento per lo scadenziario
        </p>
      </div>

      {/* Tabs per Tipi e Condizioni */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="types">Tipi di Pagamento</TabsTrigger>
          <TabsTrigger value="conditions">Condizioni di Pagamento</TabsTrigger>
        </TabsList>

        {/* Tab Tipi di Pagamento */}
        <TabsContent value="types" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Tipi di Pagamento</h2>
              <p className="text-sm text-muted-foreground">
                Metodi di pagamento conformi SDI (MP01-MP23) e SEPA
              </p>
            </div>
            <CreatePaymentTypeDialog />
          </div>

          <Suspense fallback={<PaymentTypesTableSkeleton />}>
            <PaymentTypesTable />
          </Suspense>
        </TabsContent>

        {/* Tab Condizioni di Pagamento */}
        <TabsContent value="conditions" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Condizioni di Pagamento</h2>
              <p className="text-sm text-muted-foreground">
                Logica di calcolo scadenze (rate, giorni, fine mese)
              </p>
            </div>
            <CreatePaymentConditionDialog />
          </div>

          <Suspense fallback={<PaymentConditionsTableSkeleton />}>
            <PaymentConditionsTable />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Tabella tipi di pagamento con dati dal server
 */
async function PaymentTypesTable() {
  const result = await getPaymentTypesAction(false); // Mostra anche quelli disattivi

  if (!result.success) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-destructive">Errore: {result.error}</p>
      </div>
    );
  }

  const paymentTypes = result.data;

  if (paymentTypes.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Nessun tipo di pagamento configurato</p>
          <p className="text-sm text-muted-foreground mt-2">
            Crea il tuo primo tipo di pagamento (es. Bonifico, RiBa, etc.)
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipi di Pagamento Configurati</CardTitle>
        <CardDescription>
          {paymentTypes.length} tipo{paymentTypes.length !== 1 ? 'i' : ''} configurato{paymentTypes.length !== 1 ? 'i' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Codice SDI</TableHead>
                <TableHead>Codice SEPA</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentTypes.map((type) => (
                <PaymentTypeRow key={type.id} type={type} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Riga singola tipo di pagamento
 */
function PaymentTypeRow({ type }: { type: {
  id: string;
  name: string;
  sdiCode: string;
  sepaCode: string | null;
  active: boolean;
} }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{type.name}</TableCell>
      <TableCell>
        <Badge variant="outline" className="font-mono">
          {type.sdiCode}
        </Badge>
      </TableCell>
      <TableCell>
        {type.sepaCode ? (
          <Badge variant="secondary" className="font-mono">
            {type.sepaCode}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={type.active ? 'default' : 'secondary'}>
          {type.active ? 'Attivo' : 'Disattivo'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <EditPaymentTypeDialog type={type} />
      </TableCell>
    </TableRow>
  );
}

/**
 * Tabella condizioni di pagamento con dati dal server
 */
async function PaymentConditionsTable() {
  const result = await getPaymentConditionsAction(false); // Mostra anche quelle disattive

  if (!result.success) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-destructive">Errore: {result.error}</p>
      </div>
    );
  }

  const conditions = result.data;

  if (conditions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Nessuna condizione di pagamento configurata</p>
          <p className="text-sm text-muted-foreground mt-2">
            Crea la tua prima condizione (es. "30/60 gg FM", "Immediato", etc.)
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Condizioni di Pagamento Configurate</CardTitle>
        <CardDescription>
          {conditions.length} condizione{conditions.length !== 1 ? 'i' : ''} configurata{conditions.length !== 1 ? 'e' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo Pagamento</TableHead>
                <TableHead>Scadenze</TableHead>
                <TableHead>Dettagli</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conditions.map((condition) => (
                <PaymentConditionRow key={condition.id} condition={condition} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Riga singola condizione di pagamento
 */
function PaymentConditionRow({ condition }: { condition: {
  id: string;
  name: string;
  paymentType: {
    id: string;
    name: string;
    sdiCode: string;
  };
  daysToFirstDue: number;
  gapBetweenDues: number;
  numberOfDues: number;
  isEndOfMonth: boolean;
  active: boolean;
} }) {
  const scadenzeText = condition.numberOfDues === 1
    ? `${condition.daysToFirstDue} gg${condition.isEndOfMonth ? ' FM' : ''}`
    : `${condition.numberOfDues} rate (${condition.daysToFirstDue} gg + ${condition.gapBetweenDues} gg)${condition.isEndOfMonth ? ' FM' : ''}`;

  return (
    <TableRow>
      <TableCell className="font-medium">{condition.name}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span className="text-sm">{condition.paymentType.name}</span>
          <Badge variant="outline" className="text-xs font-mono w-fit">
            {condition.paymentType.sdiCode}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm">{scadenzeText}</span>
      </TableCell>
      <TableCell>
        <div className="text-xs text-muted-foreground">
          Prima: {condition.daysToFirstDue} gg
          {condition.numberOfDues > 1 && ` • Gap: ${condition.gapBetweenDues} gg`}
          {condition.isEndOfMonth && ' • Fine mese'}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={condition.active ? 'default' : 'secondary'}>
          {condition.active ? 'Attiva' : 'Disattiva'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <EditPaymentConditionDialog condition={{
          ...condition,
          paymentTypeId: condition.paymentType.id,
        }} />
      </TableCell>
    </TableRow>
  );
}

/**
 * Skeleton per caricamento tabella tipi di pagamento
 */
function PaymentTypesTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipi di Pagamento Configurati</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Codice SDI</TableHead>
                <TableHead>Codice SEPA</TableHead>
                <TableHead>Stato</TableHead>
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
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
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

/**
 * Skeleton per caricamento tabella condizioni di pagamento
 */
function PaymentConditionsTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Condizioni di Pagamento Configurate</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo Pagamento</TableHead>
                <TableHead>Scadenze</TableHead>
                <TableHead>Dettagli</TableHead>
                <TableHead>Stato</TableHead>
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
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-40 bg-muted animate-pulse rounded" />
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
