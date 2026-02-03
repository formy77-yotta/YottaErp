/**
 * Pagina di Login Development
 * 
 * ⚠️ SOLO PER DEVELOPMENT!
 * Questa pagina permette di simulare il login impostando cookie.
 * In production, sostituire con un vero sistema di autenticazione.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Shield, User, AlertCircle, CheckCircle } from 'lucide-react';

export default function DevLoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('dev_admin_1');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // User ID predefiniti per comodità
  const presetUsers = [
    { id: 'dev_admin_1', label: 'Super Admin', icon: Shield, isSuperAdmin: true },
    { id: 'user_normale', label: 'Utente Normale', icon: User, isSuperAdmin: false },
  ];

  /**
   * Imposta cookie e redirect
   */
  function handleLogin(userIdToSet: string) {
    try {
      // Imposta cookie userId
      document.cookie = `userId=${userIdToSet}; path=/; max-age=86400`; // 24 ore
      
      setStatus({
        type: 'success',
        message: `✅ Login effettuato come: ${userIdToSet}`
      });

      // Redirect dopo 1 secondo
      setTimeout(() => {
        router.push('/organizations');
      }, 1000);
    } catch (error) {
      setStatus({
        type: 'error',
        message: '❌ Errore durante il login'
      });
    }
  }

  /**
   * Logout (cancella cookie)
   */
  function handleLogout() {
    document.cookie = 'userId=; path=/; max-age=0';
    document.cookie = 'currentOrganizationId=; path=/; max-age=0';
    
    setStatus({
      type: 'success',
      message: '✅ Logout effettuato'
    });
    
    setUserId('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold">Development Login</CardTitle>
            <CardDescription className="text-base mt-2">
              ⚠️ Solo per sviluppo - Imposta cookie manualmente
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Message */}
          {status && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                status.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span className="text-sm font-medium">{status.message}</span>
            </div>
          )}

          {/* Preset Users */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Login Rapido:</Label>
            <div className="grid gap-2">
              {presetUsers.map((user) => {
                const Icon = user.icon;
                return (
                  <Button
                    key={user.id}
                    variant={user.isSuperAdmin ? 'default' : 'outline'}
                    className="w-full justify-start gap-3 h-auto py-3"
                    onClick={() => handleLogin(user.id)}
                  >
                    <Icon className="h-5 w-5" />
                    <div className="text-left flex-1">
                      <div className="font-semibold">{user.label}</div>
                      <div className="text-xs opacity-80">{user.id}</div>
                    </div>
                    {user.isSuperAdmin && (
                      <span className="text-xs bg-white/20 px-2 py-1 rounded">
                        Super Admin
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">oppure</span>
            </div>
          </div>

          {/* Custom User ID */}
          <div className="space-y-2">
            <Label htmlFor="userId" className="text-sm font-medium text-gray-700">
              User ID Personalizzato:
            </Label>
            <div className="flex gap-2">
              <Input
                id="userId"
                type="text"
                placeholder="es. user_123abc"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => handleLogin(userId)}
                disabled={!userId.trim()}
              >
                Login
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Inserisci un user ID presente in <code className="bg-gray-100 px-1 rounded">SUPER_ADMIN_IDS</code>
            </p>
          </div>

          {/* Logout Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleLogout}
          >
            Logout (Cancella Cookie)
          </Button>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-blue-900">📝 Come funziona:</p>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>Imposta cookie <code>userId</code> nel browser</li>
              <li>Se l&apos;ID è in <code>SUPER_ADMIN_IDS</code> → accesso OK</li>
              <li>Altrimenti → redirect a <code>/access-denied</code></li>
            </ul>
            <p className="text-xs text-blue-900 mt-3">
              <strong>Variabili ambiente:</strong>
            </p>
            <pre className="text-xs bg-blue-100 p-2 rounded mt-1 overflow-x-auto">
SUPER_ADMIN_IDS=&quot;dev_admin_1&quot;
            </pre>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex gap-2 items-start">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-xs text-amber-900">
                <strong>⚠️ Solo per Development!</strong>
                <br />
                In production, implementa un vero sistema di autenticazione
                (NextAuth, Clerk, Supabase Auth, ecc.)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
