/**
 * Server Actions per gestione configurazioni standard (Super Admin)
 * 
 * Permette al Super Admin di configurare i dati standard che vengono
 * caricati quando un'organizzazione usa i pulsanti "Carica Standard":
 * - Aliquote IVA standard
 * - Unità di misura standard
 * - Tipi documento standard
 */

'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { Decimal } from 'decimal.js';
import type { ActionResult } from '@/types/action-result';
import { ForbiddenError } from '@/lib/auth';

// ============================================================================
// UTILITY - VERIFICA SUPER ADMIN
// ============================================================================

/**
 * Verifica se l'utente corrente è Super Admin
 * 
 * @returns true se Super Admin, false altrimenti
 */
async function isSuperAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get('userId')?.value;
  
  if (!userIdCookie) {
    return false;
  }
  
  // Bypass development
  if (process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_AUTH === 'true') {
    return true;
  }

  try {
    // Verifica nel database
    const user = await prisma.user.findUnique({
      where: { id: userIdCookie },
      select: { isSuperAdmin: true, active: true },
    });

    return user?.active && user?.isSuperAdmin || false;
  } catch (error) {
    console.error('Errore verifica Super Admin:', error);
    return false;
  }
}

// ============================================================================
// TIPI E INTERFACCE
// ============================================================================

export type StandardConfigType = 'VAT_RATES' | 'UNITS_OF_MEASURE' | 'DOCUMENT_TYPES';

export interface VatRateConfig {
  name: string;
  value: string; // Decimal come stringa per JSON
  nature: string | null;
  description: string | null;
  isDefault: boolean;
  active: boolean;
}

export interface UnitOfMeasureConfig {
  code: string;
  name: string;
  measureClass: string;
  baseFactor: string; // Decimal come stringa per JSON
  active: boolean;
}

export interface DocumentTypeConfig {
  code: string;
  description: string;
  numeratorCode: string;
  inventoryMovement: boolean;
  valuationImpact: boolean;
  operationSignStock: number | null;
  operationSignValuation: number | null;
  active: boolean;
}

// ============================================================================
// CRUD CONFIGURAZIONI STANDARD
// ============================================================================

/**
 * Ottiene tutte le configurazioni standard (Super Admin)
 * 
 * PERMESSI: Solo Super Admin
 * 
 * @returns Array di configurazioni standard
 */
export async function getStandardConfigsAction(): Promise<ActionResult<Array<{
  id: string;
  type: StandardConfigType;
  data: unknown;
  version: number;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}>>> {
  try {
    // 1. Verifica Super Admin
    if (!(await isSuperAdmin())) {
      return {
        success: false,
        error: 'Accesso negato. Solo Super Admin può gestire configurazioni standard.',
      };
    }

    // 2. Recupera tutte le configurazioni
    const configs = await prisma.standardConfig.findMany({
      orderBy: [
        { type: 'asc' },
        { active: 'desc' },
        { version: 'desc' },
      ],
    });

    return {
      success: true,
      data: configs,
    };
  } catch (error) {
    console.error('Errore recupero configurazioni standard:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante il recupero delle configurazioni standard',
    };
  }
}

/**
 * Ottiene una configurazione standard specifica per tipo (Super Admin)
 * 
 * PERMESSI: Solo Super Admin
 * 
 * @param type Tipo di configurazione
 * @returns Configurazione standard attiva per il tipo specificato
 */
export async function getStandardConfigByTypeAction(
  type: StandardConfigType
): Promise<ActionResult<{
  id: string;
  type: StandardConfigType;
  data: unknown;
  version: number;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
} | null>> {
  try {
    // 1. Verifica Super Admin
    if (!(await isSuperAdmin())) {
      return {
        success: false,
        error: 'Accesso negato. Solo Super Admin può gestire configurazioni standard.',
      };
    }

    // 2. Recupera configurazione attiva per tipo
    const config = await prisma.standardConfig.findFirst({
      where: {
        type,
        active: true,
      },
      orderBy: {
        version: 'desc',
      },
    });

    return {
      success: true,
      data: config,
    };
  } catch (error) {
    console.error('Errore recupero configurazione standard:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante il recupero della configurazione standard',
    };
  }
}

/**
 * Crea o aggiorna una configurazione standard (Super Admin)
 * 
 * PERMESSI: Solo Super Admin
 * 
 * NOTA: Se esiste già una configurazione attiva per questo tipo,
 * viene disattivata e creata una nuova versione.
 * 
 * @param type Tipo di configurazione
 * @param data Dati della configurazione (JSON)
 * @param description Descrizione opzionale
 * @returns Configurazione creata
 */
