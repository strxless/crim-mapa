import { ensureSchema, getStreetworkStats, getAllStreetworkMonths } from '@/lib/store';
import StreetworkClient from './StreetworkClient';

export const dynamic = 'force-dynamic';

export default async function StreetworkPage() {
  await ensureSchema();

  const stats = await getStreetworkStats();
  const months = await getAllStreetworkMonths();

  // Ensure we have at least current month
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  if (!months.includes(currentMonth)) {
    months.unshift(currentMonth);
  }

  return <StreetworkClient initialStats={stats} initialMonths={months} />;
}
