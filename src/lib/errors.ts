/**
 * Error classes per autenticazione e autorizzazione
 * 
 * File separato per evitare problemi con 'use server' e 'server-only'
 */

/**
 * Errore personalizzato per accesso non autorizzato
 */
export class UnauthorizedError extends Error {
  constructor(message: string = 'Non autenticato') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Errore personalizzato per accesso negato
 */
export class ForbiddenError extends Error {
  constructor(message: string = 'Accesso negato') {
    super(message);
    this.name = 'ForbiddenError';
  }
}