export async function upsertStandardConfigAction(
  type: StandardConfigType,
  data: unknown,
  description?: string | null
): Promise<ActionResult<{ id: string; version: number }>> {
  try {
    // 1. Verifica Super Admin
    if (!(await isSuperAdmin())) {
      return {
        success: false,
        error: 'Accesso negato. Solo Super Admin può gestire configurazioni standard.',
      };
    }

    // 2. Valida dati in base al tipo
    if (!validateConfigData(type, data)) {
      return {
        success: false,
        error: `Dati non validi per il tipo ${type}`,
      };
    }

    // 3. Disattiva configurazioni attive esistenti per questo tipo
    await prisma.standardConfig.updateMany({
      where: {
        type,
        active: true,
      },
      data: {
        active: false,
      },
    });

    // 4. Trova la versione più alta per questo tipo
    const latestConfig = await prisma.standardConfig.findFirst({
      where: { type },
      orderBy: { version: 'desc' },
    });

    const nextVersion = latestConfig ? latestConfig.version + 1 : 1;

    // 5. Crea nuova configurazione
    const config = await prisma.standardConfig.create({
      data: {
        type,
        data: data as any, // Prisma accetta JSON
        version: nextVersion,
        description: description || null,
        active: true,
      },
    });

    // 6. Revalidazione cache
    revalidatePath('/admin/standard-configs');

    return {
      success: true,
      data: {
        id: config.id,
        version: config.version,
      },
    };
  } catch (error) {
    console.error('Errore creazione configurazione standard:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante la creazione della configurazione standard',
    };
  }
}

/**
 * Disattiva una configurazione standard (Super Admin)
 * 
 * PERMESSI: Solo Super Admin
 * 
 * @param id ID della configurazione
 * @returns Successo
 */
export async function deactivateStandardConfigAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. Verifica Super Admin
    if (!(await isSuperAdmin())) {
      return {
        success: false,
        error: 'Accesso negato. Solo Super Admin può gestire configurazioni standard.',
      };
    }

    // 2. Disattiva configurazione
    await prisma.standardConfig.update({
      where: { id },
      data: { active: false },
    });

    // 3. Revalidazione cache
    revalidatePath('/admin/standard-configs');

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    console.error('Errore disattivazione configurazione standard:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante la disattivazione della configurazione standard',
    };
  }
}

/**
 * Elimina una configurazione standard (Super Admin)
 * 
 * PERMESSI: Solo Super Admin
 * 
 * @param id ID della configurazione
 * @returns Successo
 */
export async function deleteStandardConfigAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. Verifica Super Admin
    if (!(await isSuperAdmin())) {
      return {
        success: false,
        error: 'Accesso negato. Solo Super Admin può gestire configurazioni standard.',
      };
    }

    // 2. Elimina configurazione
    await prisma.standardConfig.delete({
      where: { id },
    });

    // 3. Revalidazione cache
    revalidatePath('/admin/standard-configs');

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    console.error('Errore eliminazione configurazione standard:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante l\'eliminazione della configurazione standard',
    };
  }
}

/**
 * Inizializza tutte le configurazioni standard con i dati predefiniti (Super Admin)
 * 
 * PERMESSI: Solo Super Admin
 * 
 * Crea le configurazioni standard per:
 * - Aliquote IVA standard italiane
 * - Unità di misura standard italiane
 * - Tipi documento standard
 * 
 * @returns Numero di configurazioni create
 */
