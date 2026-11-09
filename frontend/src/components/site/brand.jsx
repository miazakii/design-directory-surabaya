import { cn } from '@/lib/utils';

export function Brand({ content, className, compact = false }) {
  const shortName = content?.site?.shortName || 'Design Directory';
  const accent = content?.site?.accent || 'Surabaya';
  return (
    <a
      href="index.html"
      className={cn('group inline-flex items-baseline gap-1.5 font-semibold tracking-tight', className)}
      aria-label={`${shortName} ${accent} — beranda`}
    >
      <span className={compact ? 'text-[15px]' : 'text-base'}>{shortName}</span>
      <span className={cn('text-brand', compact ? 'text-[15px]' : 'text-base')}>{accent}</span>
    </a>
  );
}
