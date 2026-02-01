/**
 * Pagina Super Admin - Gestione Organizzazioni
 * 
 * PERMESSI: Solo Super Admin
 * 
 * FUNZIONALITÀ:
 * - Lista tutte le organizzazioni con conteggi
 * - Creazione nuova organizzazione
 * - Modifica organizzazione esistente
 * - Attiva/Disattiva organizzazione
 * - Visualizza statistiche (utenti, clienti, documenti)
 */

'use client';

import { useEffect, useState } from 'react';
import { 
  getOrganizations, 
  toggleOrganizationStatus 
} from '@/services/actions/organization-actions';
import { OrganizationForm } from '@/components/features/admin/OrganizationForm';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Building2, 
  Users, 
  FileText, 
  Package, 
  UserCircle,
  Plus,
  Pencil,
  Loader2,
  AlertCircle
} from 'lucide-react';

type Organization = {
  id: string;
  businessName: string;
  vatNumber?: string | null;
  fiscalCode?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  province?: string | null;
  plan: string;
  maxUsers: number;
  maxInvoicesPerYear: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  usersCount: number;
  entitiesCount: number;
  productsCount: number;
  documentsCount: number;
};

export default function OrganizationsAdminPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  /**
   * Carica lista organizzazioni
   */
  async function loadOrganizations() {
    setIsLoading(true);
    setError(null);

    const result = await getOrganizations();

    if (result.success) {
      setOrganizations(result.organizations as Organization[]);
    } else {
      setError(result.error || 'Errore nel caricamento');
    }

    setIsLoading(false);
  }

  useEffect(() => {
    loadOrganizations();
  }, []);

  /**
   * Attiva/Disattiva organizzazione
   */
  async function handleToggleActive(org: Organization) {
    const result = await toggleOrganizationStatus(org.id, !org.active);

    if (result.success) {
      showToast(result.message || 'Stato aggiornato', 'success');
      await loadOrganizations();
    } else {
      showToast(result.error || 'Errore aggiornamento stato', 'error');
    }
  }

  /**
   * Apri dialog per modifica
   */
  function handleEdit(org: Organization) {
    setEditingOrg(org);
    setIsDialogOpen(true);
  }

  /**
   * Apri dialog per creazione
   */
  function handleCreate() {
    setEditingOrg(null);
    setIsDialogOpen(true);
  }

  /**
   * Callback successo form
   */
  function handleFormSuccess() {
    setIsDialogOpen(false);
    setEditingOrg(null);
    showToast(
      editingOrg ? 'Organizzazione aggiornata' : 'Organizzazione creata',
      'success'
    );
    loadOrganizations();
  }

  /**
   * Callback errore form
   */
  function handleFormError(error: string) {
    showToast(error, 'error');
  }

  /**
   * Mostra toast temporaneo
   */
  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }

  /**
   * Formatta badge piano
   */
  function getPlanBadge(plan: string) {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      FREE: 'secondary',
      BASIC: 'default',
      PREMIUM: 'default',
    };

    return (
      <Badge variant={variants[plan] || 'outline'}>
        {plan}
      </Badge>
    );
  }

  // Calcola statistiche totali
  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter((o) => o.active).length;
  const totalUsers = organizations.reduce((acc, o) => acc + o.usersCount, 0);
  const totalDocuments = organizations.reduce((acc, o) => acc + o.documentsCount, 0);

  return (
    <div className="container mx-auto py-10 space-y-8">
      {/* Header con Statistiche */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestione Organizzazioni</h1>
            <p className="text-muted-foreground">
              Pannello Super Admin per gestire tutte le organizzazioni
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Nuova Organizzazione
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingOrg ? 'Modifica' : 'Nuova'} Organizzazione
                </DialogTitle>
                <DialogDescription>
                  {editingOrg
                    ? 'Modifica i dati dell\'organizzazione. Le modifiche saranno immediate.'
                    : 'Crea una nuova organizzazione nel sistema ERP.'}
                </DialogDescription>
              </DialogHeader>

              <OrganizationForm
                organization={editingOrg || undefined}
                onSuccess={handleFormSuccess}
                onError={handleFormError}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Cards Statistiche */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Organizzazioni</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrgs}</div>
              <p className="text-xs text-muted-foreground">
                {activeOrgs} attive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utenti Totali</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Su tutte le organizzazioni
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documenti</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDocuments}</div>
              <p className="text-xs text-muted-foreground">
                Preventivi, DDT, Fatture
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Media Utenti/Org</CardTitle>
              <UserCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalOrgs > 0 ? (totalUsers / totalOrgs).toFixed(1) : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Utenti per organizzazione
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Toast Notifica */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg p-4 shadow-lg ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-900 border border-green-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Tabella Organizzazioni */}
      <Card>
        <CardHeader>
          <CardTitle>Tutte le Organizzazioni</CardTitle>
          <CardDescription>
            Lista completa con statistiche e azioni
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Errore di caricamento</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={loadOrganizations} variant="outline">
                Riprova
              </Button>
            </div>
          ) : organizations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nessuna organizzazione</h3>
              <p className="text-muted-foreground mb-4">
                Crea la prima organizzazione per iniziare
              </p>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Crea Organizzazione
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableCaption>
                  {organizations.length} organizzazione/i nel sistema
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organizzazione</TableHead>
                    <TableHead>P.IVA / CF</TableHead>
                    <TableHead>Località</TableHead>
                    <TableHead>Piano</TableHead>
                    <TableHead className="text-center">
                      <Users className="h-4 w-4 inline" />
                    </TableHead>
                    <TableHead className="text-center">
                      <UserCircle className="h-4 w-4 inline" />
                    </TableHead>
                    <TableHead className="text-center">
                      <Package className="h-4 w-4 inline" />
                    </TableHead>
                    <TableHead className="text-center">
                      <FileText className="h-4 w-4 inline" />
                    </TableHead>
                    <TableHead className="text-center">Attiva</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{org.businessName}</div>
                          {org.email && (
                            <div className="text-xs text-muted-foreground">
                              {org.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {org.vatNumber && (
                            <div>P.IVA: {org.vatNumber}</div>
                          )}
                          {org.fiscalCode && (
                            <div className="text-muted-foreground text-xs">
                              CF: {org.fiscalCode}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {org.city && org.province ? (
                          <div className="text-sm">
                            {org.city} ({org.province})
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getPlanBadge(org.plan)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {org.usersCount}/{org.maxUsers}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {org.entitiesCount}
                      </TableCell>
                      <TableCell className="text-center">
                        {org.productsCount}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={org.documentsCount > 0 ? 'default' : 'secondary'}>
                          {org.documentsCount}/{org.maxInvoicesPerYear}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={org.active}
                          onCheckedChange={() => handleToggleActive(org)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(org)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
