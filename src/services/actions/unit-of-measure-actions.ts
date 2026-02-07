/**
 * Server Actions per gestione Unità di Misura
 * 
 * MULTITENANT: Ogni operazione è isolata per organizationId
 * 
 * RESPONSABILITÀ:
 * 1. Ottenere AuthContext (con organizationId)
 * 2. Validazione input con Zod
 * 3. Verificare permessi utente
 * 4. Chiamata a business logic con filtro organizationId
 * 5. Revalidazione cache Next.js
 * 6. Gestione errori e return type-safe
 */

'use server';

import { revalidatePath } from 'next/cache';
import { Decimal } from 'decimal.js';
import { prisma } from '@/lib/prisma';
import { getAuthContext, canWrite, verifyOrganizationAccess, ForbiddenError } from '@/lib/auth';
import { 
  createUnitOfMeasureSchema, 
  updateUnitOfMeasureSchema,
  type CreateUnitOfMeasureInput,
  type UpdateUnitOfMeasureInput
} from '@/schemas/unit-of-measure-schema';

/**
 * Tipo di ritorno standard per Server Actions
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Ottiene tutte le unità di misura dell'organizzazione corrente
 * 
 * MULTITENANT: Filtra automaticamente per organizationId
 * 
 * @returns Array di unità di misura
 */
