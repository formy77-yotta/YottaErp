/**
 * Servizio per generazione XML Fattura Elettronica (formato FatturaPA)
 * 
 * DISTINZIONE TERMINOLOGICA:
 * - "Fattura Elettronica" = documento fiscale in formato XML (B2B, B2C, B2PA)
 * - "FatturaPA" = formato XML standard (stesso tracciato per tutti i destinatari)
 * - Il documento diventa "FatturaPA" solo se il destinatario è una PA
 * 
 * REGOLE FONDAMENTALI:
 * 1. ✅ Usa SOLO dati snapshot dal Document (mai JOIN per dati storici)
 * 2. ✅ Usa Decimal.js per tutti i calcoli monetari (mai number)
 * 3. ✅ Arrotondamento ROUND_HALF_UP per conformità fiscale
 * 4. ✅ Validazione P.IVA e Codice Fiscale prima di generare
 * 5. ✅ Multi-tenancy: verifica che documento appartenga all'organizationId
 * 
 * TRACCIATO: Formato FatturaPA versione 1.2.1 o successive
 * (stesso formato per fatture B2B, B2C e verso PA)
 * 
 * @see https://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2.1/FatturaPA_v1.2.1.pdf
 */

import { create } from 'xmlbuilder2';
import { Decimal } from 'decimal.js';
import { prisma } from '@/lib/prisma';
import { toDecimal } from '@/lib/decimal-utils';
import { validateItalianVAT, validateItalianFiscalCode } from '@/lib/validators';
import type { Prisma } from '@prisma/client';

/**
 * Errore personalizzato per generazione XML
 */
export class InvoiceXMLError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'InvoiceXMLError';
  }
}

/**
 * Tipo per documento con tutte le relazioni necessarie per XML
 */
type DocumentForXML = Prisma.DocumentGetPayload<{
  include: {
    organization: true;
    documentType: true;
    lines: {
      include: {
        vatRateRef: true;
      };
    };
  };
}>;

/**
 * Genera l'XML Fattura Elettronica (formato FatturaPA) per un documento
 * 
 * Il formato XML è lo stesso per tutte le fatture elettroniche (B2B, B2C, B2PA).
 * Il documento diventa "FatturaPA" solo se il destinatario è una Pubblica Amministrazione.
 * 
 * @param documentId - ID del documento da convertire in XML
 * @param organizationId - ID organizzazione (per sicurezza multi-tenant)
 * @returns XML string conforme al tracciato FatturaPA
 * @throws InvoiceXMLError se validazione fallisce o dati mancanti
 */
