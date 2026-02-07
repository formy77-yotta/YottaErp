# 🏗️ Architettura Super Admin Organizations

## 📐 Diagramma Flusso Dati

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER (Client)                          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  /organizations (Page Component)                    │    │
│  │  • DataTable con lista organizzazioni               │    │
│  │  • Cards statistiche                                │    │
│  │  • Dialog modale con form                           │    │
│  └─────────────────┬───────────────────────────────────┘    │
│                    │                                         │
│                    │ Server Actions                          │
│                    ▼                                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │  OrganizationForm (Component)                       │    │
│  │  • react-hook-form + Zod validation                 │    │
│  │  • 3 sezioni: Azienda, Indirizzo, Contatti         │    │
│  └─────────────────┬───────────────────────────────────┘    │
└────────────────────┼────────────────────────────────────────┘
                     │
                     │ Server Actions (Next.js 14)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (Next.js)                          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  organization-actions.ts (Server Actions)           │    │
│  │                                                      │    │
│  │  • isSuperAdmin() ──────────► Verifica permessi    │    │
│  │  • getOrganizations() ──────► Lista + statistiche  │    │
│  │  • createOrganizationAdmin()► Creazione            │    │
│  │  • updateOrganizationAdmin()► Aggiornamento        │    │
│  │  • toggleOrganizationStatus()► Attiva/Disattiva    │    │
│  │  • deleteOrganization() ────► Eliminazione         │    │
│  └─────────────────┬───────────────────────────────────┘    │
│                    │                                         │
│                    │ Prisma ORM                              │
│                    ▼                                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │  organization-schema.ts (Zod Schemas)               │    │
│  │                                                      │    │
│  │  • organizationSchema ──────► Validazione completa │    │
│  │  • italianVatNumberSchema ──► Checksum P.IVA      │    │
│  │  • italianFiscalCodeSchema ─► Checksum CF         │    │
│  └─────────────────┬───────────────────────────────────┘    │
│                    │                                         │
│                    │ Validazione                             │
│                    ▼                                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │  validators.ts (Business Logic)                     │    │
│  │                                                      │    │
│  │  • validateItalianVAT() ────► Algoritmo checksum   │    │
│  │  • validateItalianFiscalCode()► Algoritmo checksum │    │
│  └─────────────────┬───────────────────────────────────┘    │
└────────────────────┼────────────────────────────────────────┘
                     │
                     │ SQL Queries
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE (PostgreSQL)                       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Organization (Table)                               │    │
│  │                                                      │    │
│  │  id              String    @id @default(cuid())    │    │
│  │  businessName    String    (Ragione sociale)       │    │
│  │  vatNumber       String?   @unique (P.IVA)         │    │
│  │  fiscalCode      String?   (Codice Fiscale)        │    │
│  │  address         String?                            │    │
│  │  city            String?                            │    │
│  │  province        String?                            │    │
│  │  zipCode         String?                            │    │
│  │  email           String?                            │    │
│  │  pec             String?                            │    │
│  │  phone           String?                            │    │
│  │  sdiCode         String?   (Fatt. Elettronica)     │    │
│  │  plan            String    (FREE/BASIC/PREMIUM)    │    │
│  │  maxUsers        Int       @default(5)             │    │
│  │  maxInvoicesPerYear Int    @default(500)           │    │
│  │  active          Boolean   @default(true)          │    │
│  │  createdAt       DateTime  @default(now())         │    │
│  │  updatedAt       DateTime  @updatedAt              │    │
│  │                                                      │    │
│  │  Relazioni:                                         │    │
│  │  • users         UserOrganization[]                │    │
│  │  • entities      Entity[]                          │    │
│  │  • products      Product[]                         │    │
│  │  • warehouses    Warehouse[]                       │    │
│  │  • documents     Document[]                        │    │
│  │  • vatRates      VatRate[]                         │    │
│  │  • stockMovements StockMovement[]                  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 🗂️ Struttura File System

```
YottaErp/
│
├── src/
│   ├── app/
│   │   └── (admin)/                        # Route Group Admin
│   │       └── organizations/
│   │           └── page.tsx                # ✅ Dashboard principale
│   │
│   ├── components/
│   │   ├── features/
│   │   │   └── admin/
│   │   │       └── OrganizationForm.tsx   # ✅ Form riutilizzabile
│   │   │
│   │   └── ui/                             # shadcn/ui components
│   │       ├── dialog.tsx                  # ✅ Modale
│   │       ├── select.tsx                  # ✅ Select dropdown
│   │       ├── switch.tsx                  # ✅ Toggle switch
│   │       ├── textarea.tsx                # ✅ Textarea
│   │       ├── button.tsx                  # Già presente
│   │       ├── card.tsx                    # Già presente
│   │       ├── form.tsx                    # Già presente
│   │       ├── input.tsx                   # Già presente
│   │       ├── label.tsx                   # Già presente
│   │       ├── badge.tsx                   # Già presente
│   │       └── table.tsx                   # Già presente
│   │
│   ├── lib/
│   │   ├── validators.ts                   # ✅ Algoritmi P.IVA e CF
│   │   ├── prisma.ts                       # Già presente
│   │   ├── auth.ts                         # Già presente
│   │   └── utils.ts                        # Già presente
│   │
│   ├── schemas/
│   │   ├── organization-schema.ts          # ✅ Schema Zod Organization
│   │   ├── entity-schema.ts                # Già presente
│   │   ├── document-schema.ts              # Già presente
│   │   └── common-schema.ts                # Già presente
│   │
│   └── services/
│       └── actions/
│           ├── organization-actions.ts     # ✅ ESTESO con Super Admin
│           └── customer-actions.ts         # Già presente
│
├── prisma/
│   └── schema.prisma                       # Già presente (model Organization)
│
├── scripts/
│   └── test-super-admin.ts                 # ✅ Script test
│
├── examples/                               # ✅ NUOVA DIRECTORY
│   ├── middleware-admin-protection.ts      # ✅ Esempio middleware
│   └── access-denied-page.tsx              # ✅ Esempio pagina 403
│
├── docs/
│   └── SUPER_ADMIN_ORGANIZATIONS.md        # ✅ Documentazione completa
│
├── SUPER_ADMIN_SETUP.md                    # ✅ Setup guide
├── CHECKLIST_SETUP.md                      # ✅ Checklist verifiche
└── ARCHITECTURE.md                         # ✅ Questo file
```

## 🔄 Flusso Operazioni CRUD

### 1. CREATE (Creazione Organizzazione)

```
User Action: Click "Nuova Organizzazione"
    ↓
Dialog Opens
    ↓
User fills form
    ↓
Client-side Validation (Zod)
    ↓
Submit → createOrganizationAdmin()
    ↓
Server-side Checks:
    • isSuperAdmin() → verifica permessi
    • Validate P.IVA checksum
    • Check unique constraint
    ↓
Prisma: organization.create()
    ↓
Database: INSERT INTO organization
    ↓
Response → Success/Error
    ↓
Toast Notification + Table Refresh
```

### 2. READ (Lista Organizzazioni)

```
Page Load → useEffect()
    ↓
loadOrganizations()
    ↓
getOrganizations()
    ↓
Server-side Checks:
    • isSuperAdmin() → verifica permessi
    ↓
Prisma: organization.findMany()
    • include: _count (users, entities, products, documents)
    ↓
Database: SELECT with JOINs + COUNT()
    ↓
Response → Array<Organization>
    ↓
State Update → Re-render Table
```

### 3. UPDATE (Modifica Organizzazione)

```
User Action: Click ✏️ Edit Button
    ↓
Dialog Opens with pre-filled data
    ↓
User modifies fields
    ↓
Client-side Validation (Zod)
    ↓
Submit → updateOrganizationAdmin(id, data)
    ↓
Server-side Checks:
    • isSuperAdmin() → verifica permessi
    • Validate P.IVA checksum
    • Check unique constraint (if P.IVA changed)
    ↓
Prisma: organization.update()
    ↓
Database: UPDATE organization SET ... WHERE id = ?
    ↓
Response → Success/Error
    ↓
Toast Notification + Table Refresh
```

### 4. TOGGLE STATUS (Attiva/Disattiva)

