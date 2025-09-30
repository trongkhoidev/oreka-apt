import { shorten } from '@/lib/format';

export default function ProfileHeader({ addr }: { addr: string }) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">Profile: <span className="font-mono">{shorten(addr, 10, 8)}</span></h1>
      <a className="text-sm underline" href={`/profiles/${addr}`}>Permalink</a>
    </div>
  );
}


