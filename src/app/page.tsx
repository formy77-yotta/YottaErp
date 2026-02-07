/**
 * Home Page YottaErp
 *
 * Se l'utente è autenticato → redirect alla Dashboard (pagina iniziale dell'ERP).
 * Altrimenti → landing page pubblica con login e info.
 */

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2,
  Users,
  FileText,
  Package,
  Shield,
  LogIn,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ noOrg?: string }>;
}) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  const { noOrg } = await searchParams;

  // Se autenticato e non arrivato da "nessuna organizzazione" → Dashboard come pagina iniziale
  if (userId && !noOrg) {
    redirect('/dashboard');
  }
  const features = [
    {
      icon: Building2,
      title: 'Organizzazioni',
      description: 'Gestisci tutte le organizzazioni dal pannello Super Admin',
      href: '/organizations',
      color: 'bg-blue-500',
      badge: 'Super Admin',
      badgeColor: 'bg-red-500'
    },
    {
      icon: Users,
      title: 'Clienti & Fornitori',
      description: 'Anagrafica completa con validazione P.IVA e CF',
      href: '#',
      color: 'bg-green-500',
      disabled: true
    },
    {
      icon: FileText,
      title: 'Documenti',
      description: 'Preventivi, DDT, Fatture con snapshot immutabili',
      href: '#',
      color: 'bg-purple-500',
      disabled: true
    },
    {
      icon: Package,
      title: 'Prodotti & Magazzino',
      description: 'Gestione stock con movimenti calcolati',
      href: '#',
      color: 'bg-orange-500',
      disabled: true
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">YottaErp</h1>
          </div>
          <Link href="/dev-login">
            <Button variant="outline" size="sm" className="gap-2">
              <LogIn className="h-4 w-4" />
              Dev Login
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm" className="gap-2">
              <LogIn className="h-4 w-4" />
              Accedi
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
            <Shield className="h-4 w-4" />
            Sistema ERP Multi-tenant con RLS
          </div>
          
          <h1 className="text-5xl font-bold text-gray-900 tracking-tight">
            Gestionale ERP Completo
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Sistema ERP conforme alla normativa fiscale italiana con gestione multi-organizzazione,
            calcoli monetari precisi con Decimal.js e sicurezza enterprise.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/organizations">
              <Button size="lg" className="gap-2">
                <Shield className="h-5 w-5" />
                Pannello Super Admin
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            
            <Link href="/dev-login">
              <Button size="lg" variant="outline" className="gap-2">
                <LogIn className="h-5 w-5" />
                Login Development
              </Button>
            </Link>
          </div>

          {/* Quick Access Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-8">
            <div className="flex items-center justify-center gap-2 text-sm text-amber-900">
              <AlertCircle className="h-4 w-4" />
              <span>
                <strong>Development Mode:</strong> Vai su{' '}
                <Link href="/dev-login" className="underline font-semibold">
                  /dev-login
                </Link>{' '}
                per impostare cookie e testare il sistema
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
          Moduli ERP
        </h2>
        
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon;
            
            const cardContent = (
              <Card 
                className={`h-full transition-all ${
                  feature.disabled 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'hover:shadow-lg hover:-translate-y-1 cursor-pointer'
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`${feature.color} p-3 rounded-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    {feature.badge && (
                      <span className={`${feature.badgeColor || 'bg-gray-500'} text-white text-xs px-2 py-1 rounded-full`}>
                        {feature.badge}
                      </span>
                    )}
                    {feature.disabled && (
                      <span className="bg-gray-300 text-gray-700 text-xs px-2 py-1 rounded-full">
                        Prossimamente
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-xl mt-4">{feature.title}</CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
            
            return (
              <div key={feature.title}>
                {feature.disabled ? (
                  cardContent
                ) : (
                  <Link href={feature.href}>
                    {cardContent}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="container mx-auto px-4 py-16 border-t">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">
            Stack Tecnologico
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-2">Frontend</h3>
              <p className="text-sm text-gray-600">
                Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-2">Backend</h3>
              <p className="text-sm text-gray-600">
                Prisma ORM, PostgreSQL, Server Actions, RLS Security
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-2">ERP Core</h3>
              <p className="text-sm text-gray-600">
                decimal.js, Zod, date-fns, Validazione Italiana
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-gray-600">
          <p>YottaErp - Sistema Gestionale Multi-tenant</p>
          <p className="mt-2">Conforme alla normativa fiscale italiana</p>
          <p className="mt-4 text-xs">
            Leggi{' '}
            <code className="bg-gray-100 px-2 py-1 rounded">REGOLE_DI_SVILUPPO.md</code>
            {' '}per le regole architetturali ERP
          </p>
        </div>
      </footer>
    </div>
  );
}
