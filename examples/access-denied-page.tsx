/**
 * Pagina Access Denied
 * 
 * Mostrata quando un utente tenta di accedere a route protette senza permessi
 * 
 * POSIZIONAMENTO: src/app/access-denied/page.tsx
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AccessDeniedPage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  const reason = searchParams.reason || 'unknown';
  
  const reasons: Record<string, { title: string; description: string }> = {
    super_admin_required: {
      title: 'Accesso Super Admin Richiesto',
      description: 'Questa pagina è accessibile solo agli amministratori di sistema con privilegi Super Admin.',
    },
    organization_access: {
      title: 'Accesso Organizzazione Negato',
      description: 'Non hai i permessi necessari per accedere ai dati di questa organizzazione.',
    },
    unauthorized: {
      title: 'Autenticazione Richiesta',
      description: 'Devi effettuare il login per accedere a questa pagina.',
    },
    unknown: {
      title: 'Accesso Negato',
      description: 'Non hai i permessi necessari per accedere a questa risorsa.',
    },
  };
  
  const { title, description } = reasons[reason] || reasons.unknown;

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-base">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm">Cosa puoi fare:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              {reason === 'super_admin_required' && (
                <>
                  <li>• Contatta l'amministratore di sistema</li>
                  <li>• Verifica di avere i privilegi corretti</li>
                  <li>• Torna alla dashboard principale</li>
                </>
              )}
              {reason === 'organization_access' && (
                <>
                  <li>• Contatta il proprietario dell'organizzazione</li>
                  <li>• Verifica di essere nella organizzazione corretta</li>
                  <li>• Cambia organizzazione se hai accesso ad altre</li>
                </>
              )}
              {reason === 'unauthorized' && (
                <>
                  <li>• Effettua il login con il tuo account</li>
                  <li>• Se non hai un account, registrati</li>
                  <li>• Verifica le tue credenziali</li>
                </>
              )}
              {reason === 'unknown' && (
                <>
                  <li>• Verifica i tuoi permessi</li>
                  <li>• Contatta l'assistenza</li>
                  <li>• Torna alla pagina principale</li>
                </>
              )}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href="javascript:history.back()">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Indietro
              </Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Link>
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-xs text-yellow-900">
                <strong>Development Mode:</strong> In modalità development, tutti gli utenti
                dovrebbero avere accesso Super Admin. Se vedi questo messaggio, verifica
                la configurazione del middleware.
              </p>
              <p className="text-xs text-yellow-700 mt-2">
                Reason: <code className="bg-yellow-100 px-1 rounded">{reason}</code>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
