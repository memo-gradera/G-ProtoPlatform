import React from 'react';
import { GRADERA_LOGO_SRC } from '@/lib/logoAsset';
import { cn } from '@/lib/utils';

/** Rendered dimensions (Tailwind): sm 64px, md 80px, lg 112px, xl 128px (2x previous sizes). */
const sizeMap = {
  sm: 'w-14 h-14 sm:w-16 sm:h-16',
  md: 'w-16 h-16 sm:w-20 sm:h-20',
  lg: 'w-24 h-24 sm:w-28 sm:h-28',
  xl: 'w-28 h-28 sm:w-32 sm:h-32',
};

const toneMap = {
  /** White logo for dark surfaces (sidebar). */
  onDark: '',
  /** Dark logo for light surfaces (login, splash). */
  onLight: 'brightness-0 opacity-[0.88]',
};

export default function GraderaLogo({
  size = 'md',
  tone = 'onLight',
  showWordmark = false,
  title = 'GRADERA',
  subtitle = 'Innovation Hub',
  className,
}) {
  return (
    <div className={cn('flex items-center gap-3 min-w-0', className)}>
      <img
        src={GRADERA_LOGO_SRC}
        alt="Gradera"
        width={128}
        height={128}
        decoding="async"
        className={cn(
          sizeMap[size],
          toneMap[tone],
          'flex-shrink-0 object-contain',
        )}
      />
      {showWordmark && (
        <div className="min-w-0 leading-tight">
          <div className="font-heading font-bold text-sm tracking-tight truncate">{title}</div>
          <div className="text-xs opacity-80 truncate">{subtitle}</div>
        </div>
      )}
    </div>
  );
}