```
User Action: Toggle Switch
    ↓
handleToggleActive(org)
    ↓
toggleOrganizationStatus(id, !active)
    ↓
Server-side Checks:
    • isSuperAdmin() → verifica permessi
    ↓
Prisma: organization.update({ active })
    ↓
Database: UPDATE organization SET active = ? WHERE id = ?
    ↓
Response → Success/Error
    ↓
Toast Notification + Table Refresh
```

### 5. DELETE (Eliminazione)

```
User Action: Click Delete (non implementato in UI)
    ↓
deleteOrganization(id)
    ↓
Server-side Checks:
    • isSuperAdmin() → verifica permessi
    • Check documents count → Blocca se > 0
    ↓
Prisma: organization.delete()
    ↓
Database: DELETE FROM organization WHERE id = ?
    • CASCADE: elimina anche:
      - UserOrganization
      - Entity
      - Product
      - Warehouse
      - Document (se 0)
      - VatRate
      - StockMovement
    ↓
Response → Success/Error
    ↓
Toast Notification + Table Refresh
```

## 🔐 Livelli di Sicurezza

```
┌─────────────────────────────────────────────────────┐
│ 1. MIDDLEWARE (Next.js)                             │
│    • Verifica autenticazione                        │
│    • Redirect se non Super Admin                    │
│    • Applica a route group (admin)                  │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ 2. SERVER ACTIONS                                   │
│    • isSuperAdmin() su ogni operazione              │
│    • Verifica permessi prima di Prisma              │
│    • Return error se non autorizzato                │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ 3. ZOD VALIDATION                                   │
│    • Validazione format P.IVA (11 cifre)            │
│    • Validazione checksum P.IVA                     │
│    • Validazione format CF (16 caratteri)           │
│    • Validazione checksum CF                        │
│    • Validazione campi obbligatori                  │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ 4. PRISMA ORM                                       │
│    • Type safety TypeScript                         │
│    • Parametrized queries (SQL injection safe)      │
│    • Transaction support                            │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ 5. DATABASE CONSTRAINTS                             │
│    • UNIQUE constraint su vatNumber                 │
│    • NOT NULL constraints                           │
│    • CASCADE delete rules                           │
│    • Row Level Security (RLS) - opzionale           │
└─────────────────────────────────────────────────────┘
```

## 📊 Modello Dati Relazionale

```
┌────────────────┐
│ Organization   │
│                │
│ • id           │───┐
│ • businessName │   │
│ • vatNumber    │   │ 1
│ • fiscalCode   │   │
│ • plan         │   │
│ • active       │   │
└────────────────┘   │
                     │
                     │ N
        ┌────────────┼────────────┬──────────────┬────────────┬──────────────┐
        │            │            │              │            │              │
        ▼            ▼            ▼              ▼            ▼              ▼
┌───────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────────┐
│UserOrganization│ │ Entity   │ │ Product  │ │Warehouse │ │DocumentType  │ │ Document     │
│               │ │          │ │          │ │          │ │Config        │ │              │
│• userId       │ │• type    │ │• code    │ │• code    │ │              │ │• number      │
│• role         │ │• name    │ │• name    │ │• name    │ │• code        │ │• date        │
│               │ │• vatNumber│ │• price   │ │          │ │• inventory   │ │• grossTotal  │
└───────────────┘ └──────────┘ └──────────┘ └──────────┘ │  Movement    │ │              │
                                                         │• valuation   │ │• documentType│
                                                         │  Impact      │ │  Id (FK)     │
                                                         │• operation   │ └──────────────┘
                                                         │  Sign        │        │
                                                         └──────────────┘        │
                                                                                 │
                                                                                 │ N
                                                                      ┌──────────┼──────────┐
                                                                      │          │          │
                                                                      ▼          ▼          ▼
                                                            ┌──────────────┐ ┌──────────┐ ┌──────────────┐
                                                            │StockMovement │ │Document  │ │Accounting    │
                                                            │             │ │Line      │ │Entry         │
                                                            │• quantity   │ │          │ │              │
                                                            │• type       │ │• quantity│ │• amount      │
                                                            │             │ │• unitPrice│ │• type        │
                                                            │• documentType│ │• gross   │ │              │
                                                            │  Id (FK)    │ │  Amount   │ │              │
                                                            └──────────────┘ └──────────┘ └──────────────┘
```

## 🎨 Interfaccia Grafica e Navigazione

### 📐 Layout Dashboard

Il layout principale è diviso in tre aree principali:

```
┌─────────────────────────────────────────────────────────────┐
│                    NAVBAR (Fixed Top)                        │
│  ┌──────────────┐              ┌─────────────────────────┐  │
│  │ Logo YottaErp│              │ Org Switcher │ Logout   │  │
│  └──────────────┘              └─────────────────────────┘  │
├──────────────┬──────────────────────────────────────────────┤
│              │                                                │
│   SIDEBAR    │           MAIN CONTENT AREA                   │
│   (Fixed)    │                                                │
│              │  ┌────────────────────────────────────────┐   │
│  Dashboard   │  │  Dashboard Page                        │   │
│  Anagrafiche │  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │   │
│  Documenti   │  │  │ KPI  │ │ KPI  │ │ KPI  │ │ KPI  │  │   │
│  Magazzino   │  │  └──────┘ └──────┘ └──────┘ └──────┘  │   │
│              │  └────────────────────────────────────────┘   │
│              │                                                │
└──────────────┴──────────────────────────────────────────────┘
```

#### Componenti Layout

**1. Navbar (`src/components/common/Navbar.tsx`)**
- **Posizione**: Fixed top, z-index 50
- **Contenuto**:
  - Logo YottaErp (link a `/dashboard`)
  - Organization Switcher (Select dropdown)
  - Pulsante Logout
- **Mobile**: Include trigger per menu mobile (hamburger)

**2. Sidebar (`src/components/common/Sidebar.tsx`)**
- **Desktop**: Fixed left, width 256px (lg:w-64), visibile da `lg:` breakpoint
- **Mobile**: Sheet component (menu a scomparsa da sinistra)
- **Struttura Menu**:
  ```
  Dashboard → /dashboard
  Anagrafiche (Menu a tendina)
    ├─ Lead → /entities?type=LEAD
    ├─ Clienti → /entities?type=CUSTOMER
    └─ Fornitori → /entities?type=SUPPLIER
  Documenti → /documents
  Magazzino (Menu a tendina)
    ├─ Prodotti → /products
    └─ Magazzini → /warehouse
  ```
- **Features**:
  - Evidenziazione voce attiva (bg-primary)
  - Menu a tendina con icone ChevronDown/ChevronRight
  - Responsive: Sheet su mobile, sidebar fissa su desktop

**3. Main Content Area**
- **Padding**: `lg:pl-64` (per sidebar desktop) + `pt-16` (per navbar)
- **Container**: Max-width container con padding responsive

### 🎯 Struttura Menu di Navigazione

#### Definizione Menu Items

```typescript
interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}
```

#### Menu Items Configurazione

```typescript
const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Anagrafiche',
    icon: Users,
    children: [
      { title: 'Lead', href: '/entities?type=LEAD', icon: Users },
      { title: 'Clienti', href: '/entities?type=CUSTOMER', icon: Users },
      { title: 'Fornitori', href: '/entities?type=SUPPLIER', icon: Users },
    ],
  },
  {
    title: 'Documenti',
    href: '/documents',
    icon: FileText,
  },
  {
    title: 'Magazzino',
    icon: Package,
    children: [
      { title: 'Prodotti', href: '/products', icon: Package },
      { title: 'Magazzini', href: '/warehouse', icon: Warehouse },
    ],
  },
];
```

### 📱 Responsive Design

#### Breakpoints Tailwind

- **Mobile**: `< 1024px` (lg breakpoint)
  - Sidebar nascosta
  - Menu hamburger in Navbar
  - Sheet component per navigazione
- **Desktop**: `≥ 1024px` (lg breakpoint)
  - Sidebar fissa visibile
  - Menu hamburger nascosto
  - Layout a due colonne

#### Implementazione Responsive

