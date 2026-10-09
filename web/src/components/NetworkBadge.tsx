import type { Labels } from '../config/labels';
import { useOnline } from '../lib/online';

/** Small status pill in the header. The text collapses to a dot on narrow phones but stays readable to screen readers. */
export function NetworkBadge({ labels }: { labels: Labels }) {
  const online = useOnline();
  return (
    <span
      role='status'
      title={online ? labels.networkOnlineHint : labels.networkOfflineHint}
      className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold leading-4 ${
        online ? 'border-sprout-line bg-sprout text-leaf' : 'border-[#d9b25a] bg-warn text-ink'
      }`}
    >
      <span aria-hidden='true' className={`size-2 rounded-full ${online ? 'bg-leaf' : 'bg-[#c98a12]'}`} />
      <span className='max-[479px]:sr-only'>{online ? labels.networkOnline : labels.networkOffline}</span>
    </span>
  );
}
