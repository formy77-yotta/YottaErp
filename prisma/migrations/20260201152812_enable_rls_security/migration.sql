-- ============================================================================
-- MIGRAZIONE SICUREZZA: Abilitazione Row Level Security (RLS)
-- ============================================================================
--
-- 🔐 RATIONALE SICUREZZA:
--
-- Supabase espone automaticamente API REST/GraphQL pubbliche per tutte le tabelle.
-- Senza RLS abilitato, CHIUNQUE può leggere/modificare i dati tramite queste API.
--
-- ARCHITETTURA YOTTAERP:
-- - Backend: Next.js Server Actions + Prisma (usa credenziali admin)
-- - Frontend: Chiama Server Actions protette (no accesso diretto al DB)
-- - API Supabase: BLOCCATE completamente (non servono per questa architettura)
--
-- STRATEGIA:
-- 1. Abilita RLS su TUTTE le tabelle
-- 2. Crea policy "Deny All" per bloccare accesso pubblico via API Supabase
-- 3. Prisma continua a funzionare (usa credenziali service_role che bypassano RLS)
--
-- ============================================================================

-- ============================================================================
-- FASE 1: ABILITAZIONE RLS
-- ============================================================================

-- Tabella: Entity (Anagrafiche unificate clienti/fornitori)
ALTER TABLE "Entity" ENABLE ROW LEVEL SECURITY;

-- Tabella: VatRate (Aliquote IVA configurabili)
ALTER TABLE "VatRate" ENABLE ROW LEVEL SECURITY;

-- Tabella: Product (Prodotti e servizi)
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;

-- Tabella: Warehouse (Magazzini)
ALTER TABLE "Warehouse" ENABLE ROW LEVEL SECURITY;

-- Tabella: StockMovement (Movimenti di magazzino per calculated stock)
ALTER TABLE "StockMovement" ENABLE ROW LEVEL SECURITY;

-- Tabella: Document (Documenti commerciali: preventivi, ordini, DDT, fatture)
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;

-- Tabella: DocumentLine (Righe documento con snapshot prodotto/IVA)
ALTER TABLE "DocumentLine" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FASE 2: POLICY "DENY ALL" PER ACCESSO PUBBLICO
-- ============================================================================
--
-- Queste policy bloccano QUALSIASI accesso tramite API pubbliche Supabase.
-- Prisma continua a funzionare perché usa il ruolo 'service_role' che bypassa RLS.
--
-- IMPORTANTE: In futuro, se vorrai creare accesso controllato (es. portale clienti),
-- dovrai modificare/sostituire queste policy con regole più granulari basate su auth.uid()
--
-- ============================================================================

-- Policy per Entity
CREATE POLICY "Deny All Public Access - Entity" 
  ON "Entity" 
  FOR ALL 
  USING (false);

-- Policy per VatRate
CREATE POLICY "Deny All Public Access - VatRate" 
  ON "VatRate" 
  FOR ALL 
  USING (false);

-- Policy per Product
CREATE POLICY "Deny All Public Access - Product" 
  ON "Product" 
  FOR ALL 
  USING (false);

-- Policy per Warehouse
CREATE POLICY "Deny All Public Access - Warehouse" 
  ON "Warehouse" 
  FOR ALL 
  USING (false);

-- Policy per StockMovement
CREATE POLICY "Deny All Public Access - StockMovement" 
  ON "StockMovement" 
  FOR ALL 
  USING (false);

-- Policy per Document
CREATE POLICY "Deny All Public Access - Document" 
  ON "Document" 
  FOR ALL 
  USING (false);

-- Policy per DocumentLine
CREATE POLICY "Deny All Public Access - DocumentLine" 
  ON "DocumentLine" 
  FOR ALL 
  USING (false);

-- ============================================================================
-- VERIFICA FINALE
-- ============================================================================
--
-- Dopo aver applicato questa migrazione, verifica su Supabase Dashboard:
--
-- 1. Vai su: Database -> Tables -> [Nome Tabella]
-- 2. Clicca tab "RLS policies"
-- 3. Verifica che:
--    - RLS sia ENABLED (interruttore verde)
--    - Esista policy "Deny All Public Access - [NomeTabella]"
--
-- 4. TESTA SICUREZZA:
--    - Vai su: API -> Tables and Views
--    - Prova a fare GET /rest/v1/Entity
--    - Dovrebbe restituire 401 Unauthorized o array vuoto
--
-- 5. TESTA PRISMA (deve continuare a funzionare):
--    - Esegui: npx tsx test-db-connection.ts
--    - Deve connettersi senza errori
--
-- ============================================================================
-- NOTE AVANZATE
-- ============================================================================
--
-- Q: Perché Prisma continua a funzionare?
-- A: Prisma usa la connection string con ruolo 'postgres' (service_role) che
--    bypassa automaticamente RLS. Vedi: https://supabase.com/docs/guides/auth/row-level-security
--
-- Q: Come faccio ad abilitare accesso sicuro in futuro (es. portale clienti)?
-- A: Dovrai:
--    1. Implementare Supabase Auth nel frontend
--    2. Modificare le policy per usare auth.uid()
--    3. Esempio per Document:
--       CREATE POLICY "Users can read own documents"
--         ON "Document"
--         FOR SELECT
--         USING (auth.uid() = user_id);
--
-- Q: Posso disabilitare completamente le API Supabase?
-- A: No, ma con RLS + policy USING (false) è equivalente. Le API restano attive
--    ma restituiscono sempre 0 righe o 401 Unauthorized.
--
-- ============================================================================