```typescript
// Desktop Sidebar
<aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed ...">
  {/* Menu desktop */}
</aside>

// Mobile Sidebar (Sheet)
<Sheet>
  <SheetTrigger className="lg:hidden">
    <Button variant="ghost" size="icon">
      <Menu />
    </Button>
  </SheetTrigger>
  <SheetContent side="left" className="w-64">
    {/* Menu mobile */}
  </SheetContent>
</Sheet>
```

### 🎨 Evidenziazione Voce Attiva

Il menu evidenzia automaticamente la voce corrispondente alla pagina corrente:

```typescript
const pathname = usePathname();

// Verifica se un item è attivo
const isActive = item.href
  ? pathname === item.href.split('?')[0] || 
    pathname.startsWith(item.href.split('?')[0] + '/')
  : false;

// Applica stile condizionale
className={cn(
  isActive
    ? 'bg-primary text-primary-foreground'
    : 'text-muted-foreground hover:bg-accent'
)}
```

### 📊 Dashboard KPI Cards

**Componente**: `src/app/(dashboard)/page.tsx`

**Struttura**:
```
DashboardPage
│
├── Header (Titolo + Descrizione)
│
└── DashboardStats (Suspense)
    └── Grid (md:grid-cols-2 lg:grid-cols-4)
        ├── Card: Anagrafiche
        │   ├── Icon: Users
        │   ├── Totale: stats.entities.total
        │   └── Dettaglio: clienti/fornitori
        │
        ├── Card: Documenti
        │   ├── Icon: FileText
        │   ├── Totale: stats.documents.total
        │   └── Dettaglio: fatture/preventivi
        │
        ├── Card: Prodotti
        │   ├── Icon: Package
        │   ├── Totale: stats.products.total
        │   └── Dettaglio: attivi
        │
        └── Card: Magazzini
            ├── Icon: Warehouse
            ├── Totale: stats.warehouses.total
            └── Dettaglio: configurati
```

**Server Action**: `src/services/actions/dashboard-actions.ts`
- Funzione `getDashboardStats()` recupera statistiche aggregate
- Query parallele con `Promise.all()` per performance
- Filtro automatico per `organizationId` (MULTITENANT)

### 🔄 Flusso Navigazione

#### Navigazione Standard

```
User Click Menu Item
    ↓
Next.js Router Navigation
    ↓
Page Component Load
    ↓
Server Component Fetch Data
    ↓
getAuthContext() → organizationId
    ↓
Prisma Query (filtered by organizationId)
    ↓
Render Page with Data
```

#### Navigazione con Filtro Tipo

```
User Click "Clienti" → /entities?type=CUSTOMER
    ↓
EntitiesPage receives searchParams
    ↓
Extract type from searchParams
    ↓
getEntitiesAction(type: 'CUSTOMER')
    ↓
Server Action maps type:
    CUSTOMER → { type: { in: ['CLIENT', 'BOTH'] } }
    ↓
Prisma Query with type filter
    ↓
Return filtered entities
    ↓
Render EntityTable with filtered data
```

### 🧩 Componenti UI Utilizzati

**shadcn/ui Components**:
- `Sheet` - Menu mobile a scomparsa
- `Button` - Pulsanti navigazione e azioni
- `Card` - KPI cards dashboard
- `Select` - Organization Switcher
- `Dialog` - Modali (creazione entità, ecc.)

**Lucide React Icons**:
- `LayoutDashboard` - Dashboard
- `Users` - Anagrafiche
- `FileText` - Documenti
- `Package` - Prodotti/Magazzino
- `Warehouse` - Magazzini
- `Menu` - Hamburger menu
- `ChevronDown/ChevronRight` - Menu a tendina

### 📁 Struttura File Interfaccia

```
src/
├── app/
│   └── (dashboard)/
│       ├── layout.tsx              # ✅ Layout con Sidebar + Navbar
│       ├── page.tsx                 # ✅ Dashboard con KPI
│       └── entities/
│           └── page.tsx            # ✅ Pagina entities filtrata
│
├── components/
│   ├── common/
│   │   ├── Navbar.tsx              # ✅ Navbar con Org Switcher
│   │   ├── Sidebar.tsx              # ✅ Sidebar navigazione
│   │   └── OrganizationSwitcher.tsx # ✅ Select organizzazioni
│   │
│   └── ui/
│       └── sheet.tsx                # ✅ Component Sheet mobile
│
└── services/
    └── actions/
        └── dashboard-actions.ts     # ✅ Statistiche dashboard
```

### 🎨 Component Tree

```
DashboardLayout
│
├── Navbar (Fixed Top)
│   ├── Logo + Link
│   ├── MobileSidebar (Sheet Trigger)
│   ├── OrganizationSwitcher
│   └── Logout Button
│
├── Sidebar (Desktop Fixed Left)
│   └── Nav
│       ├── NavItem: Dashboard
│       ├── NavItem: Anagrafiche (Collapsible)
│       │   ├── NavItem: Lead
│       │   ├── NavItem: Clienti
│       │   └── NavItem: Fornitori
│       ├── NavItem: Documenti
│       └── NavItem: Magazzino (Collapsible)
│           ├── NavItem: Prodotti
│           └── NavItem: Magazzini
│
└── Main Content
    └── {children}
        └── DashboardPage
            ├── Header
            └── DashboardStats
                └── Grid (4 Cards)
                    ├── Card: Anagrafiche
                    ├── Card: Documenti
                    ├── Card: Prodotti
                    └── Card: Magazzini
```

### 🔐 Isolamento Multitenant UI

**Tutte le pagine e componenti** rispettano l'isolamento multitenant:

1. **Layout Dashboard**: Verifica `currentOrganizationId` cookie
2. **Dashboard Stats**: Filtra automaticamente per `organizationId`
3. **Entities Page**: Filtra per `organizationId` + tipo
4. **Organization Switcher**: Cambia contesto organizzazione

**Pattern Consistente**:
```typescript
// 1. Ottieni contesto autenticazione
const ctx = await getAuthContext();

// 2. Query filtrata per organizationId
const data = await prisma.entity.findMany({
  where: {
    organizationId: ctx.organizationId, // ✅ Isolamento garantito
    // ... altri filtri
  }
});
```

---

## 🎨 Component Tree (Organizations)

```
OrganizationsPage
│
├── Cards Statistiche (4)
│   ├── Card: Totale Organizzazioni
│   ├── Card: Utenti Totali
│   ├── Card: Documenti
│   └── Card: Media Utenti/Org
│
├── Dialog (Modale)
│   └── OrganizationForm
│       ├── Sezione: Dati Azienda
│       │   ├── Input: Ragione Sociale
│       │   ├── Input: P.IVA
│       │   ├── Input: Codice Fiscale
│       │   ├── Select: Piano
│       │   ├── Input: Max Utenti
│       │   ├── Input: Max Fatture
│       │   └── Switch: Attiva
│       │
│       ├── Sezione: Indirizzo
│       │   ├── Input: Indirizzo
│       │   ├── Input: Città
│       │   ├── Input: Provincia
│       │   └── Input: CAP
│       │
│       └── Sezione: Contatti
│           ├── Input: Email
│           ├── Input: PEC
│           ├── Input: Telefono
│           └── Input: Codice SDI
│
└── Card: Tabella
    └── Table
        ├── TableHeader (10 colonne)
        └── TableBody
            └── TableRow (per ogni org)
                ├── Cell: Nome + Email
                ├── Cell: P.IVA + CF
                ├── Cell: Località
                ├── Cell: Badge Piano
                ├── Cell: Badge Utenti
                ├── Cell: Clienti count
                ├── Cell: Prodotti count
                ├── Cell: Badge Documenti
                ├── Cell: Switch Attiva
                └── Cell: Button Edit
```

## 🔄 State Management

### Dashboard Layout State

```
Sidebar State:
│
├── isOpen: boolean (mobile)            # Sheet open/closed
└── activePath: string                   # Pathname corrente (auto)

Navbar State:
│
├── organizations: Organization[]        # Lista organizzazioni utente
├── currentOrgId: string | null          # Organizzazione corrente
└── isPending: boolean                   # Transition state (switch org)

DashboardPage State:
│
└── stats: DashboardStats | null        # Statistiche (server component)
```

