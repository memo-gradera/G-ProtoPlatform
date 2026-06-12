import React from 'react';
import { cn } from '@/lib/utils';

/** Bump when replacing public/gradera-logo.svg to bust browser cache. */
export const GRADERA_LOGO_SRC = '/gradera-logo.svg?v=2';

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-16 h-16',
};

export default function GraderaLogo({
  size = 'md',
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
        className={cn(sizeMap[size], 'flex-shrink-0 object-contain')}
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
