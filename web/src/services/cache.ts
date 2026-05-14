export class Cache<K, V> {
  private readonly map = new Map<K, V>();

  get(key: K): V | undefined {
    return this.map.get(key);
  }

  set(key: K, value: V): void {
    this.map.set(key, value);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  invalidate(keys?: K[]): void {
    if (!keys) {
      this.map.clear();
      return;
    }
    for (const k of keys) this.map.delete(k);
  }

  get size(): number {
    return this.map.size;
  }
}