### OrganizationsPage State

```
OrganizationsPage State:
│
├── organizations: Organization[]        # Lista organizzazioni
├── isLoading: boolean                   # Loading state
├── error: string | null                 # Error state
├── editingOrg: Organization | null      # Org in editing
├── isDialogOpen: boolean                # Dialog visibility
└── toast: { message, type } | null      # Toast notification

OrganizationForm State (react-hook-form):
│
└── form: UseFormReturn<OrganizationInput>
    ├── values: OrganizationInput        # Form values
    ├── errors: FieldErrors              # Validation errors
    ├── isDirty: boolean                 # Form modified
    ├── isValid: boolean                 # Validation passed
    └── isSubmitting: boolean            # Submit in progress
```

### EntitiesPage State

```
EntitiesPage State (Server Component):
│
├── entityType: 'CUSTOMER' | 'SUPPLIER' | 'LEAD' | undefined
│   └── From searchParams.type
│
└── entities: Entity[]                   # Fetched from server
    └── Filtered by organizationId + type
```

## 📦 Sistema di Classificazione Prodotti

### 🏷️ Categorie e Tipologie Articoli

Il sistema YottaErp utilizza un sistema di classificazione a due livelli per organizzare i prodotti:

#### 1. **ProductCategory** (Categoria Articolo)

**Scopo**: Classificazione logica per raggruppare prodotti simili (es. "Materiali", "Servizi", "Finiture")

**Caratteristiche**:
- **Codice univoco** per organizzazione (es. "MAT", "SER", "FIN")
- **Descrizione** testuale della categoria
- **Multitenant**: Ogni categoria appartiene a un'organizzazione
- **Opzionale**: Un prodotto può non avere categoria

**Schema Database**:
```prisma
model ProductCategory {
  id            String   @id @default(cuid())
  organizationId String
  code          String   // Codice categoria (es. "MAT", "SER")
  description   String   // Descrizione categoria
  active        Boolean  @default(true)
  
  products      Product[]
  
  @@unique([organizationId, code])
  @@index([organizationId])
  @@index([organizationId, active])
}
```

**Utilizzo**:
- Filtri e ricerche prodotti per categoria
- Report e statistiche per categoria
- Organizzazione logica dell'anagrafica prodotti

#### 2. **ProductType** (Tipologia Articolo)

**Scopo**: Classificazione funzionale che determina il comportamento del prodotto nel sistema

**Caratteristiche**:
- **Codice univoco** per organizzazione (es. "MAT", "SER", "FIN")
- **Descrizione** testuale della tipologia
- **Flag `manageStock`**: Determina se la tipologia gestisce magazzino
  - `true`: Tipologia gestita a magazzino (es. Materiali)
  - `false`: Tipologia non gestita a magazzino (es. Servizi)
- **Multitenant**: Ogni tipologia appartiene a un'organizzazione
- **Opzionale**: Un prodotto può non avere tipologia

**Schema Database**:
```prisma
model ProductType {
  id            String   @id @default(cuid())
  organizationId String
  code          String   // Codice tipologia (es. "MAT", "SER")
  description   String   // Descrizione tipologia
  manageStock   Boolean  @default(true) // Flag gestione magazzino
  active        Boolean  @default(true)
  
  products      Product[]
  
  @@unique([organizationId, code])
  @@index([organizationId])
  @@index([organizationId, active])
}
```

**Logica `manageStock`**:
- **`manageStock = true`**: 
  - Il prodotto può avere movimenti di magazzino
  - La giacenza viene calcolata da `StockMovement`
  - Utilizzato per materiali, merci, prodotti fisici
- **`manageStock = false`**: 
  - Il prodotto NON ha movimenti di magazzino
  - Utilizzato per servizi, consulenze, lavorazioni

### 🔗 Relazione con Prodotti

**Schema Product**:
```prisma
model Product {
  id            String   @id @default(cuid())
  organizationId String
  code          String   // Codice articolo
  name          String
  description   String?
  
  // Classificazioni (opzionali)
  categoryId    String?
  category      ProductCategory? @relation(...)
  
  typeId        String?
  type          ProductType? @relation(...)
  
  price         Decimal  @db.Decimal(12, 2)
  vatRateId     String?
  vatRate       VatRate? @relation(...)
  
  // Magazzino predefinito per questo prodotto
  // Quando si crea un documento, se la riga non ha warehouseId specifico,
  // viene usato questo magazzino (priorità sul mainWarehouseId del documento)
  defaultWarehouseId String?
  defaultWarehouse   Warehouse? @relation(...)
  
  active        Boolean  @default(true)
  
  @@unique([organizationId, code])
  @@index([categoryId])
  @@index([typeId])
  @@index([defaultWarehouseId])
}
```

**Regole**:
- Un prodotto può avere **0 o 1 categoria**
- Un prodotto può avere **0 o 1 tipologia**
- Categoria e tipologia sono **indipendenti** (un prodotto può avere categoria ma non tipologia e viceversa)
- Se una categoria/tipologia viene eliminata, i prodotti associati vengono **disassociati** (`onDelete: SetNull`)

### 📊 Flusso Utilizzo Classificazioni

#### Creazione Prodotto

```
User compila form prodotto
    ↓
Seleziona Categoria (opzionale)
    ↓
Seleziona Tipologia (opzionale)
    ↓
Validazione Zod
    ↓
Verifica categoria/tipologia appartengono all'organizzazione
    ↓
Creazione prodotto con classificazioni
```

#### Filtri e Ricerche

```
getProductsAction(filters?: {
  categoryId?: string;
  typeId?: string;
  active?: boolean;
})
    ↓
Prisma Query con filtri
    ↓
WHERE organizationId = ? 
  AND categoryId = ? (se presente)
  AND typeId = ? (se presente)
  AND active = ? (se presente)
```

#### Logica Magazzino

```
Creazione documento (DDT, Fattura)
    ↓
Per ogni riga documento:
    ↓
1. Verifica documentType.inventoryMovement
    ↓
   Se false → Nessun movimento magazzino, solo registrazione documento
   Se true → Continua
    ↓
2. Verifica product.type.manageStock
    ↓
   Se false → Nessun movimento magazzino (prodotto non gestito a magazzino)
   Se true → Continua
    ↓
3. Calcola quantità con operationSignStock
    ↓
   quantity = line.quantity * documentType.operationSignStock
   (Se operationSignStock = -1, inverte segno per reso/carico)
    ↓
4. Crea StockMovement:
    → quantity: negativo per scarico vendita, positivo per carico
    → type: 'SCARICO_DDT' o 'SCARICO_VENDITA' o 'CARICO_FORNITORE'
    → documentTypeId: riferimento configurazione tipo documento
    → documentId: riferimento documento origine
    ↓
5. Calcola giacenza aggiornata (somma algebrica movimenti)
```

**Regola Combinata**:
- Movimento magazzino creato solo se: `documentType.inventoryMovement = true` **E** `product.type.manageStock = true`
- Il segno della quantità dipende da `documentType.operationSignStock` (se `inventoryMovement = true`) e dal tipo operazione (carico/scarico)
- Il segno dell'impatto contabile dipende da `documentType.operationSignValuation` (se `valuationImpact = true`)

### 🎨 Interfaccia Utente

#### Form Prodotto (`ProductForm.tsx`)

**Caricamento Classificazioni**:
```typescript
useEffect(() => {
  async function loadData() {
    // Carica categorie attive
    const categoriesResult = await getProductCategoriesAction();
    setCategories(categoriesResult.data.filter(c => c.active));
    
    // Carica tipologie attive
    const typesResult = await getProductTypesAction();
    setTypes(typesResult.data.filter(t => t.active));
  }
  loadData();
}, []);
```

**Select Categoria**:
```tsx
<Select
  onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
  value={field.value || 'none'}
>
  <SelectItem value="none">Nessuna categoria</SelectItem>
  {categories.map((category) => (
    <SelectItem key={category.id} value={category.id}>
      {category.code} - {category.description}
    </SelectItem>
  ))}
</Select>
```

