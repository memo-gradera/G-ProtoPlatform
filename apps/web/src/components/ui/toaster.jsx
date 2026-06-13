import { cn } from '@/lib/utils';
import { shouldDismissToastOnClick, useToast } from '@/components/ui/use-toast';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider>
      {toasts
        .filter((toastItem) => toastItem.open !== false)
        .map(function ({ id, title, description, action, className, ...props }) {
          return (
            <Toast
              key={id}
              {...props}
              className={cn('cursor-pointer hover:opacity-95', className)}
              onClick={(event) => {
                if (shouldDismissToastOnClick(event.target)) {
                  dismiss(id);
                }
              }}
            >
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              {action}
              <ToastClose
                onClick={(event) => {
                  event.stopPropagation();
                  dismiss(id);
                }}
              />
            </Toast>
          );
        })}
      <ToastViewport />
    </ToastProvider>
  );
}
