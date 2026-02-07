/**
 * Tabella condizioni di pagamento (Server Component)
 */

import { getPaymentConditionsAction } from '@/services/actions/payment-actions';
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
import { EditPaymentConditionDialog } from '@/components/features/EditPaymentConditionDialog';

/**
 * Tabella condizioni di pagamento con dati dal server
 */
export async function PaymentConditionsTable() {
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