**Select Tipologia** (con indicatore magazzino):
```tsx
<Select
  onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
  value={field.value || 'none'}
>
  <SelectItem value="none">Nessuna tipologia</SelectItem>
  {types.map((type) => (
    <SelectItem key={type.id} value={type.id}>
      {type.code} - {type.description}
      {type.manageStock && ' (Magazzino)'}
    </SelectItem>
  ))}
</Select>
```

#### Tabella Prodotti (`products/page.tsx`)

**Visualizzazione Classificazioni**:
```tsx
<TableCell>
  {product.category ? (
    <Badge variant="outline">
      {product.category.code}
    </Badge>
  ) : (
    <span className="text-muted-foreground text-sm">-</span>
  )}
</TableCell>

<TableCell>
  {product.type ? (
    <div className="flex items-center gap-1">
      <Badge variant="outline">
        {product.type.code}
      </Badge>
      {product.type.manageStock && (
        <Badge variant="secondary" className="text-xs">
          Magazzino
        </Badge>
      )}
    </div>
  ) : (
    <span className="text-muted-foreground text-sm">-</span>
  )}
</TableCell>
```

### 🔄 Server Actions

#### Gestione Categorie

**File**: `src/services/actions/product-category-actions.ts`

**Funzioni**:
- `getProductCategoriesAction()` - Lista categorie organizzazione
- `createProductCategoryAction()` - Crea nuova categoria
- `updateProductCategoryAction()` - Aggiorna categoria
- `deleteProductCategoryAction()` - Elimina categoria (blocca se prodotti associati)

#### Gestione Tipologie

**File**: `src/services/actions/product-type-actions.ts`

**Funzioni**:
- `getProductTypesAction()` - Lista tipologie organizzazione
- `createProductTypeAction()` - Crea nuova tipologia
- `updateProductTypeAction()` - Aggiorna tipologia
- `deleteProductTypeAction()` - Elimina tipologia (blocca se prodotti associati)

### 📐 Modello Dati Relazionale

```
┌──────────────────┐
│ Organization     │
│                  │
│ • id             │───┐
└──────────────────┘   │
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────┐
│ProductCategory│ │ProductType   │ │ Product  │ │Warehouse │
│              │ │              │ │          │ │          │
│• code        │ │• code        │ │• code    │ │• code    │
│• description │ │• description │ │• name    │ │• name    │
│              │ │• manageStock │ │• price   │ │          │
│              │ │              │ │          │ │          │
│              │ │              │ │• categoryId (FK)       │
│              │ │              │ │• typeId (FK)           │
│              │ │              │ │• defaultWarehouseId (FK)│
└──────────────┘ └──────────────┘ └──────────┘ └──────────┘
```

### 🎯 Best Practices

1. **Nomenclatura Codici**:
   - Usa codici brevi e significativi (max 20 caratteri)
   - Solo lettere maiuscole, numeri e underscore
   - Esempi: "MAT", "SER", "FIN", "MAT_RAW", "SER_CONS"

2. **Gestione Magazzino**:
   - Imposta `manageStock = true` solo per prodotti fisici
   - Servizi e consulenze devono avere `manageStock = false`
   - Il sistema blocca movimenti magazzino per prodotti con `manageStock = false`

3. **Eliminazione Classificazioni**:
   - Verifica sempre se ci sono prodotti associati prima di eliminare
   - Le Server Actions bloccano l'eliminazione se ci sono prodotti associati
   - Considera la disattivazione (`active = false`) invece dell'eliminazione

4. **Filtri e Report**:
   - Usa le classificazioni per filtri avanzati
   - Genera report per categoria o tipologia
   - Analizza vendite per categoria/tipologia

## 📄 Sistema di Gestione Tipi Documento

### 🎯 DocumentTypeConfig: Configurazione Tipi Documento

Il sistema YottaErp utilizza un sistema configurabile per gestire i tipi di documento, che permette di controllare il comportamento dei documenti rispetto a:
- **Movimentazione Magazzino**: Se il documento movimenta lo stock
- **Impatto Valorizzazione**: Se il documento impatta costi/ricavi
- **Segno Operazione**: Direzione dell'operazione (incremento/decremento)
- **Numerazione**: Raggruppamento per serie numeriche separate

#### Schema Database

```prisma
model DocumentTypeConfig {
  id              String   @id @default(cuid())
  organizationId  String   // ✅ MULTITENANT
  
  // Identificazione
  code            String   // Codice tipo (es. "QUOTE", "ORDER", "DDT", "INVOICE", "NC")
  description     String   // Descrizione tipo documento
  
  // Numerazione
  numeratorCode   String   // Raggruppa tipi con stessa numerazione (es. "FATTURE", "DDT")
  
  // Flag controllo comportamento
  inventoryMovement Boolean @default(false) // Movimenta stock?
  valuationImpact   Boolean @default(false) // Impatta costi/ricavi?
  operationSignStock     Int?    // +1 incremento stock, -1 decremento stock (null se inventoryMovement = false)
  operationSignValuation Int?    // +1 incremento ricavi, -1 decremento ricavi (null se valuationImpact = false)
  
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  documents       Document[]
  stockMovements  StockMovement[]
  
  @@unique([organizationId, code])
  @@index([organizationId, active])
  @@index([organizationId, numeratorCode])
}
```

#### Flag di Controllo: Significato e Utilizzo

##### 1. `inventoryMovement` (Movimenta Stock)

**Scopo**: Determina se il documento genera movimenti di magazzino

**Valori**:
- **`true`**: Il documento movimenta lo stock
  - Esempi: DDT, Fattura vendita, Ordine fornitore
  - Comportamento: Crea automaticamente `StockMovement` per ogni riga prodotto
- **`false`**: Il documento NON movimenta lo stock
  - Esempi: Preventivo, Ordine cliente (non confermato)
  - Comportamento: Nessun movimento magazzino, solo registrazione documento

**Logica Applicativa**:
```typescript
async function createDocument(data: CreateDocumentInput) {
  const document = await prisma.document.create({ data });
  
  // Per ogni riga documento
  for (const line of data.lines) {
    const product = await prisma.product.findUnique({
      where: { id: line.productId },
      include: { type: true }
    });
    
    // Verifica: tipo documento movimenta stock E prodotto gestisce magazzino
    if (document.documentType.inventoryMovement && 
        product?.type?.manageStock) {
      
      // Crea movimento magazzino
      await prisma.stockMovement.create({
        data: {
          productId: line.productId,
          warehouseId: data.warehouseId,
          quantity: new Decimal(line.quantity.toString())
            .mul(document.documentType.operationSignStock ?? 1) // Applica segno operazione magazzino
            .neg(), // Negativo per scarico vendita
          type: 'SCARICO_VENDITA',
          documentTypeId: document.documentTypeId,
          documentId: document.id,
          documentNumber: document.number,
        }
      });
    }
  }
  
  return document;
}
```

##### 2. `valuationImpact` (Impatto Valorizzazione)

**Scopo**: Determina se il documento impatta costi/ricavi (contabilità)

**Valori**:
- **`true`**: Il documento impatta costi/ricavi
  - Esempi: Fattura vendita, Nota Credito, Fattura acquisto
  - Comportamento: Registrato in contabilità, impatta profitti/perdite
- **`false`**: Il documento NON impatta costi/ricavi
  - Esempi: DDT, Preventivo, Ordine
  - Comportamento: Solo documentazione, nessun impatto contabile

**Logica Applicativa**:
```typescript
async function processDocumentForAccounting(documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { documentType: true }
  });
  
  // Solo documenti con valuationImpact vengono registrati in contabilità
  if (document.documentType.valuationImpact) {
    // Registra in contabilità
    await registerAccountingEntry({
      type: document.documentType.operationSignValuation === 1 ? 'REVENUE' : 'CREDIT',
      amount: document.grossTotal,
      documentId: document.id,
      date: document.date,
    });
  }
}
```

##### 3. `operationSignStock` (Segno Operazione Magazzino)

**Scopo**: Determina la direzione dell'operazione per movimenti magazzino

**Attivazione**: Abilitato solo se `inventoryMovement = true`

**Valori**:
- **`+1`**: Incremento stock
  - Esempi: Carico fornitore, Reso cliente, Carico iniziale
  - Comportamento: Aumenta giacenza magazzino
