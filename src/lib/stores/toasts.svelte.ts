export interface Toast {
  id: number;
  message: string;
  action?: {
    label: string;
    callback: () => void;
  };
  duration: number;
  timeoutId?: ReturnType<typeof setTimeout>;
}

let nextId = 1;
let toasts = $state<Toast[]>([]);

export function getToasts(): Toast[] {
  return toasts;
}

export function addToast(
  message: string,
  options: {
    action?: { label: string; callback: () => void };
    duration?: number;
    onExpire?: () => void;
  } = {}
): number {
  const id = nextId++;
  const duration = options.duration ?? 5000;

  const toast: Toast = {
    id,
    message,
    action: options.action,
    duration,
  };

  toast.timeoutId = setTimeout(() => {
    removeToast(id);
    options.onExpire?.();
  }, duration);

  toasts = [...toasts, toast];
  return id;
}

export function removeToast(id: number): void {
  const toast = toasts.find((t) => t.id === id);
  if (toast?.timeoutId) {
    clearTimeout(toast.timeoutId);
  }
  toasts = toasts.filter((t) => t.id !== id);
}
