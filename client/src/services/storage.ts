export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      console.warn('localStorage недоступен');
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // no-op
    }
  },

  getBool(key: string, fallback: boolean): boolean {
    const val = this.get(key);
    if (val === null) return fallback;
    return val === 'true';
  },

  getNumber(key: string, fallback: number): number {
    const val = this.get(key);
    if (val === null) return fallback;
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  },
};