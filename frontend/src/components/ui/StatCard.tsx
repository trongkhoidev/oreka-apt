import { formatHuman } from '@/lib/format';

export default function StatCard({
  label, value, mono = false
}: { label: string; value?: string | number; mono?: boolean; }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-gray-500 text-sm">{label}</div>
      <div className={`text-xl font-semibold ${mono ? 'font-mono' : ''}`}>
        {formatHuman(value)}
      </div>
    </div>
  );
}


