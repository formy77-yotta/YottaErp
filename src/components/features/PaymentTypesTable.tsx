/**
 * Tabella tipi di pagamento (Server Component)
 */

import { getPaymentTypes } from '@/services/queries/payment-queries';
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
import { EditPaymentTypeDialog } from '@/components/features/EditPaymentTypeDialog';

/**
 * Tabella tipi di pagamento con dati dal server
 */
export async function PaymentTypesTable() {
  let paymentTypes;
  
  try {
    paymentTypes = await getPaymentTypes(false); // Mostra anche quelli disattivi
  } catch (error) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-destructive">
          Errore durante il recupero dei tipi di pagamento
        </p>
      </div>
    );
  }

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