- **`-1`**: Decremento stock
  - Esempi: Scarico vendita, DDT, Reso fornitore
  - Comportamento: Riduce giacenza magazzino
- **`null`**: Non applicabile (se `inventoryMovement = false`)

**Logica Applicativa**:
```typescript
// Movimento magazzino con segno stock
function createStockMovement(
  quantity: Decimal,
  operationSignStock: number | null,
  inventoryMovement: boolean
) {
  if (!inventoryMovement || operationSignStock === null) return null;
  
  // Quantità negativa per scarico, positiva per carico
  // operationSignStock = +1 (carico fornitore) → carico (positivo)
  // operationSignStock = -1 (scarico vendita) → scarico (negativo)
  const signedQuantity = quantity.mul(operationSignStock).neg();
  
  return {
    quantity: signedQuantity,
    // ...
  };
}
```

##### 4. `operationSignValuation` (Segno Operazione Valorizzazione)

**Scopo**: Determina la direzione dell'operazione per impatto contabile

**Attivazione**: Abilitato solo se `valuationImpact = true`

**Valori**:
- **`+1`**: Incremento ricavi/costi
  - Esempi: Fattura vendita, Fattura acquisto
  - Comportamento: Aumenta ricavi o costi in contabilità
- **`-1`**: Decremento ricavi/costi
  - Esempi: Nota Credito, Reso
  - Comportamento: Riduce ricavi o costi in contabilità
- **`null`**: Non applicabile (se `valuationImpact = false`)

**Logica Applicativa**:
```typescript
// Calcolo totale con segno valorizzazione
function calculateDocumentTotal(lines: DocumentLine[], operationSignValuation: number | null) {
  const baseTotal = lines.reduce((sum, line) => 
    sum.plus(line.grossAmount), new Decimal(0)
  );
  
  // Applica segno operazione solo se valuationImpact è attivo
  if (operationSignValuation !== null) {
    return baseTotal.mul(operationSignValuation);
  }
  
  return baseTotal; // Nessun impatto contabile
}

// Registrazione contabile
async function processDocumentForAccounting(documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { documentType: true }
  });
  
  // Solo documenti con valuationImpact vengono registrati in contabilità
  if (document.documentType.valuationImpact && 
      document.documentType.operationSignValuation !== null) {
    // Registra in contabilità
    await registerAccountingEntry({
      type: document.documentType.operationSignValuation === 1 ? 'REVENUE' : 'CREDIT',
      amount: document.grossTotal,
      documentId: document.id,
      date: document.date,
    });
  }
}
```

##### 5. `numeratorCode` (Codice Numerazione)

**Scopo**: Raggruppa tipi documento con stessa serie numerica

**Esempi**:
- **"FATTURE"**: Raggruppa Fatture e Note Credito (numerazione unica)
- **"DDT"**: Raggruppa tutti i DDT (numerazione separata)
- **"ORDINI"**: Raggruppa Ordini Cliente e Fornitore

**Logica Applicativa**:
```typescript
async function generateDocumentNumber(
  documentTypeId: string,
  organizationId: string
): Promise<string> {
  const docType = await prisma.documentTypeConfig.findUnique({
    where: { id: documentTypeId }
  });
  
  // Trova ultimo numero per questa serie numerica
  const lastDoc = await prisma.document.findFirst({
    where: {
      organizationId,
      documentType: {
        numeratorCode: docType.numeratorCode
      }
    },
    orderBy: { number: 'desc' }
  });
  
  // Genera numero progressivo
  const nextNumber = lastDoc 
    ? parseInt(lastDoc.number) + 1 
    : 1;
  
  return nextNumber.toString().padStart(6, '0');
}
```

### 🔄 Flusso Creazione Documento con Movimenti Magazzino

```
User crea documento (es. DDT)
    ↓
createDocumentAction(data)
    ↓
1. Crea Document con documentTypeId
    ↓
2. Per ogni riga documento:
    ↓
   Verifica documentType.inventoryMovement
    ↓
   Se true:
      ↓
      Verifica product.type.manageStock
      ↓
      Se true:
         ↓
         Calcola quantità con operationSign
         ↓
         Crea StockMovement:
            - quantity = line.quantity * operationSignStock * (-1 per scarico)
            - type = 'SCARICO_DDT' o 'SCARICO_VENDITA'
            - documentTypeId = document.documentTypeId
            - documentId = document.id
    ↓
3. Se documentType.valuationImpact = true:
    ↓
   Registra in contabilità
    ↓
4. Return document
```

### 📊 Esempi Configurazioni Tipi Documento

#### Esempio 1: Preventivo (QUOTE)
```typescript
{
  code: "QUOTE",
  description: "Preventivo",
  numeratorCode: "PREVENTIVI",
  inventoryMovement: false,  // ❌ Non movimenta stock
  valuationImpact: false,    // ❌ Non impatta contabilità
  operationSignStock: null,      // Non applicabile (inventoryMovement = false)
  operationSignValuation: null,  // Non applicabile (valuationImpact = false)
  active: true
}
```

#### Esempio 2: DDT (DELIVERY_NOTE)
```typescript
{
  code: "DDT",
  description: "Documento di Trasporto",
  numeratorCode: "DDT",
  inventoryMovement: true,   // ✅ Movimenta stock
  valuationImpact: false,    // ❌ Non impatta contabilità
  operationSignStock: -1,        // -1 (decremento stock - scarico vendita)
  operationSignValuation: null,  // Non applicabile (valuationImpact = false)
  active: true
}
```

#### Esempio 3: Fattura (INVOICE)
```typescript
{
  code: "INVOICE",
  description: "Fattura",
  numeratorCode: "FATTURE",
  inventoryMovement: true,   // ✅ Movimenta stock (se già non fatto da DDT)
  valuationImpact: true,     // ✅ Impatta contabilità
  operationSignStock: -1,        // -1 (decremento stock - scarico vendita)
  operationSignValuation: 1,     // +1 (incremento ricavi)
  active: true
}
```

#### Esempio 4: Nota Credito (CREDIT_NOTE)
```typescript
{
  code: "NC",
  description: "Nota di Credito",
  numeratorCode: "FATTURE", // Stessa serie di fatture
  inventoryMovement: true,   // ✅ Movimenta stock (reso)
  valuationImpact: true,     // ✅ Impatta contabilità (riduce ricavi)
  operationSignStock: 1,         // +1 (incremento stock - reso cliente)
  operationSignValuation: -1,   // -1 (decremento ricavi)
  active: true
}
```

### 🔗 Relazione Document ↔ StockMovement

**Schema Document**:
```prisma
model Document {
  id            String   @id @default(cuid())
  documentTypeId String  // ✅ Relazione obbligatoria
  documentType   DocumentTypeConfig @relation(...)
  category      DocumentCategory // Enum per logiche hardcoded
  number        String
  date          DateTime
  // ... altri campi
}
```

**Schema StockMovement**:
```prisma
model StockMovement {
  id            String   @id @default(cuid())
  productId     String
  warehouseId   String
  quantity      Decimal  @db.Decimal(12, 4)
  type          MovementType
  
  // ✅ Relazione opzionale a DocumentTypeConfig
  documentTypeId   String?
  documentType     DocumentTypeConfig? @relation(...)
  documentId       String?
  documentNumber   String?
  
  // ... altri campi
}
```

### 🎨 Interfaccia Utente Configurazione

**Pagina**: `src/app/(dashboard)/settings/document-types/page.tsx`

**Funzionalità**:
- Lista configurazioni tipi documento organizzazione
- Creazione nuova configurazione
- Modifica configurazione esistente
- Eliminazione (bloccata se documenti associati)
- Visualizzazione flag con badge colorati

**Form Configurazione**:
- **Codice**: Input con validazione (solo maiuscole, numeri, underscore)
- **Descrizione**: Input testo
- **Codice Numerazione**: Input con validazione
- **Movimenta Stock**: Switch toggle
- **Impatto Valutazione**: Switch toggle
- **Segno Operazione**: Select (+1 / -1)
- **Attiva**: Switch toggle

### 🔐 Regole di Business