export async function initializeStandardConfigsAction(): Promise<ActionResult<{ count: number }>> {
  try {
    // 1. Verifica Super Admin
    if (!(await isSuperAdmin())) {
      return {
        success: false,
        error: 'Accesso negato. Solo Super Admin può inizializzare configurazioni standard.',
      };
    }

    let createdCount = 0;

    // 2. Inizializza Aliquote IVA
    const vatRatesExists = await prisma.standardConfig.findFirst({
      where: { type: 'VAT_RATES', active: true },
    });

    if (!vatRatesExists) {
      const vatRatesData: VatRateConfig[] = [
        {
          name: 'Standard 22%',
          value: '0.2200',
          nature: null,
          description: 'Aliquota IVA standard italiana',
          isDefault: true,
          active: true,
        },
        {
          name: 'Ridotta 10%',
          value: '0.1000',
          nature: null,
          description: 'Aliquota IVA ridotta',
          isDefault: false,
          active: true,
        },
        {
          name: 'Ridotta 5%',
          value: '0.0500',
          nature: null,
          description: 'Aliquota IVA ridotta',
          isDefault: false,
          active: true,
        },
        {
          name: 'Super Ridotta 4%',
          value: '0.0400',
          nature: null,
          description: 'Aliquota IVA super ridotta',
          isDefault: false,
          active: true,
        },
        {
          name: 'Esente',
          value: '0.0000',
          nature: 'N4',
          description: 'Operazione esente IVA',
          isDefault: false,
          active: true,
        },
      ];

      await prisma.standardConfig.create({
        data: {
          type: 'VAT_RATES',
          data: vatRatesData,
          version: 1,
          description: 'Aliquote IVA standard italiane',
          active: true,
        },
      });
      createdCount++;
    }

    // 3. Inizializza Unità di Misura
    const unitsExists = await prisma.standardConfig.findFirst({
      where: { type: 'UNITS_OF_MEASURE', active: true },
    });

    if (!unitsExists) {
      const unitsData: UnitOfMeasureConfig[] = [
        // PESO (WEIGHT) - Base: Grammi (G)
        {
          code: 'G',
          name: 'Grammi',
          measureClass: 'WEIGHT',
          baseFactor: '1.000000',
          active: true,
        },
        {
          code: 'KG',
          name: 'Chilogrammi',
          measureClass: 'WEIGHT',
          baseFactor: '1000.000000',
          active: true,
        },
        {
          code: 'T',
          name: 'Tonnellate',
          measureClass: 'WEIGHT',
          baseFactor: '1000000.000000',
          active: true,
        },
        {
          code: 'MG',
          name: 'Milligrammi',
          measureClass: 'WEIGHT',
          baseFactor: '0.001000',
          active: true,
        },
        // LUNGHEZZA (LENGTH) - Base: Millimetri (MM)
        {
          code: 'MM',
          name: 'Millimetri',
          measureClass: 'LENGTH',
          baseFactor: '1.000000',
          active: true,
        },
        {
          code: 'CM',
          name: 'Centimetri',
          measureClass: 'LENGTH',
          baseFactor: '10.000000',
          active: true,
        },
        {
          code: 'M',
          name: 'Metri',
          measureClass: 'LENGTH',
          baseFactor: '1000.000000',
          active: true,
        },
        {
          code: 'KM',
          name: 'Chilometri',
          measureClass: 'LENGTH',
          baseFactor: '1000000.000000',
          active: true,
        },
        // VOLUME (VOLUME) - Base: Millilitri (ML)
        {
          code: 'ML',
          name: 'Millilitri',
          measureClass: 'VOLUME',
          baseFactor: '1.000000',
          active: true,
        },
        {
          code: 'L',
          name: 'Litri',
          measureClass: 'VOLUME',
          baseFactor: '1000.000000',
          active: true,
        },
        {
          code: 'M3',
          name: 'Metri cubi',
          measureClass: 'VOLUME',
          baseFactor: '1000000.000000',
          active: true,
        },
        // PEZZI (PIECE) - Base: Pezzi (PZ)
        {
          code: 'PZ',
          name: 'Pezzi',
          measureClass: 'PIECE',
          baseFactor: '1.000000',
          active: true,
        },
        {
          code: 'CT',
          name: 'Cartoni',
          measureClass: 'PIECE',
          baseFactor: '1.000000',
          active: true,
        },
        {
          code: 'SC',
          name: 'Scatole',
          measureClass: 'PIECE',
          baseFactor: '1.000000',
          active: true,
        },
        // SUPERFICIE (AREA) - Base: Metri quadri (M2)
        {
          code: 'M2',
          name: 'Metri quadri',
          measureClass: 'AREA',
          baseFactor: '1.000000',
          active: true,
        },
        {
          code: 'HA',
          name: 'Ettari',
          measureClass: 'AREA',
          baseFactor: '10000.000000',
          active: true,
        },
      ];

      await prisma.standardConfig.create({
        data: {
          type: 'UNITS_OF_MEASURE',
          data: unitsData,
          version: 1,
          description: 'Unità di misura standard italiane',
          active: true,
        },
      });
      createdCount++;
    }

    // 4. Inizializza Tipi Documento
    const docTypesExists = await prisma.standardConfig.findFirst({
      where: { type: 'DOCUMENT_TYPES', active: true },
    });

    if (!docTypesExists) {
      const docTypesData: DocumentTypeConfig[] = [
        // CICLO ATTIVO (VENDITA)
        {
          code: 'PRO',
          description: 'Preventivo',
          numeratorCode: 'PRO',
          inventoryMovement: false,
          valuationImpact: false,
          operationSignStock: null,
          operationSignValuation: null,
          active: true,
        },
        {
          code: 'ORD',
          description: 'Ordine Cliente',
          numeratorCode: 'ORD',
          inventoryMovement: false,
          valuationImpact: false,
          operationSignStock: null,
          operationSignValuation: null,
          active: true,
        },
        {
          code: 'DDT',
          description: 'DDT Vendita',
          numeratorCode: 'DDT',
          inventoryMovement: true,
          valuationImpact: false,
          operationSignStock: -1,
          operationSignValuation: null,
          active: true,
        },
        {
          code: 'FAI',
          description: 'Fattura Immediata',
          numeratorCode: 'FAT',
          inventoryMovement: true,
          valuationImpact: true,
          operationSignStock: -1,
          operationSignValuation: 1,
          active: true,
        },
        {
          code: 'FAD',
          description: 'Fattura Differita',
          numeratorCode: 'FAT',
          inventoryMovement: false,
          valuationImpact: true,
          operationSignStock: null,
          operationSignValuation: 1,
          active: true,
        },
        {
          code: 'NDC',
          description: 'Nota di Credito',
          numeratorCode: 'FAT',
          inventoryMovement: true,
          valuationImpact: true,
          operationSignStock: 1,
          operationSignValuation: -1,
          active: true,
        },
        // CICLO PASSIVO (ACQUISTO)
        {
          code: 'OF',
          description: 'Ordine Fornitore',
          numeratorCode: 'OF',
          inventoryMovement: false,
          valuationImpact: false,
          operationSignStock: null,
          operationSignValuation: null,
          active: true,
        },
        {
          code: 'CAF',
          description: 'Carico Fornitore',
          numeratorCode: 'CAF',
          inventoryMovement: true,
          valuationImpact: false,
          operationSignStock: 1,
          operationSignValuation: null,
          active: true,
        },
        {
          code: 'FAC',
          description: 'Fattura Acquisto',
          numeratorCode: 'FAC',
          inventoryMovement: true,
          valuationImpact: true,
          operationSignStock: 1,
          operationSignValuation: 1,
          active: true,
        },
        {
          code: 'NCF',
          description: 'Nota Credito Fornitore',
          numeratorCode: 'FAC',
          inventoryMovement: true,
          valuationImpact: true,
          operationSignStock: -1,
          operationSignValuation: -1,
          active: true,
        },
      ];

      await prisma.standardConfig.create({
        data: {
          type: 'DOCUMENT_TYPES',
          data: docTypesData,
          version: 1,
          description: 'Tipi documento standard per ciclo attivo e passivo',
          active: true,
        },
      });
      createdCount++;
    }

    // 5. Revalidazione cache
    revalidatePath('/admin/standard-configs');

    return {
      success: true,
      data: { count: createdCount },
    };
  } catch (error) {
    console.error('Errore inizializzazione configurazioni standard:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante l\'inizializzazione delle configurazioni standard',
    };
  }
}