export async function generateInvoiceXML(
  documentId: string,
  organizationId: string
): Promise<string> {
  // 1. Recupera documento con tutte le relazioni necessarie
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      organization: true,
      documentType: true,
      lines: {
        include: {
          vatRateRef: true,
        },
        orderBy: {
          createdAt: 'asc', // Ordine righe
        },
      },
    },
  });

  if (!document) {
    throw new InvoiceXMLError('Documento non trovato', 'DOCUMENT_NOT_FOUND');
  }

  // 2. ✅ Verifica multi-tenancy
  if (document.organizationId !== organizationId) {
    throw new InvoiceXMLError(
      'Accesso negato: documento non appartiene alla tua organizzazione',
      'FORBIDDEN'
    );
  }

  // 3. ✅ Verifica che sia una fattura (INVOICE o CREDIT_NOTE)
  if (document.category !== 'INVOICE' && document.category !== 'CREDIT_NOTE') {
    throw new InvoiceXMLError(
      'Il documento deve essere una Fattura o Nota di Credito per generare XML Fattura Elettronica',
      'INVALID_DOCUMENT_TYPE'
    );
  }

  // 4. ✅ Validazione dati obbligatori Organization (Cedente)
  if (!document.organization.vatNumber) {
    throw new InvoiceXMLError(
      'P.IVA organizzazione mancante. Configura i dati aziendali prima di generare XML.',
      'MISSING_ORG_VAT'
    );
  }

  if (!validateItalianVAT(document.organization.vatNumber)) {
    throw new InvoiceXMLError(
      `P.IVA organizzazione non valida: ${document.organization.vatNumber}`,
      'INVALID_ORG_VAT'
    );
  }

  if (!document.organization.businessName) {
    throw new InvoiceXMLError(
      'Ragione sociale organizzazione mancante',
      'MISSING_ORG_NAME'
    );
  }

  // 5. ✅ Validazione dati cliente (Cessionario) - solo snapshot
  if (!document.customerVatSnapshot && !document.customerFiscalCodeSnapshot) {
    throw new InvoiceXMLError(
      'P.IVA o Codice Fiscale cliente mancanti nel documento',
      'MISSING_CUSTOMER_ID'
    );
  }

  if (
    document.customerVatSnapshot &&
    !validateItalianVAT(document.customerVatSnapshot)
  ) {
    throw new InvoiceXMLError(
      `P.IVA cliente non valida: ${document.customerVatSnapshot}`,
      'INVALID_CUSTOMER_VAT'
    );
  }

  if (
    document.customerFiscalCodeSnapshot &&
    !validateItalianFiscalCode(document.customerFiscalCodeSnapshot)
  ) {
    throw new InvoiceXMLError(
      `Codice Fiscale cliente non valido: ${document.customerFiscalCodeSnapshot}`,
      'INVALID_CUSTOMER_CF'
    );
  }

  // 6. ✅ Verifica righe documento
  if (!document.lines || document.lines.length === 0) {
    throw new InvoiceXMLError(
      'Il documento non ha righe. Impossibile generare XML.',
      'NO_LINES'
    );
  }

  // 7. ✅ Verifica Codice Destinatario o PEC
  const codiceDestinatario = document.customerSdiSnapshot || document.organization.sdiCode;
  const pec = document.organization.pec;
  
  if (!codiceDestinatario && !pec) {
    throw new InvoiceXMLError(
      'Codice Destinatario (SDI) o PEC mancanti. Configura almeno uno dei due.',
      'MISSING_SDI_OR_PEC'
    );
  }

  // 8. Genera XML
  return buildFatturaPAXML(document, codiceDestinatario || undefined);
}

/**
 * Costruisce l'XML Fattura Elettronica completo (formato FatturaPA)
 * 
 * Il formato XML è standard per tutte le fatture elettroniche italiane,
 * indipendentemente dal tipo di destinatario (azienda privata o PA).
 */
