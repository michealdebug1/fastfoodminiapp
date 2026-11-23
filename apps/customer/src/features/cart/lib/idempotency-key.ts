export interface CheckoutKeyStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function getIdempotencyKey(
  fingerprint: string,
  storage: CheckoutKeyStorage | null,
  fallback: Map<string, string>,
  createKey: () => string,
): { key: string; storageAvailable: boolean } {
  let storageAvailable = storage !== null;
  if (storage) {
    let stored: string | null = null;
    try {
      stored = storage.getItem("bunrun.checkout.v1");
    } catch {
      storageAvailable = false;
    }

    if (stored) {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(stored);
      } catch {
        try {
          storage.removeItem("bunrun.checkout.v1");
        } catch {
          storageAvailable = false;
        }
      }
      if (
        parsed &&
        typeof parsed === "object" &&
        "fingerprint" in parsed &&
        "key" in parsed &&
        parsed.fingerprint === fingerprint &&
        typeof parsed.key === "string"
      ) {
        fallback.set(fingerprint, parsed.key);
        return { key: parsed.key, storageAvailable };
      }
    }
  }

  const cachedKey = fallback.get(fingerprint);
  if (cachedKey) {
    return { key: cachedKey, storageAvailable };
  }

  const checkout = { fingerprint, key: createKey() };
  fallback.set(fingerprint, checkout.key);
  if (storage) {
    try {
      storage.setItem("bunrun.checkout.v1", JSON.stringify(checkout));
    } catch {
      storageAvailable = false;
    }
  }
  return { key: checkout.key, storageAvailable };
}

export function clearIdempotencyKey(
  fingerprint: string,
  storage: CheckoutKeyStorage | null,
  fallback: Map<string, string>,
): boolean {
  fallback.delete(fingerprint);
  if (!storage) return false;

  try {
    const stored = storage.getItem("bunrun.checkout.v1");
    if (!stored) return true;
    const parsed: unknown = JSON.parse(stored);
    if (
      parsed &&
      typeof parsed === "object" &&
      "fingerprint" in parsed &&
      parsed.fingerprint === fingerprint
    ) {
      storage.removeItem("bunrun.checkout.v1");
    }
    return true;
  } catch {
    return false;
  }
}
