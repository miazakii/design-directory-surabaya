import { cn } from '@/lib/utils';

export function Brand({ className, compact = false }) {
  return (
    <a
      href="index.html"
      className={cn('group inline-flex items-baseline gap-1.5 font-semibold tracking-tight', className)}
      aria-label="Design Directory Surabaya — beranda"
    >
      <span className={compact ? 'text-[15px]' : 'text-base'}>Design Directory</span>
      <span className={cn('text-brand', compact ? 'text-[15px]' : 'text-base')}>Surabaya</span>
    </a>
  );
}