function buildFatturaPAXML(
  document: DocumentForXML,
  codiceDestinatario?: string
): string {
  // ✅ Namespace corretto secondo specifiche SdI e Technical Rules v2.6
  // Usiamo namespace di default (xmlns) e aggiungiamo xmlns="" ai nodi figli come richiesto
  // ✅ SistemaEmittente: attributo opzionale ma suggerito per fini statistici/pubblicitari
  const rootAttrs: Record<string, string> = {
    versione: 'FPA12',
    xmlns: 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2',
    'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:schemaLocation':
      'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.1.xsd',
  };

  // Aggiungi SistemaEmittente se disponibile (opzionale ma suggerito)
  // TODO: Aggiungere campo sistemaEmittente al modello Organization o usare costante
  const sistemaEmittente = 'YottaErp'; // Nome applicativo che genera l'XML
  rootAttrs.SistemaEmittente = sistemaEmittente;

  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('FatturaElettronica', rootAttrs);

  // ============================================================================
  // HEADER: Dati Trasmissione, Cedente, Cessionario
  // ============================================================================
  // ✅ Aggiunto xmlns="" come richiesto dall'errore SdI quando si usa xmlns senza prefisso nel root
  const header = root.ele('FatturaElettronicaHeader', { xmlns: '' });

  // DatiTrasmissione
  const datiTrasmissione = header.ele('DatiTrasmissione');
  
  // IdTrasmittente (un solo elemento con due figli)
  const idTrasmittente = datiTrasmissione.ele('IdTrasmittente');
  idTrasmittente.ele('IdPaese').txt('IT');
  // ✅ Per FPA12, IdCodice deve essere Codice Fiscale (11 caratteri), non P.IVA
  // Se non c'è Codice Fiscale, usiamo P.IVA (ma meglio avere CF)
  const idCodice = document.organization.fiscalCode || document.organization.vatNumber;
  if (!idCodice) {
    throw new InvoiceXMLError(
      'Codice Fiscale o P.IVA organizzazione mancante per IdTrasmittente',
      'MISSING_ID_CODICE'
    );
  }
  idTrasmittente.ele('IdCodice').txt(idCodice.substring(0, 11)); // Max 11 caratteri

  // Progressivo invio (numero documento)
  datiTrasmissione.ele('ProgressivoInvio').txt(document.number);

  // ✅ Ordine corretto secondo schema XSD FatturaPA:
  // 1. IdTrasmittente
  // 2. ProgressivoInvio
  // 3. FormatoTrasmissione (DEVE venire PRIMA di CodiceDestinatario)
  // 4. CodiceDestinatario / PECDestinatario
  // 5. ContattiTrasmittente (opzionale)

  // Formato trasmissione: FPA12 = FatturaPA 1.2
  datiTrasmissione.ele('FormatoTrasmissione').txt('FPA12');

  // Codice Destinatario o PEC (DOPO FormatoTrasmissione)
  if (codiceDestinatario) {
    // ✅ Per FPA12, CodiceDestinatario deve essere di 6 cifre (non 7)
    const codiceDest = codiceDestinatario.length > 6 
      ? codiceDestinatario.substring(0, 6) 
      : codiceDestinatario.padStart(6, '0');
    datiTrasmissione.ele('CodiceDestinatario').txt(codiceDest);
  } else if (document.organization.pec) {
    // Se PEC, CodiceDestinatario deve essere "0000000" (7 caratteri per PEC)
    datiTrasmissione.ele('CodiceDestinatario').txt('0000000');
    datiTrasmissione.ele('PECDestinatario').txt(document.organization.pec);
  }

  // ✅ Contatti Trasmittente (opzionale ma suggerito dalle Technical Rules)
  // ✅ DEVE essere DOPO FormatoTrasmissione secondo schema XSD
  // Utile per comunicazioni tecniche con SdI
  if (document.organization.email) {
    const contattiTrasmittente = datiTrasmissione.ele('ContattiTrasmittente');
    contattiTrasmittente.ele('Email').txt(document.organization.email);
  }

  // CedentePrestatore (Organization)
  const cedente = header.ele('CedentePrestatore');
  const datiAnagraficiCedente = cedente.ele('DatiAnagrafici');
  
  // IdFiscaleIVA (un solo elemento con due figli)
  const idFiscaleIVACedente = datiAnagraficiCedente.ele('IdFiscaleIVA');
  idFiscaleIVACedente.ele('IdPaese').txt('IT');
  idFiscaleIVACedente.ele('IdCodice').txt(document.organization.vatNumber);

  if (document.organization.fiscalCode) {
    datiAnagraficiCedente.ele('CodiceFiscale').txt(document.organization.fiscalCode);
  }

  const anagraficaCedente = datiAnagraficiCedente.ele('Anagrafica');
  anagraficaCedente.ele('Denominazione').txt(document.organization.businessName);

  // ✅ RegimeFiscale obbligatorio
  // Valori possibili secondo Technical Rules v2.6 (Appendix 5.5):
  // RF01 = Ordinario, RF02 = Contribuenti minimi, RF04 = Agricoltura, etc.
  const regimeFiscale = document.organization.regimeFiscale || 'RF01'; // Default: Ordinario
  datiAnagraficiCedente.ele('RegimeFiscale').txt(regimeFiscale);

  // Sede Cedente
  // ✅ Ordine corretto secondo Technical Rules: Indirizzo, NumeroCivico (opzionale), CAP, Comune, Provincia, Nazione
  if (document.organization.address || document.organization.city) {
    const sedeCedente = cedente.ele('Sede');
    if (document.organization.address) {
      sedeCedente.ele('Indirizzo').txt(document.organization.address);
    }
    // NumeroCivico opzionale (non presente nel nostro schema, ma possiamo aggiungerlo se necessario)
    if (document.organization.zipCode) {
      sedeCedente.ele('CAP').txt(document.organization.zipCode);
    }
    if (document.organization.city) {
      sedeCedente.ele('Comune').txt(document.organization.city);
    }
    if (document.organization.province) {
      sedeCedente.ele('Provincia').txt(document.organization.province);
    }
    sedeCedente.ele('Nazione').txt(document.organization.country || 'IT');
  }

  // ✅ IscrizioneREA (opzionale ma obbligatorio per società iscritte al Registro Imprese - art. 2250 CC)
  // Inseriamo il nodo se almeno uno dei campi REA è presente
  if (document.organization.reaUfficio || document.organization.reaNumero) {
    const iscrizioneREA = cedente.ele('IscrizioneREA');
    
    if (document.organization.reaUfficio) {
      iscrizioneREA.ele('Ufficio').txt(document.organization.reaUfficio);
    }
    
    if (document.organization.reaNumero) {
      iscrizioneREA.ele('NumeroREA').txt(document.organization.reaNumero);
    }
    
    // CapitaleSociale obbligatorio per società di capitali
    if (document.organization.reaCapitaleSociale) {
      iscrizioneREA.ele('CapitaleSociale').txt(
        formatDecimal(document.organization.reaCapitaleSociale, 2)
      );
    }
  }

  // ✅ Contatti Cedente (opzionale ma suggerito dalle Technical Rules)
  // ✅ Ordine corretto secondo schema XSD: Telefono PRIMA di Email
  // Utile per automazione gestione contestazioni
  if (document.organization.email || document.organization.phone) {
    const contattiCedente = cedente.ele('Contatti');
    // Telefono deve venire PRIMA di Email
    if (document.organization.phone) {
      // ✅ Validazione lunghezza: min 5, max 12 caratteri secondo schema XSD
      let telefono = document.organization.phone.trim();
      // Rimuovi spazi
      telefono = telefono.replace(/\s+/g, '');
      
      // Se troppo lungo, rimuovi il prefisso + se presente per mantenere più cifre
      if (telefono.length > 12) {
        if (telefono.startsWith('+')) {
          telefono = telefono.substring(1); // Rimuovi +
        }
        // Tronca a 12 caratteri se ancora troppo lungo
        if (telefono.length > 12) {
          telefono = telefono.substring(0, 12);
        }
      }
      
      // Verifica lunghezza minima (5 caratteri)
      if (telefono.length >= 5 && telefono.length <= 12) {
        contattiCedente.ele('Telefono').txt(telefono);
      }
      // Se non valido, non inseriamo il nodo (meglio che errore)
    }
    if (document.organization.email) {
      contattiCedente.ele('Email').txt(document.organization.email);
    }
  }

  // CessionarioCommittente (Cliente - dati snapshot)
  const cessionario = header.ele('CessionarioCommittente');
  const datiAnagraficiCessionario = cessionario.ele('DatiAnagrafici');

  if (document.customerVatSnapshot) {
    // IdFiscaleIVA (un solo elemento con due figli)
    const idFiscaleIVACessionario = datiAnagraficiCessionario.ele('IdFiscaleIVA');
    idFiscaleIVACessionario.ele('IdPaese').txt('IT');
    idFiscaleIVACessionario.ele('IdCodice').txt(document.customerVatSnapshot);
  }

  if (document.customerFiscalCodeSnapshot) {
    datiAnagraficiCessionario.ele('CodiceFiscale').txt(document.customerFiscalCodeSnapshot);
  }

  const anagraficaCessionario = datiAnagraficiCessionario.ele('Anagrafica');
  anagraficaCessionario.ele('Denominazione').txt(document.customerNameSnapshot);

  // Sede Cessionario (dati snapshot)
  // ✅ Ordine corretto: Indirizzo, CAP, Comune, Provincia, Nazione
  const sedeCessionario = cessionario.ele('Sede');
  sedeCessionario.ele('Indirizzo').txt(document.customerAddressSnapshot);
  sedeCessionario.ele('CAP').txt(document.customerZip);
  sedeCessionario.ele('Comune').txt(document.customerCity);
  sedeCessionario.ele('Provincia').txt(document.customerProvince);
  sedeCessionario.ele('Nazione').txt(document.customerCountry || 'IT');

  // ============================================================================
  // BODY: Dati Generali, Dettaglio Linee, Riepilogo IVA
  // ============================================================================
  // ✅ Aggiunto xmlns="" come richiesto dall'errore SdI quando si usa xmlns senza prefisso nel root
  const body = root.ele('FatturaElettronicaBody', { xmlns: '' });

  // DatiGeneraliDocumento
  const datiGenerali = body.ele('DatiGenerali');
  const datiGeneraliDocumento = datiGenerali.ele('DatiGeneraliDocumento');

  // Tipo documento: TD01 = Fattura, TD04 = Nota di Credito
  const tipoDocumento = document.category === 'CREDIT_NOTE' ? 'TD04' : 'TD01';
  datiGeneraliDocumento.ele('TipoDocumento').txt(tipoDocumento);

  datiGeneraliDocumento.ele('Divisa').txt('EUR');
  datiGeneraliDocumento.ele('Data').txt(formatDate(document.date));
  datiGeneraliDocumento.ele('Numero').txt(document.number);

  // ImportoTotaleDocumento (grossTotal)
  datiGeneraliDocumento
    .ele('ImportoTotaleDocumento')
    .txt(formatDecimal(document.grossTotal, 2));

  // ✅ Causale (opzionale ma suggerito dalle Technical Rules)
  // Utile per riferimenti normativi, condizioni commerciali, annotazioni
  if (document.notes) {
    datiGeneraliDocumento.ele('Causale').txt(document.notes);
  }

  // ✅ DatiOrdineAcquisto (opzionale ma obbligatorio per fatture verso PA)
  // Per fatture verso PA, è necessario CodiceCIG o CodiceCUP
  // Inseriamo il nodo se almeno uno dei codici è presente
  if (document.codiceCIG || document.codiceCUP) {
    const datiOrdineAcquisto = datiGenerali.ele('DatiOrdineAcquisto');
    
    if (document.codiceCIG) {
      datiOrdineAcquisto.ele('CodiceCIG').txt(document.codiceCIG);
    }
    
    if (document.codiceCUP) {
      datiOrdineAcquisto.ele('CodiceCUP').txt(document.codiceCUP);
    }
  }

  // DatiBeniServizi
  const datiBeniServizi = body.ele('DatiBeniServizi');

  // DettaglioLinee: una per ogni riga documento
  document.lines.forEach((line, index) => {
    const dettaglioLinea = datiBeniServizi.ele('DettaglioLinee');
    dettaglioLinea.ele('NumeroLinea').txt(String(index + 1));

    // Descrizione
    dettaglioLinea.ele('Descrizione').txt(line.description);

    // Quantità (8 decimali per conformità SdI)
    dettaglioLinea.ele('Quantita').txt(formatDecimal(line.quantity, 8));

    // PrezzoUnitario (4 decimali)
    dettaglioLinea.ele('PrezzoUnitario').txt(formatDecimal(line.unitPrice, 4));

    // PrezzoTotale (imponibile riga, 2 decimali)
    dettaglioLinea.ele('PrezzoTotale').txt(formatDecimal(line.netAmount, 2));

    // Aliquota IVA (percentuale, es. 22.00)
    const vatRatePercent = toDecimal(line.vatRate).mul(100);
    dettaglioLinea.ele('AliquotaIVA').txt(formatDecimal(vatRatePercent, 2));

    // Natura IVA (solo se presente nel VatRate)
    if (line.vatRateRef?.nature) {
      dettaglioLinea.ele('Natura').txt(line.vatRateRef.nature);
    }
  });

  // ✅ DatiRiepilogo: DEVE essere dentro DatiBeniServizi, non direttamente in Body
  // Raggruppa per aliquota IVA
  const riepiloghi = groupByVatRate(document.lines);

  riepiloghi.forEach((riepilogo) => {
    const datiRiepilogo = datiBeniServizi.ele('DatiRiepilogo');

    // Aliquota IVA (percentuale)
    const vatRatePercent = toDecimal(riepilogo.vatRate).mul(100);
    datiRiepilogo.ele('AliquotaIVA').txt(formatDecimal(vatRatePercent, 2));

    // ImponibileImporto (totale netto per questa aliquota)
    datiRiepilogo.ele('ImponibileImporto').txt(formatDecimal(riepilogo.netTotal, 2));

    // Imposta (totale IVA per questa aliquota)
    datiRiepilogo.ele('Imposta').txt(formatDecimal(riepilogo.vatTotal, 2));

    // Natura IVA (solo se presente)
    if (riepilogo.nature) {
      datiRiepilogo.ele('Natura').txt(riepilogo.nature);
    }
  });

  // Genera XML string
  const xml = root.end({ prettyPrint: true });
  return xml;
}

