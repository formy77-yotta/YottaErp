/**
 * Pagina principale Super Admin
 * 
 * Pagina principale per il Super Admin con accesso a tutte le funzionalità:
 * - Gestione Organizzazioni
 * - Configurazioni Standard
 * - Altre impostazioni future
 */

'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Settings,
  Users,
  FileText,
  Package,
  Ruler,
  ChevronRight,
  Shield,
  Download,
} from 'lucide-react';
import { initializeStandardConfigsAction } from '@/services/actions/standard-config-actions';
import { useState } from 'react';

export default function AdminHomePage() {
  const [isInitializing, setIsInitializing] = useState(false);

  async function handleInitializeConfigs() {
    setIsInitializing(true);
    try {
      const result = await initializeStandardConfigsAction();
      if (result.success) {
        alert(`Configurazioni standard inizializzate: ${result.data.count} configurazioni create`);
        window.location.reload();
      } else {
        alert(`Errore: ${result.error}`);
      }
    } catch (error) {
      console.error('Errore inizializzazione:', error);
      alert('Errore durante l\'inizializzazione');
    } finally {
      setIsInitializing(false);
    }
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Super Admin</h1>
            <p className="text-muted-foreground">
              Gestione centrale di tutte le funzionalità amministrative
            </p>
          </div>
        </div>
      </div>

      {/* Cards Funzionalità */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Gestione Organizzazioni */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>Organizzazioni</CardTitle>
                  <CardDescription>Gestisci tutte le organizzazioni</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Crea, modifica e gestisci le organizzazioni del sistema. Visualizza statistiche,
              attiva/disattiva organizzazioni e gestisci i limiti di sottoscrizione.
            </p>
            <Link href="/admin/organizations">
              <Button className="w-full" variant="default">
                Apri Gestione Organizzazioni
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Configurazioni Standard */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Settings className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle>Configurazioni Standard</CardTitle>
                  <CardDescription>Gestisci dati standard del sistema</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Configura le aliquote IVA, unità di misura e tipi documento standard che vengono
              caricate quando un'organizzazione usa i pulsanti "Carica Standard".
            </p>
            <div className="flex gap-2">
              <Link href="/admin/standard-configs" className="flex-1">
                <Button className="w-full" variant="default">
                  Apri Configurazioni Standard
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={handleInitializeConfigs}
                disabled={isInitializing}
                title="Inizializza configurazioni standard se non esistono"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Placeholder per future funzionalità */}
        <Card className="hover:shadow-lg transition-shadow opacity-60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <Users className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <CardTitle>Utenti Globali</CardTitle>
                  <CardDescription>Gestione utenti sistema</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Funzionalità in arrivo: gestione centralizzata di tutti gli utenti del sistema,
              assegnazione ruoli, gestione permessi.
            </p>
            <Button className="w-full" variant="outline" disabled>
              Presto Disponibile
            </Button>
          </CardContent>
        </Card>

        {/* Placeholder per future funzionalità */}
        <Card className="hover:shadow-lg transition-shadow opacity-60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <FileText className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <CardTitle>Report Sistema</CardTitle>
                  <CardDescription>Statistiche e report globali</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Funzionalità in arrivo: report aggregati su tutte le organizzazioni, statistiche
              di utilizzo, analisi performance.
            </p>
            <Button className="w-full" variant="outline" disabled>
              Presto Disponibile
            </Button>
          </CardContent>
        </Card>

        {/* Placeholder per future funzionalità */}
        <Card className="hover:shadow-lg transition-shadow opacity-60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <Package className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <CardTitle>Impostazioni Sistema</CardTitle>
                  <CardDescription>Configurazioni globali</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Funzionalità in arrivo: impostazioni globali del sistema, parametri di
              configurazione, gestione licenze e piani.
            </p>
            <Button className="w-full" variant="outline" disabled>
              Presto Disponibile
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sezione Informazioni */}
      <Card>
        <CardHeader>
          <CardTitle>Area Super Admin</CardTitle>
          <CardDescription>
            Accesso completo alle funzionalità amministrative del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-2">Funzionalità Disponibili</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>✅ Gestione completa organizzazioni</li>
                <li>✅ Configurazioni standard personalizzabili</li>
                <li>✅ Statistiche e monitoraggio</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">In Arrivo</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>⏳ Gestione utenti globali</li>
                <li>⏳ Report e analisi sistema</li>
                <li>⏳ Impostazioni sistema avanzate</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
