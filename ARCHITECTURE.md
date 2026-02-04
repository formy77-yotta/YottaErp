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
        ┌────────────┼────────────┬──────────────┬────────────┐
        │            │            │              │            │
        ▼            ▼            ▼              ▼            ▼
┌───────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│UserOrganization│ │ Entity   │ │ Product  │ │Warehouse │ │ Document     │
│               │ │          │ │          │ │          │ │              │
│• userId       │ │• type    │ │• code    │ │• code    │ │• number      │
│• role         │ │• name    │ │• name    │ │• name    │ │• type        │
│               │ │• vatNumber│ │• price   │ │          │ │• grossTotal  │
└───────────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘
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
