/**
 * Pagina Accesso Negato
 * 
 * Mostrata quando un utente non autenticato tenta di accedere
 * a route protette (es. /organizations)
 */

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

function AccessDeniedContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const from = searchParams.get('from');

  const messages = {
    super_admin_required: {
      title: 'Area Riservata Super Admin',
      description: 'Questa sezione è accessibile solo agli amministratori di sistema.',
      details: 'La pagina che hai tentato di visitare contiene funzionalità critiche riservate ai Super Admin.',
    },
    not_authenticated: {
      title: 'Autenticazione Richiesta',
      description: 'Devi effettuare il login per accedere a questa pagina.',
      details: 'Per procedere, effettua il login con le tue credenziali.',
    },
    forbidden: {
      title: 'Accesso Negato',
      description: 'Non hai i permessi necessari per accedere a questa risorsa.',
      details: 'Contatta l\'amministratore se ritieni di dover avere accesso.',
    },
  };

  const message = messages[reason as keyof typeof messages] || messages.forbidden;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {message.title}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {message.description}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">{message.details}</p>
          </div>

          {from && (
            <div className="text-xs text-gray-500 bg-gray-100 rounded px-3 py-2 font-mono">
              Percorso richiesto: <span className="font-semibold">{from}</span>
            </div>
          )}

          {reason === 'super_admin_required' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs text-amber-800">
                <strong>Nota:</strong> L&apos;accesso a questa area è limitato per motivi di sicurezza.
                Solo gli utenti con privilegi di Super Admin possono gestire le organizzazioni.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="w-full sm:w-1/2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Indietro
          </Button>
          <Link href="/" className="w-full sm:w-1/2">
            <Button className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
          </Link>
        </CardFooter>
      </Card>

      <div className="fixed bottom-4 right-4 text-xs text-gray-500">
        YottaErp Security v1.0
      </div>
    </div>
  );
}

export default function AccessDeniedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Caricamento...</div>}>
      <AccessDeniedContent />
    </Suspense>
  );
}