1. **Creazione Documento**:
   - Ogni documento DEVE avere un `documentTypeId` valido
   - Il `category` (enum) è mantenuto per compatibilità logiche hardcoded
   - La configurazione determina comportamento magazzino e contabilità

2. **Movimenti Magazzino**:
   - Generati solo se `inventoryMovement = true` E `product.type.manageStock = true`
   - La quantità è moltiplicata per `operationSignStock` (se `inventoryMovement = true`)
   - L'importo contabile è moltiplicato per `operationSignValuation` (se `valuationImpact = true`)
   - Il segno finale dipende dal tipo operazione (carico/scarico)

3. **Contabilità**:
   - Solo documenti con `valuationImpact = true` vengono registrati
   - Il segno dell'operazione determina entrata/uscita

4. **Numerazione**:
   - Documenti con stesso `numeratorCode` condividono serie numerica
   - La numerazione è progressiva per serie

5. **Eliminazione Configurazione**:
   - Bloccata se ci sono documenti associati
   - Verifica `prisma.document.count({ where: { documentTypeId } })`

### 📐 Modello Dati Relazionale

```
┌──────────────────┐
│ Organization     │
│                  │
│ • id             │───┐
└──────────────────┘   │
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│DocumentType  │ │ Document     │ │StockMovement │
│Config        │ │              │ │              │
│              │ │              │ │              │
│• code        │ │• number      │ │• quantity    │
│• description │ │• date        │ │• type        │
│• numerator   │ │• grossTotal  │ │              │
│  Code        │ │              │ │              │
│• inventory   │ │• documentType│ │• documentType│
│  Movement    │ │  Id (FK)     │ │  Id (FK)     │
│• valuation   │ │              │ │• documentId  │
│  Impact      │ │              │ │              │
│• operation   │ │              │ │              │
│  Sign        │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
```

### 🎯 Best Practices

1. **Configurazione Tipi Documento**:
   - Crea configurazioni all'inizio del setup organizzazione
   - Usa codici chiari e consistenti (es. "DDT", "INVOICE", "NC")
   - Raggruppa tipi correlati con stesso `numeratorCode`

2. **Flag Comportamento**:
   - `inventoryMovement = true` solo per documenti che movimentano stock
   - `valuationImpact = true` solo per documenti contabili
   - `operationSignStock = -1` per scarichi magazzino, `+1` per carichi
   - `operationSignValuation = -1` solo per documenti che riducono ricavi/costi (note credito, resi)

3. **Numerazione**:
   - Usa `numeratorCode` per raggruppare serie logiche
   - Esempio: Fatture e Note Credito condividono "FATTURE"

4. **Eliminazione**:
   - Disattiva (`active = false`) invece di eliminare se ci sono documenti
   - Verifica sempre documenti associati prima di eliminare

## 📦 Servizio di Gestione Magazzino (Stock Service)

### 🎯 Calculated Stock Rule

Il sistema YottaErp implementa rigorosamente la **Calculated Stock Rule**: la giacenza NON è un campo statico nel `Product`, ma viene calcolata dinamicamente come somma algebrica di tutti i movimenti in `StockMovement`.

**Principio Fondamentale**:
- ✅ **MAI** aggiornare direttamente un campo `stock` nel Product
- ✅ **SEMPRE** creare nuovi record in `StockMovement`
- ✅ La giacenza si aggiorna automaticamente quando si aggiungono movimenti
- ✅ Usa sempre `Decimal.js` per calcoli (MAI `number`)

### 📁 Struttura File

```
src/services/business/
└── stock-service.ts          # ✅ Servizio gestione magazzino
```

### 🔧 Funzioni Principali

#### 1. `processDocumentLineStock()`

**Scopo**: Processa una riga documento e crea il movimento di magazzino se necessario.

**Flusso**:
1. **Determina warehouseId con logica a cascata** (priorità):
   - Priorità 1: `line.warehouseId` (se specificato sulla riga)
   - Priorità 2: `product.defaultWarehouseId` (se presente nel prodotto)
   - Priorità 3: `documentMainWarehouseId` (magazzino predefinito documento)
   - Se nessuno presente → esce senza creare movimento
2. Verifica `config.inventoryMovement` → Se `false`, esce senza fare nulla
3. Verifica `product.type.manageStock` → Se `false`, esce (prodotto non gestito a magazzino)
4. Calcola quantità algebrica: `line.quantity * config.operationSignStock`
5. Mappa tipo documento al `MovementType` corretto
6. Crea record `StockMovement` con tracciabilità completa

**LOGICA MAGAZZINO A CASCATA**:
```
Riga Documento
├─ warehouseId specifico? → USA QUELLO ✅ (Priorità 1)
└─ NO warehouseId riga?
   ├─ Prodotto ha defaultWarehouseId? → USA QUELLO ✅ (Priorità 2)
   └─ NO defaultWarehouseId prodotto?
      ├─ Documento ha mainWarehouseId? → USA QUELLO ✅ (Priorità 3)
      └─ NO mainWarehouseId documento? → Nessun movimento (errore logico)
```

**Parametri**:
```typescript
processDocumentLineStock(
  tx: PrismaClient,                    // Transazione Prisma (obbligatoria)
  line: DocumentLine & {               // Riga documento (con warehouseId opzionale)
    warehouseId?: string | null;
  },
  config: DocumentTypeConfig,          // Configurazione tipo documento
  documentMainWarehouseId: string | null | undefined, // Magazzino predefinito documento
  documentId: string,                  // ID documento origine
  documentNumber: string,              // Numero documento
  organizationId: string              // ID organizzazione (MULTITENANT)
): Promise<{ id: string; quantity: Decimal } | null>
```

**Esempio Utilizzo**:
```typescript
await prisma.$transaction(async (tx) => {
  const document = await tx.document.create({ 
    data: { 
      mainWarehouseId: 'centrale', // Magazzino predefinito documento
      ... 
    } 
  });
  
  // Per ogni riga documento
  for (const line of document.lines) {
    await processDocumentLineStock(
      tx,
      line, // Può avere line.warehouseId specifico
      documentTypeConfig,
      document.mainWarehouseId, // Fallback se riga non ha warehouseId
      document.id,
      document.number,
      organizationId
    );
  }
});
```

#### 2. `getStock()`

**Scopo**: Calcola la giacenza attuale di un prodotto.

**Formula**: `Giacenza = SUM(quantity) WHERE productId = ? [AND warehouseId = ?]`

**Caratteristiche**:
- Usa `Decimal.js` per precisione fiscale
- Supporta filtro opzionale per magazzino
- Se non ci sono movimenti, restituisce `0`

**Parametri**:
```typescript
getStock(
  productId: string,             // ID prodotto
  organizationId: string,        // ID organizzazione (MULTITENANT)
  warehouseId?: string,          // ID magazzino (opzionale)
  prismaClient?: PrismaClient    // Prisma Client (opzionale, usa singleton se non specificato)
): Promise<Decimal>
```

**Esempio Utilizzo**:
```typescript
// Giacenza totale (tutti i magazzini)
const totalStock = await getStock(productId, organizationId);

// Giacenza per magazzino specifico
const warehouseStock = await getStock(productId, organizationId, warehouseId);
```

#### 3. `getStocks()`

**Scopo**: Calcola la giacenza per più prodotti contemporaneamente (ottimizzazione query).

**Caratteristiche**:
- Query aggregata per performance
- Restituisce mappa `productId -> giacenza (Decimal)`

**Parametri**:
```typescript
getStocks(
  productIds: string[],          // Array di ID prodotti
  organizationId: string,        // ID organizzazione (MULTITENANT)
  warehouseId?: string,          // ID magazzino (opzionale)
  prismaClient?: PrismaClient    // Prisma Client (opzionale)
): Promise<Record<string, Decimal>>
```

**Esempio Utilizzo**:
```typescript
const stocks = await getStocks(['prod1', 'prod2'], organizationId);
console.log(stocks['prod1']); // Decimal con giacenza prodotto 1
```

### 🔄 Flusso Completo Processamento Documento

