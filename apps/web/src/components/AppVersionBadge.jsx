import { APP_VERSION } from '@/lib/appVersion';

export default function AppVersionBadge() {
  return (
    <div
      className="fixed bottom-3 right-3 z-50 pointer-events-none select-none text-[10px] leading-none text-muted-foreground/60 font-mono"
      aria-label={`Application version ${APP_VERSION}`}
    >
      Version {APP_VERSION}
    </div>
  );
}