// ============================================================================
// UTILITY - VALIDAZIONE DATI
// ============================================================================

/**
 * Valida i dati di una configurazione in base al tipo
 * 
 * @param type Tipo di configurazione
 * @param data Dati da validare
 * @returns true se validi, false altrimenti
 */
function validateConfigData(type: StandardConfigType, data: unknown): boolean {
  if (!Array.isArray(data)) {
    return false;
  }

  switch (type) {
    case 'VAT_RATES':
      return data.every((item: unknown) => {
        if (typeof item !== 'object' || item === null) return false;
        const vat = item as Record<string, unknown>;
        return (
          typeof vat.name === 'string' &&
          typeof vat.value === 'string' &&
          (vat.nature === null || typeof vat.nature === 'string') &&
          (vat.description === null || typeof vat.description === 'string') &&
          typeof vat.isDefault === 'boolean' &&
          typeof vat.active === 'boolean'
        );
      });

    case 'UNITS_OF_MEASURE':
      return data.every((item: unknown) => {
        if (typeof item !== 'object' || item === null) return false;
        const unit = item as Record<string, unknown>;
        return (
          typeof unit.code === 'string' &&
          typeof unit.name === 'string' &&
          typeof unit.measureClass === 'string' &&
          typeof unit.baseFactor === 'string' &&
          typeof unit.active === 'boolean'
        );
      });

    case 'DOCUMENT_TYPES':
      return data.every((item: unknown) => {
        if (typeof item !== 'object' || item === null) return false;
        const docType = item as Record<string, unknown>;
        return (
          typeof docType.code === 'string' &&
          typeof docType.description === 'string' &&
          typeof docType.numeratorCode === 'string' &&
          typeof docType.inventoryMovement === 'boolean' &&
          typeof docType.valuationImpact === 'boolean' &&
          (docType.operationSignStock === null || typeof docType.operationSignStock === 'number') &&
          (docType.operationSignValuation === null || typeof docType.operationSignValuation === 'number') &&
          typeof docType.active === 'boolean'
        );
      });

    default:
      return false;
  }
}
