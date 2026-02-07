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
  toggleOrganizationStatus,
  deleteOrganization 
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
  DialogFooter,
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
  Plus,
  Pencil,
  Loader2,
  AlertCircle,
  Trash2
} from 'lucide-react';

type Organization = {
  id: string;
  businessName: string;
  vatNumber?: string | null;
  fiscalCode?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  zipCode?: string | null;
  country?: string;
  email?: string | null;
  pec?: string | null;
  phone?: string | null;
  sdiCode?: string | null;
  logoUrl?: string | null;
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
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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
   * Elimina organizzazione
   */
  async function handleDelete() {
    if (!deletingOrg) return;

    const result = await deleteOrganization(deletingOrg.id);

    if (result.success) {
      showToast('Organizzazione eliminata', 'success');
      setIsDeleteDialogOpen(false);
      setDeletingOrg(null);
      await loadOrganizations();
    } else {
      showToast(result.error || 'Errore durante l\'eliminazione', 'error');
    }
  }

  /**
   * Mostra toast
   */
  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Errore
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={loadOrganizations} className="mt-4">
              Riprova
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calcola statistiche totali
  const totalOrganizations = organizations.length;
  const activeOrganizations = organizations.filter(o => o.active).length;
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
              <div className="text-2xl font-bold">{totalOrganizations}</div>
              <p className="text-xs text-muted-foreground">
                {activeOrganizations} attive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Utenti</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Utenti totali nel sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Documenti</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDocuments}</div>
              <p className="text-xs text-muted-foreground">
                Documenti totali
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizzazioni Attive</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeOrganizations}</div>
              <p className="text-xs text-muted-foreground">
                {totalOrganizations - activeOrganizations} disattivate
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg ${
            toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Tabella Organizzazioni */}
      <Card>
        <CardHeader>
          <CardTitle>Lista Organizzazioni</CardTitle>
          <CardDescription>
            Gestisci tutte le organizzazioni del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {organizations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessuna organizzazione trovata</p>
              <Button onClick={handleCreate} className="mt-4" variant="outline">
                Crea Prima Organizzazione
              </Button>
            </div>
          ) : (
            <Table>
              <TableCaption>
                Lista di tutte le organizzazioni nel sistema
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Organizzazione</TableHead>
                  <TableHead>Piano</TableHead>
                  <TableHead>Utenti</TableHead>
                  <TableHead>Documenti</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {org.logoUrl ? (
                          <img
                            src={org.logoUrl}
                            alt={org.businessName}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{org.businessName}</div>
                          {org.vatNumber && (
                            <div className="text-sm text-muted-foreground">
                              P.IVA: {org.vatNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{org.plan}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{org.usersCount}/{org.maxUsers}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{org.documentsCount}/{org.maxInvoicesPerYear}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={org.active}
                        onCheckedChange={() => handleToggleActive(org)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(org)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingOrg(org);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog Eliminazione */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina Organizzazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare l'organizzazione "{deletingOrg?.businessName}"?
              Questa azione eliminerà TUTTI i dati associati (clienti, prodotti, documenti, ecc.)
              e non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Elimina Definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