```
User crea documento (es. DDT)
    ↓
createDocumentAction(data)
    ↓
prisma.$transaction(async (tx) => {
    ↓
1. Crea Document con documentTypeId
    ↓
2. Per ogni riga documento:
    ↓
   processDocumentLineStock(tx, line, config, ...)
    ↓
   ├─ Verifica config.inventoryMovement
   │  Se false → return null (nessun movimento)
   │  Se true → continua
   │
   ├─ Verifica product.type.manageStock
   │  Se false → return null (prodotto non gestito)
   │  Se true → continua
   │
   ├─ Calcola quantità: line.quantity * config.operationSignStock
   │  - operationSignStock = +1 → quantità positiva (carico)
   │  - operationSignStock = -1 → quantità negativa (scarico)
   │
   ├─ Mappa MovementType:
   │  - DDT → SCARICO_DDT
   │  - FAI/FAD/FAC → SCARICO_VENDITA
   │  - OF → CARICO_FORNITORE
   │  - NC → RESO_CLIENTE
   │
   └─ Crea StockMovement:
      - organizationId
      - productId
      - warehouseId
      - quantity (algebrica)
      - type (MovementType)
      - documentTypeId
      - documentId
      - documentNumber
    ↓
3. Commit transazione
    ↓
4. Giacenza aggiornata automaticamente (calcolata da StockMovement)
```

### 🗺️ Mappatura DocumentType → MovementType

La funzione helper `mapDocumentTypeToMovementType()` mappa il codice documento e il segno operazione al `MovementType` corretto:

| DocumentType Code | operationSignStock | MovementType |
|-------------------|-------------------|--------------|
| `DDT`, `CAF` | `-1` | `SCARICO_DDT` |
| `FAI`, `FAD`, `FAC` | `-1` | `SCARICO_VENDITA` |
| `OF`, `ORD_FORNITORE` | `+1` | `CARICO_FORNITORE` |
| `NC`, `NDC`, `NCF` | `+1` | `RESO_CLIENTE` |
| `RESO_FORNITORE` | `-1` | `RESO_FORNITORE` |

### 📊 Calcolo Giacenza

**Formula**:
```typescript
// Giacenza = Somma algebrica di tutti i movimenti
const stock = movements.reduce(
  (acc, movement) => acc.plus(toDecimal(movement.quantity.toString())),
  new Decimal(0)
);
```

**Esempio**:
```
Movimenti:
- CARICO_INIZIALE: +100
- CARICO_FORNITORE: +50
- SCARICO_DDT: -30
- SCARICO_VENDITA: -20

Giacenza = 100 + 50 - 30 - 20 = 100
```

### 🔐 Regole di Business

1. **Movimento Magazzino Creato Solo Se**:
   - `documentType.inventoryMovement = true` **E**
   - `product.type.manageStock = true` **E**
   - `warehouseId` determinabile (riga, prodotto o documento)

2. **Logica Magazzino a Cascata (Priorità)**:
   - **Priorità 1**: `line.warehouseId` (magazzino specifico della riga)
   - **Priorità 2**: `product.defaultWarehouseId` (magazzino predefinito del prodotto)
   - **Priorità 3**: `document.mainWarehouseId` (magazzino predefinito del documento)
   - Se nessuno presente → nessun movimento creato

3. **Quantità Algebrica**:
   - Positiva per carichi (es. `+10` pezzi)
   - Negativa per scarichi (es. `-10` pezzi)
   - Il segno viene determinato da `operationSignStock`

4. **Tracciabilità**:
   - Ogni movimento è collegato al documento origine
   - Campi: `documentTypeId`, `documentId`, `documentNumber`
   - Permette audit completo e rettifiche

5. **Immutabilità**:
   - I movimenti NON si modificano, solo si creano
   - Per rettifiche, creare nuovo movimento con segno opposto

6. **MULTITENANT**:
   - Ogni movimento appartiene a un'organizzazione
   - Le query filtrano automaticamente per `organizationId`

### 🎨 Integrazione con Creazione Documenti

**Pattern Consistente**:
```typescript
// In document-actions.ts o simile
export async function createDocumentAction(data: CreateDocumentInput) {
  return await prisma.$transaction(async (tx) => {
    // 1. Crea documento
    const document = await tx.document.create({ data: documentData });
    
    // 2. Crea righe documento
    for (const lineData of data.lines) {
      await tx.documentLine.create({ data: lineData });
    }
    
    // 3. Processa movimenti magazzino
    const documentType = await tx.documentTypeConfig.findUnique({
      where: { id: document.documentTypeId }
    });
    
    if (documentType) {
      for (const line of document.lines) {
        await processDocumentLineStock(
          tx,
          line,
          documentType,
          data.warehouseId,
          document.id,
          document.number,
          data.organizationId
        );
      }
    }
    
    return document;
  });
}
```

### 📐 Modello Dati Relazionale

```
┌──────────────────┐
│ Organization     │
│                  │
│ • id             │───┐
└──────────────────┘   │
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│Product       │ │Document      │ │Warehouse     │
│              │ │              │ │              │
│• id          │ │• id           │ │• id          │
│• typeId (FK) │ │• documentType │ │• code        │
│• default     │ │  Id (FK)      │ │• name        │
│  WarehouseId │ │• mainWarehouse│ │              │
│  (FK)        │ │  Id (FK)      │ │              │
│              │ │• number       │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
       │                  │                  │
       │                  │                  │
       └──────────────────┼──────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │StockMovement     │
              │                  │
              │• productId (FK)  │
              │• warehouseId (FK)│
              │• quantity        │
              │• type            │
              │• documentTypeId  │
              │  (FK)            │
              │• documentId      │
              │• documentNumber  │
              │• organizationId  │
              │  (FK)            │
              └──────────────────┘
```

### 🎯 Best Practices

1. **Sempre in Transazione**:
   - `processDocumentLineStock()` deve essere chiamato dentro `prisma.$transaction()`
   - Garantisce atomicità: documento e movimenti creati insieme o nessuno

2. **Calcolo Giacenza**:
   - Usa `getStock()` per calcolare giacenza, non query manuali
   - Per più prodotti, usa `getStocks()` per performance

3. **Validazione**:
   - Verifica sempre `inventoryMovement` e `manageStock` prima di chiamare il servizio
   - Il servizio fa doppio check, ma è meglio validare prima

4. **Error Handling**:
   - Il servizio lancia errori se prodotto non trovato o configurazione invalida
   - Gestisci errori nella transazione per rollback automatico

5. **Performance**:
   - Per liste prodotti, usa `getStocks()` invece di chiamare `getStock()` N volte
   - Considera cache per giacenze se necessario (con invalidazione su movimenti)

## 📈 Performance Considerations

### Ottimizzazioni Implementate:
- ✅ Single query con `_count` per statistiche (no N+1)
- ✅ Indexes database su campi frequenti (organizationId, vatNumber)
- ✅ Client-side validation per ridurre chiamate server
- ✅ Revalidazione solo quando necessario (dopo mutations)
- ✅ Loading states per UX durante fetch
- ✅ **Query parallele per dashboard stats** (`Promise.all()`)
- ✅ **Suspense boundaries** per loading states
- ✅ **Server Components** per ridurre bundle client
- ✅ **Lazy loading Sheet** (mobile menu caricato solo quando necessario)
- ✅ **Include relazioni** per evitare N+1 queries (categoria, tipologia, vatRate)

### Ottimizzazioni Suggerite (Futuri):
- [ ] Paginazione per >100 organizzazioni
- [ ] Virtual scrolling per liste molto lunghe
- [ ] Cache Redis per statistiche globali
- [ ] Debounce su search/filter
- [ ] Lazy loading dialog form

## 🧪 Test Coverage

### Test Implementati:
- ✅ Script automatico connessione database
- ✅ Script automatico conteggi e statistiche
- ✅ Validazione P.IVA checksum
- ✅ Validazione CF checksum
- ✅ Unique constraint P.IVA

### Test da Implementare (Suggeriti):
- [ ] Unit tests validatori
- [ ] Integration tests server actions
- [ ] E2E tests con Playwright/Cypress
- [ ] Test accessibilità (a11y)
- [ ] Test responsiveness mobile

---

**Versione:** 1.0.0  
**Data:** 2026-02-01  
**Autore:** YottaErp Development Team
