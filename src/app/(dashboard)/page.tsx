/**
 * Index del gruppo (dashboard): reindirizza alla Dashboard.
 * La pagina effettiva è in /dashboard per avere URL dedicato.
 */

import { redirect } from 'next/navigation';

export default function DashboardIndexPage() {
  redirect('/dashboard');
}
