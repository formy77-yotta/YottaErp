/**
 * Schema di validazione per parametri di ricerca e ordinamento (DataTable server-side)
 *
 * Usato dalle pagine che espongono tabelle con ricerca, ordinamento e paginazione
 * tramite query string (es. /entities?page=1&perPage=10&sort=businessName.asc&q=acme).
 *
 * REGOLE:
 * - page, perPage: numeri con default
 * - sort: formato "campo.ordine" (es. "businessName.asc", "createdAt.desc")
 * - q: stringa opzionale per ricerca testuale
 */

import { z } from 'zod';

/** Ordini ammessi per il parametro sort */
const sortOrderSchema = z.enum(['asc', 'desc']);

/**
 * Schema per il parametro sort (formato "campo.ordine").
 * Esempi: "businessName.asc", "vatNumber.desc", "createdAt.desc"
 */
const sortParamSchema = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val || val.trim() === '') return true;
      const parts = val.trim().split('.');
      return parts.length === 2 && sortOrderSchema.safeParse(parts[1]).success;
    },
    { message: 'sort deve essere nel formato campo.ordine (es. businessName.asc)' }
  );

/**
 * Schema Zod per i parametri comuni di ricerca/paginazione/ordinamento.
 * Valida i query params delle pagine DataTable (entities, products, etc.).
 */
export const searchParamsSchema = z.object({
  /** Numero di pagina (1-based). Default: 1 */
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(1, parseInt(val, 10) || 1) : 1)),
  /** Elementi per pagina. Default: 10 */
  perPage: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10) || 10)) : 10)),
  /**
   * Ordinamento: "campo.ordine".
   * Esempi: "businessName.asc", "createdAt.desc"
   */
  sort: sortParamSchema,
  /** Ricerca testuale (aggiornata con debounce dal client) */
  q: z.string().optional().transform((val) => (val?.trim() || undefined)),
});

export type SearchParamsInput = z.input<typeof searchParamsSchema>;
export type SearchParams = z.infer<typeof searchParamsSchema>;

/**
 * Parsa e valida i searchParams dalla pagina (Record<string, string | string[] | undefined>).
 * Restituisce i valori con default applicati.
 */
export function parseSearchParams(
  raw: Record<string, string | string[] | undefined>
): SearchParams {
  const single = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;
  return searchParamsSchema.parse({
    page: single(raw.page),
    perPage: single(raw.perPage),
    sort: single(raw.sort),
    q: single(raw.q),
  });
}

/**
 * Estrae campo e ordine dal parametro sort.
 * @param sort - Valore validato (es. "businessName.asc")
 * @returns { field, order } o null se sort assente/invalido
 */
export function parseSortParam(sort: string | undefined): { field: string; order: 'asc' | 'desc' } | null {
  if (!sort || !sort.trim()) return null;
  const parts = sort.trim().split('.');
  if (parts.length !== 2) return null;
  const order = sortOrderSchema.safeParse(parts[1]);
  if (!order.success) return null;
  return { field: parts[0], order: order.data };
}
