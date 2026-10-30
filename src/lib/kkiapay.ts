export type KkiapayResponse = { transactionId?: string; transaction_id?: string; id?: string };
type KkiapayCallbacks = {
  onSuccess: (response: KkiapayResponse) => void | Promise<void>;
  onFailure: (error: unknown) => void;
};

declare global {
  interface Window {
    openKkiapayWidget?: (options: Record<string, unknown>) => void;
    addSuccessListener?: (callback: (response: KkiapayResponse) => void) => void;
    addFailedListener?: (callback: (error: unknown) => void) => void;
  }
}

let listenersRegistered = false;
let activeCallbacks: KkiapayCallbacks | null = null;

async function ensureKkiapaySdk(): Promise<void> {
  if (window.openKkiapayWidget && window.addSuccessListener && window.addFailedListener) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-kkiapay-sdk]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('SDK KKIAPAY indisponible.')), { once: true });
      if (window.openKkiapayWidget && window.addSuccessListener && window.addFailedListener) resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.kkiapay.me/k.js';
    script.async = true;
    script.dataset.kkiapaySdk = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Impossible de charger le SDK KKIAPAY.'));
    document.head.appendChild(script);
  });
  if (!window.openKkiapayWidget || !window.addSuccessListener || !window.addFailedListener) {
    throw new Error('Le SDK KKIAPAY ne fournit pas les fonctions de paiement et de confirmation.');
  }
}

export async function launchKkiapayWidget(options: Record<string, unknown>, callbacks: KkiapayCallbacks): Promise<void> {
  await ensureKkiapaySdk();
  if (!listenersRegistered) {
    window.addSuccessListener?.((response) => {
      const current = activeCallbacks;
      activeCallbacks = null;
      if (current) void current.onSuccess(response);
    });
    window.addFailedListener?.((error) => {
      const current = activeCallbacks;
      activeCallbacks = null;
      if (current) current.onFailure(error);
    });
    listenersRegistered = true;
  }
  activeCallbacks = callbacks;
  try {
    window.openKkiapayWidget?.(options);
  } catch (error) {
    activeCallbacks = null;
    throw error;
  }
}