export async function getUnitsOfMeasureAction(): Promise<ActionResult<Array<{
  id: string;
  code: string;
  name: string;
  measureClass: string;
  baseFactor: string; // Decimal come stringa per il frontend
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}>>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione (include organizationId)
    const ctx = await getAuthContext();

    // 2. Recupera unità di misura filtrate per organizzazione
    const units = await prisma.unitOfMeasure.findMany({
      where: {
        organizationId: ctx.organizationId,
      },
      orderBy: [
        { measureClass: 'asc' }, // Ordina per classe
        { code: 'asc' }, // Poi per codice
      ],
      select: {
        id: true,
        code: true,
        name: true,
        measureClass: true,
        baseFactor: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Converti Decimal in stringa per il frontend
    const unitsWithStringFactor = units.map(unit => ({
      ...unit,
      baseFactor: unit.baseFactor.toString(),
    }));

    return {
      success: true,
      data: unitsWithStringFactor,
    };
  } catch (error) {
    console.error('Errore recupero unità di misura:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante il recupero delle unità di misura',
    };
  }
}

/**
 * Crea una nuova unità di misura
 * 
 * MULTITENANT: L'unità di misura viene automaticamente associata all'organizzazione corrente
 * 
 * @param input - Dati unità di misura da creare
 * @returns Result con unità di misura creata o errore
 */
export async function createUnitOfMeasureAction(
  input: CreateUnitOfMeasureInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione (include organizationId)
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per creare unità di misura',
      };
    }

    // 3. Validazione con Zod
    const validatedData = createUnitOfMeasureSchema.parse(input);

    // 4. Normalizza codice (maiuscolo, trim)
    const normalizedCode = validatedData.code.trim().toUpperCase();

    // 5. Verifica unicità codice per organizzazione
    const existingUnit = await prisma.unitOfMeasure.findFirst({
      where: {
        organizationId: ctx.organizationId,
        code: normalizedCode,
      },
    });

    if (existingUnit) {
      return {
        success: false,
        error: 'Codice unità di misura già esistente per questa organizzazione',
      };
    }

    // 6. ✅ Creazione unità di misura con organizationId
    // BUSINESS RULE: validatedData.baseFactor è già una stringa (es. "1.000000")
    // Lo convertiamo in Decimal per il database
    const unit = await prisma.unitOfMeasure.create({
      data: {
        organizationId: ctx.organizationId, // ✅ Associa automaticamente all'organizzazione
        code: normalizedCode,
        name: validatedData.name.trim(),
        measureClass: validatedData.measureClass,
        baseFactor: new Decimal(validatedData.baseFactor), // ✅ Converte stringa in Decimal per DB
        active: validatedData.active,
      },
    });

    // 7. Revalidazione cache Next.js
    revalidatePath('/settings/unit-of-measure');

    return {
      success: true,
      data: { id: unit.id },
    };
  } catch (error) {
    console.error('Errore creazione unità di misura:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Gestione errori Prisma (es. unique constraint violation)
    if (error instanceof Error) {
      // Se è un errore di unique constraint per codice
      if (error.message.includes('organizationId_code') || error.message.includes('Unique constraint')) {
        return {
          success: false,
          error: 'Codice unità di misura già esistente per questa organizzazione',
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante la creazione dell\'unità di misura',
    };
  }
}

/**
 * Aggiorna un'unità di misura esistente
 * 
 * MULTITENANT: Verifica che l'unità di misura appartenga all'organizzazione corrente
 * 
 * @param input - Dati unità di misura da aggiornare (include id)
 * @returns Result con successo o errore
 */
export async function updateUnitOfMeasureAction(
  input: UpdateUnitOfMeasureInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per modificare unità di misura',
      };
    }

    // 3. Validazione con Zod
    const validatedData = updateUnitOfMeasureSchema.parse(input);

    // 4. ✅ Verifica esistenza E appartenenza all'organizzazione
    const existingUnit = await prisma.unitOfMeasure.findUnique({
      where: { id: validatedData.id },
      select: { id: true, organizationId: true, code: true },
    });

    if (!existingUnit) {
      return {
        success: false,
        error: 'Unità di misura non trovata',
      };
    }
    
    // ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, existingUnit);

    // 5. Normalizza codice se presente
    const normalizedCode = validatedData.code 
      ? validatedData.code.trim().toUpperCase()
      : undefined;

    // 6. Verifica unicità codice se è stato modificato
    if (normalizedCode && normalizedCode !== existingUnit.code) {
      const duplicateUnit = await prisma.unitOfMeasure.findFirst({
        where: {
          organizationId: ctx.organizationId,
          code: normalizedCode,
        },
      });

      if (duplicateUnit && duplicateUnit.id !== validatedData.id) {
        return {
          success: false,
          error: 'Codice unità di misura già esistente per questa organizzazione',
        };
      }
    }

    // 7. Aggiornamento unità di misura
    const updatedUnit = await prisma.unitOfMeasure.update({
      where: { id: validatedData.id },
      data: {
        ...(normalizedCode && { code: normalizedCode }),
        ...(validatedData.name !== undefined && { 
          name: validatedData.name.trim() 
        }),
        ...(validatedData.measureClass !== undefined && { 
          measureClass: validatedData.measureClass 
        }),
        ...(validatedData.baseFactor !== undefined && { 
          baseFactor: new Decimal(validatedData.baseFactor) // ✅ Converte stringa in Decimal
        }),
        ...(validatedData.active !== undefined && { active: validatedData.active }),
      },
    });

    // 8. Revalidazione cache
    revalidatePath('/settings/unit-of-measure');

    return {
      success: true,
      data: { id: updatedUnit.id },
    };
  } catch (error) {
    console.error('Errore aggiornamento unità di misura:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (error instanceof Error) {
      // Se è un errore di unique constraint per codice
      if (error.message.includes('organizationId_code') || error.message.includes('Unique constraint')) {
        return {
          success: false,
          error: 'Codice unità di misura già esistente per questa organizzazione',
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante l\'aggiornamento dell\'unità di misura',
    };
  }
}

/**
 * Elimina un'unità di misura
 * 
 * MULTITENANT: Verifica che l'unità di misura appartenga all'organizzazione corrente
 * 
 * @param id - ID unità di misura da eliminare
 * @returns Result con successo o errore
 */
export async function deleteUnitOfMeasureAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per eliminare unità di misura',
      };
    }

    // 3. ✅ Verifica esistenza E appartenenza all'organizzazione
    const existingUnit = await prisma.unitOfMeasure.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    });

    if (!existingUnit) {
      return {
        success: false,
        error: 'Unità di misura non trovata',
      };
    }
    
    // ✅ Verifica che appartenga all'organizzazione corrente
    verifyOrganizationAccess(ctx, existingUnit);

    // 4. Eliminazione unità di misura
    await prisma.unitOfMeasure.delete({
      where: { id },
    });

    // 5. Revalidazione cache
    revalidatePath('/settings/unit-of-measure');

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    console.error('Errore eliminazione unità di misura:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Errore durante l\'eliminazione dell\'unità di misura',
    };
  }
}