/**
 * Formatta un Decimal con numero specifico di decimali
 * 
 * @param value - Valore Decimal o stringa
 * @param decimals - Numero decimali (2 per valute, 8 per quantità)
 * @returns Stringa formattata
 */
function formatDecimal(value: Decimal | string | Prisma.Decimal, decimals: number): string {
  const decimal = toDecimal(value.toString());
  return decimal.toFixed(decimals);
}

/**
 * Formatta una data nel formato YYYY-MM-DD richiesto da FatturaPA
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Raggruppa le righe documento per aliquota IVA per DatiRiepilogo
 * 
 * ✅ IMPORTANTE: I totali devono corrispondere esattamente ai valori nel documento
 * per evitare errori di validazione SdI
 */
function groupByVatRate(
  lines: DocumentForXML['lines']
): Array<{
  vatRate: Decimal;
  netTotal: Decimal;
  vatTotal: Decimal;
  nature: string | null;
}> {
  const groups = new Map<string, {
    vatRate: Decimal;
    netTotal: Decimal;
    vatTotal: Decimal;
    nature: string | null;
  }>();

  for (const line of lines) {
    // ✅ Usa vatRate come chiave (stringa con precisione)
    // Questo garantisce che aliquote diverse (es. 0.22 vs 0.2200) siano raggruppate correttamente
    const vatRateKey = toDecimal(line.vatRate).toFixed(4);
    
    if (!groups.has(vatRateKey)) {
      groups.set(vatRateKey, {
        vatRate: toDecimal(line.vatRate),
        netTotal: new Decimal(0),
        vatTotal: new Decimal(0),
        nature: line.vatRateRef?.nature || null,
      });
    }

    const group = groups.get(vatRateKey)!;
    // ✅ Somma i valori già calcolati e salvati nel database (già arrotondati)
    // Non ricalcoliamo per evitare discrepanze di arrotondamento
    group.netTotal = group.netTotal.plus(toDecimal(line.netAmount));
    group.vatTotal = group.vatTotal.plus(toDecimal(line.vatAmount));
  }

  // ✅ Arrotonda totali a 2 decimali con ROUND_HALF_UP (già configurato globalmente)
  return Array.from(groups.values()).map((g) => ({
    ...g,
    netTotal: g.netTotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    vatTotal: g.vatTotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
  }));
}
