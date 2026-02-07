/**
 * Pagina Super Admin - Gestione Configurazioni Standard
 * 
 * PERMESSI: Solo Super Admin
 * 
 * FUNZIONALITÀ:
 * - Visualizza configurazioni standard (IVA, unità di misura, tipi documento)
 * - Modifica configurazioni standard
 * - Crea nuove versioni delle configurazioni
 * - Attiva/Disattiva configurazioni
 */

'use client';

import { useEffect, useState } from 'react';
import {
  getStandardConfigsAction,
  getStandardConfigByTypeAction,
  upsertStandardConfigAction,
  deactivateStandardConfigAction,
  deleteStandardConfigAction,
  initializeStandardConfigsAction,
  type StandardConfigType,
} from '@/services/actions/standard-config-actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  Loader2,
  AlertCircle,
  Edit,
  Trash2,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { StandardConfigEditor } from '@/components/features/admin/StandardConfigEditor';

type StandardConfig = {
  id: string;
  type: StandardConfigType;
  data: unknown;
  version: number;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const CONFIG_TYPE_LABELS: Record<StandardConfigType, string> = {
  VAT_RATES: 'Aliquote IVA',
  UNITS_OF_MEASURE: 'Unità di Misura',
  DOCUMENT_TYPES: 'Tipi Documento',
};

export default function StandardConfigsAdminPage() {
  const [configs, setConfigs] = useState<StandardConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<StandardConfig | null>(null);
  const [editingType, setEditingType] = useState<StandardConfigType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingConfig, setDeletingConfig] = useState<StandardConfig | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<StandardConfigType>('VAT_RATES');

  /**
   * Carica lista configurazioni
   */
  async function loadConfigs() {
    setIsLoading(true);
    setError(null);

    const result = await getStandardConfigsAction();

    if (result.success) {
      setConfigs(result.data || []);
    } else {
      setError(result.error || 'Errore nel caricamento');
    }

    setIsLoading(false);
  }

  useEffect(() => {
    loadConfigs();
  }, []);

  /**
   * Apri dialog per modifica
   */
  async function handleEdit(type: StandardConfigType) {
    const result = await getStandardConfigByTypeAction(type);

    if (result.success && result.data) {
      setEditingConfig(result.data as StandardConfig);
      setEditingType(type);
      setIsDialogOpen(true);
    } else {
      // Nessuna configurazione esistente, crea nuova
      setEditingConfig(null);
      setEditingType(type);
      setIsDialogOpen(true);
    }
  }

  /**
   * Callback successo form
   */
  function handleFormSuccess() {
    setIsDialogOpen(false);
    setEditingConfig(null);
    setEditingType(null);
    showToast('Configurazione salvata con successo', 'success');
    loadConfigs();
  }

  /**
   * Callback errore form
   */
  function handleFormError(error: string) {
    showToast(error, 'error');
  }

  /**
   * Salva configurazione
   */
  async function handleSaveConfig(
    type: StandardConfigType,
    data: unknown,
    description?: string | null
  ) {
    const result = await upsertStandardConfigAction(type, data, description);

    if (result.success) {
      handleFormSuccess();
    } else {
      handleFormError(result.error || 'Errore durante il salvataggio');
    }
  }

  /**
   * Disattiva configurazione
   */
  async function handleDeactivate(config: StandardConfig) {
    const result = await deactivateStandardConfigAction(config.id);

    if (result.success) {
      showToast('Configurazione disattivata', 'success');
      await loadConfigs();
    } else {
      showToast(result.error || 'Errore durante la disattivazione', 'error');
    }
  }

  /**
   * Elimina configurazione
   */
  async function handleDelete() {
    if (!deletingConfig) return;

    const result = await deleteStandardConfigAction(deletingConfig.id);

    if (result.success) {
      showToast('Configurazione eliminata', 'success');
      setIsDeleteDialogOpen(false);
      setDeletingConfig(null);
      await loadConfigs();
    } else {
      showToast(result.error || 'Errore durante l\'eliminazione', 'error');
    }
  }

  /**
   * Inizializza configurazioni standard
   */
  async function handleInitialize() {
    setIsLoading(true);
    const result = await initializeStandardConfigsAction();

    if (result.success) {
      showToast(
        `Configurazioni standard inizializzate: ${result.data.count} configurazioni create`,
        'success'
      );
      await loadConfigs();
    } else {
      showToast(result.error || 'Errore durante l\'inizializzazione', 'error');
    }
    setIsLoading(false);
  }

  /**
   * Mostra toast
   */
  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }

  /**
   * Filtra configurazioni per tipo
   */
  function getConfigsByType(type: StandardConfigType): StandardConfig[] {
    return configs.filter((c) => c.type === type);
  }

  /**
   * Ottiene configurazione attiva per tipo
   */
  function getActiveConfig(type: StandardConfigType): StandardConfig | undefined {
    return configs.find((c) => c.type === type && c.active);
  }

  /**
   * Verifica se ci sono configurazioni attive
   */
  function hasActiveConfigs(): boolean {
    return (
      getActiveConfig('VAT_RATES') !== undefined ||
      getActiveConfig('UNITS_OF_MEASURE') !== undefined ||
      getActiveConfig('DOCUMENT_TYPES') !== undefined
    );
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
            <div className="flex gap-2 mt-4">
              <Button onClick={loadConfigs} variant="outline">
                Riprova
              </Button>
              <Button onClick={handleInitialize}>
                Inizializza Configurazioni Standard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se non ci sono configurazioni, mostra pulsante inizializzazione
  if (!isLoading && !hasActiveConfigs() && configs.length === 0) {
    return (
      <div className="container mx-auto py-10 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configurazioni Standard</h1>
            <p className="text-muted-foreground">
              Gestisci le configurazioni standard caricate dai pulsanti "Carica Standard"
            </p>
          </div>
        </div>

        {/* Card Inizializzazione */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Nessuna Configurazione Standard
            </CardTitle>
            <CardDescription>
              Le configurazioni standard non sono ancora state inizializzate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Clicca il pulsante qui sotto per inizializzare automaticamente le configurazioni
              standard con i dati predefiniti:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Aliquote IVA standard italiane (22%, 10%, 5%, 4%, Esente)</li>
              <li>Unità di misura standard (Peso, Lunghezza, Volume, Pezzi, Superficie)</li>
              <li>Tipi documento standard (Preventivo, Ordine, DDT, Fattura, Nota Credito)</li>
            </ul>
            <Button onClick={handleInitialize} size="lg" className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Inizializza Configurazioni Standard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurazioni Standard</h1>
          <p className="text-muted-foreground">
            Gestisci le configurazioni standard caricate dai pulsanti "Carica Standard"
          </p>
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

      {/* Tabs per tipo configurazione */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StandardConfigType)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="VAT_RATES">Aliquote IVA</TabsTrigger>
          <TabsTrigger value="UNITS_OF_MEASURE">Unità di Misura</TabsTrigger>
          <TabsTrigger value="DOCUMENT_TYPES">Tipi Documento</TabsTrigger>
        </TabsList>

        {/* Tab Aliquote IVA */}
        <TabsContent value="VAT_RATES" className="space-y-4">
          <ConfigTypeSection
            type="VAT_RATES"
            configs={getConfigsByType('VAT_RATES')}
            activeConfig={getActiveConfig('VAT_RATES')}
            onEdit={() => handleEdit('VAT_RATES')}
            onDeactivate={handleDeactivate}
            onDelete={(config) => {
              setDeletingConfig(config);
              setIsDeleteDialogOpen(true);
            }}
          />
        </TabsContent>

        {/* Tab Unità di Misura */}
        <TabsContent value="UNITS_OF_MEASURE" className="space-y-4">
          <ConfigTypeSection
            type="UNITS_OF_MEASURE"
            configs={getConfigsByType('UNITS_OF_MEASURE')}
            activeConfig={getActiveConfig('UNITS_OF_MEASURE')}
            onEdit={() => handleEdit('UNITS_OF_MEASURE')}
            onDeactivate={handleDeactivate}
            onDelete={(config) => {
              setDeletingConfig(config);
              setIsDeleteDialogOpen(true);
            }}
          />
        </TabsContent>

        {/* Tab Tipi Documento */}
        <TabsContent value="DOCUMENT_TYPES" className="space-y-4">
          <ConfigTypeSection
            type="DOCUMENT_TYPES"
            configs={getConfigsByType('DOCUMENT_TYPES')}
            activeConfig={getActiveConfig('DOCUMENT_TYPES')}
            onEdit={() => handleEdit('DOCUMENT_TYPES')}
            onDeactivate={handleDeactivate}
            onDelete={(config) => {
              setDeletingConfig(config);
              setIsDeleteDialogOpen(true);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog Modifica/Creazione */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Modifica' : 'Crea'} Configurazione{' '}
              {editingType && CONFIG_TYPE_LABELS[editingType]}
            </DialogTitle>
            <DialogDescription>
              {editingConfig
                ? 'Modifica la configurazione standard. Verrà creata una nuova versione.'
                : 'Crea una nuova configurazione standard per questo tipo.'}
            </DialogDescription>
          </DialogHeader>

          {editingType && (
            <StandardConfigEditor
              type={editingType}
              config={editingConfig}
              onSave={handleSaveConfig}
              onCancel={() => {
                setIsDialogOpen(false);
                setEditingConfig(null);
                setEditingType(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminazione */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina Configurazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questa configurazione? Questa azione non può essere
              annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Sezione per tipo configurazione
 */
function ConfigTypeSection({
  type,
  configs,
  activeConfig,
  onEdit,
  onDeactivate,
  onDelete,
}: {
  type: StandardConfigType;
  configs: StandardConfig[];
  activeConfig?: StandardConfig;
  onEdit: () => void;
  onDeactivate: (config: StandardConfig) => void;
  onDelete: (config: StandardConfig) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{CONFIG_TYPE_LABELS[type]}</CardTitle>
            <CardDescription>
              Configurazione standard utilizzata quando un'organizzazione clicca "Carica Standard"
            </CardDescription>
          </div>
          <Button onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            {activeConfig ? 'Modifica' : 'Crea'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activeConfig ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Attiva
              </Badge>
              <span className="text-sm text-muted-foreground">
                Versione {activeConfig.version} • Creata il{' '}
                {new Date(activeConfig.createdAt).toLocaleDateString('it-IT')}
              </span>
            </div>
            {activeConfig.description && (
              <p className="text-sm text-muted-foreground">{activeConfig.description}</p>
            )}
            <div className="text-sm">
              <strong>Elementi configurati:</strong>{' '}
              {Array.isArray(activeConfig.data) ? activeConfig.data.length : 'N/A'}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nessuna configurazione attiva per questo tipo</p>
            <Button onClick={onEdit} className="mt-4" variant="outline">
              Crea Configurazione
            </Button>
          </div>
        )}

        {/* Lista versioni storiche */}
        {configs.length > 0 && (
          <div className="mt-8 space-y-2">
            <h3 className="text-sm font-semibold">Versioni Storiche</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Versione</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Data Creazione</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell>{config.version}</TableCell>
                    <TableCell>
                      {config.active ? (
                        <Badge variant="default" className="bg-green-500">
                          Attiva
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Disattivata</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(config.createdAt).toLocaleDateString('it-IT')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {config.active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeactivate(config)}
                          >
                            Disattiva
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(config)}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