/**
 * Carica unità di misura standard italiane con relativi fattori di conversione
 * 
 * MULTITENANT: Le unità di misura vengono associate all'organizzazione corrente
 * 
 * @returns Result con numero di unità caricate o errore
 */
export async function seedDefaultUnitsOfMeasureAction(): Promise<ActionResult<{ count: number }>> {
  try {
    // 1. ✅ Ottieni contesto autenticazione
    const ctx = await getAuthContext();
    
    // 2. ✅ Verifica permessi scrittura
    if (!canWrite(ctx)) {
      return {
        success: false,
        error: 'Non hai i permessi per creare unità di misura',
      };
    }

    // 3. Verifica se esistono già unità di misura per questa organizzazione
    const existingCount = await prisma.unitOfMeasure.count({
      where: {
        organizationId: ctx.organizationId,
      },
    });

    if (existingCount > 0) {
      return {
        success: false,
        error: 'Unità di misura già presenti per questa organizzazione',
      };
    }

    // 4. ✅ Recupera configurazione standard dal database (Super Admin)
    const standardConfig = await prisma.standardConfig.findFirst({
      where: {
        type: 'UNITS_OF_MEASURE',
        active: true,
      },
      orderBy: {
        version: 'desc',
      },
    });

    // 5. Se non esiste configurazione standard, usa fallback hardcoded
    let defaultUnits: Array<{
      code: string;
      name: string;
      measureClass: string;
      baseFactor: Decimal;
      active: boolean;
    }>;

    if (standardConfig && Array.isArray(standardConfig.data)) {
      // ✅ Usa configurazione dal database
      defaultUnits = (standardConfig.data as Array<{
        code: string;
        name: string;
        measureClass: string;
        baseFactor: string;
        active: boolean;
      }>).map((unit) => ({
        code: unit.code,
        name: unit.name,
        measureClass: unit.measureClass,
        baseFactor: new Decimal(unit.baseFactor),
        active: unit.active,
      }));
    } else {
      // Fallback: Unità di misura standard italiane con fattori di conversione
      // Nota: baseFactor è relativo all'unità base della classe
      defaultUnits = [
        // PESO (WEIGHT) - Base: Grammi (G)
        {
          code: 'G',
          name: 'Grammi',
          measureClass: 'WEIGHT',
          baseFactor: new Decimal('1.000000'), // Unità base
          active: true,
        },
        {
          code: 'KG',
          name: 'Chilogrammi',
          measureClass: 'WEIGHT',
          baseFactor: new Decimal('1000.000000'), // 1 KG = 1000 G
          active: true,
        },
        {
          code: 'T',
          name: 'Tonnellate',
          measureClass: 'WEIGHT',
          baseFactor: new Decimal('1000000.000000'), // 1 T = 1.000.000 G
          active: true,
        },
        {
          code: 'MG',
          name: 'Milligrammi',
          measureClass: 'WEIGHT',
          baseFactor: new Decimal('0.001000'), // 1 MG = 0.001 G
          active: true,
        },
        
        // LUNGHEZZA (LENGTH) - Base: Millimetri (MM)
        {
          code: 'MM',
          name: 'Millimetri',
          measureClass: 'LENGTH',
          baseFactor: new Decimal('1.000000'), // Unità base
          active: true,
        },
        {
          code: 'CM',
          name: 'Centimetri',
          measureClass: 'LENGTH',
          baseFactor: new Decimal('10.000000'), // 1 CM = 10 MM
          active: true,
        },
        {
          code: 'M',
          name: 'Metri',
          measureClass: 'LENGTH',
          baseFactor: new Decimal('1000.000000'), // 1 M = 1000 MM
          active: true,
        },
        {
          code: 'KM',
          name: 'Chilometri',
          measureClass: 'LENGTH',
          baseFactor: new Decimal('1000000.000000'), // 1 KM = 1.000.000 MM
          active: true,
        },
        
        // VOLUME (VOLUME) - Base: Millilitri (ML)
        {
          code: 'ML',
          name: 'Millilitri',
          measureClass: 'VOLUME',
          baseFactor: new Decimal('1.000000'), // Unità base
          active: true,
        },
        {
          code: 'L',
          name: 'Litri',
          measureClass: 'VOLUME',
          baseFactor: new Decimal('1000.000000'), // 1 L = 1000 ML
          active: true,
        },
        {
          code: 'M3',
          name: 'Metri cubi',
          measureClass: 'VOLUME',
          baseFactor: new Decimal('1000000.000000'), // 1 M3 = 1.000.000 ML
          active: true,
        },
        
        // PEZZI (PIECE) - Base: Pezzi (PZ)
        {
          code: 'PZ',
          name: 'Pezzi',
          measureClass: 'PIECE',
          baseFactor: new Decimal('1.000000'), // Unità base
          active: true,
        },
        {
          code: 'CT',
          name: 'Cartoni',
          measureClass: 'PIECE',
          baseFactor: new Decimal('1.000000'), // 1 CT = 1 PZ (stessa unità)
          active: true,
        },
        {
          code: 'SC',
          name: 'Scatole',
          measureClass: 'PIECE',
          baseFactor: new Decimal('1.000000'), // 1 SC = 1 PZ (stessa unità)
          active: true,
        },
        
        // SUPERFICIE (AREA) - Base: Metri quadri (M2)
        {
          code: 'M2',
          name: 'Metri quadri',
          measureClass: 'AREA',
          baseFactor: new Decimal('1.000000'), // Unità base
          active: true,
        },
        {
          code: 'HA',
          name: 'Ettari',
          measureClass: 'AREA',
          baseFactor: new Decimal('10000.000000'), // 1 HA = 10.000 M2
          active: true,
        },
      ];
    }

    // 6. Crea tutte le unità di misura in transazione
    // Usiamo una transazione per creare i record uno alla volta
    // Questo evita problemi di serializzazione Decimal con createMany
    await prisma.$transaction(
      defaultUnits.map((unit) =>
        prisma.unitOfMeasure.create({
          data: {
            organizationId: ctx.organizationId,
            code: unit.code,
            name: unit.name,
            measureClass: unit.measureClass,
            baseFactor: unit.baseFactor, // Prisma accetta Decimal direttamente
            active: unit.active,
          },
        })
      )
    );

    // 7. Revalidazione cache
    revalidatePath('/settings/unit-of-measure');

    return {
      success: true,
      data: { count: defaultUnits.length },
    };
  } catch (error) {
    console.error('Errore caricamento unità di misura standard:', error);

    if (error instanceof ForbiddenError) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Gestione errori Prisma (es. unique constraint violation)
    if (error instanceof Error) {
      // Se è un errore di unique constraint per codice
      if (error.message.includes('organizationId_code') || error.message.includes('Unique constraint')) {
        return {
          success: false,
          error: 'Una o più unità di misura hanno codici già esistenti per questa organizzazione',
        };
      }
      
      // Log dell'errore completo per debug
      console.error('Dettagli errore:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      
      return {
        success: false,
        error: error.message || 'Errore durante il caricamento delle unità di misura standard',
      };
    }

    return {
      success: false,
      error: 'Errore sconosciuto durante il caricamento delle unità di misura standard',
    };
  }
}