export function createId(prefix: string): string {
  const value = globalThis.crypto?.randomUUID?.() ?? fallbackUuid();
  return `${prefix}_${value}`;
}

function fallbackUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
