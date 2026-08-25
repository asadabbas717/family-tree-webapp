import { validateFamilyTree } from './validation';
import type { BackupEnvelope, FamilyTreeData } from '../types/family';

export const BACKUP_FORMAT = 'family-tree-webapp-backup' as const;
export const BACKUP_VERSION = 1 as const;

export function createBackupEnvelope(data: FamilyTreeData, timestamp = new Date()): BackupEnvelope {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: timestamp.toISOString(),
    data,
  };
}

export function exportTree(data: FamilyTreeData, timestamp = new Date()): string {
  return JSON.stringify(createBackupEnvelope(data, timestamp), null, 2);
}

export function backupFilename(timestamp = new Date()): string {
  return `family-tree-backup-${timestamp.toISOString().slice(0, 10)}.json`;
}

export type ImportResult =
  | { ok: true; data: FamilyTreeData }
  | { ok: false; error: string };

export function importTree(text: string): ImportResult {
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ok: false, error: 'The selected file is not a Family Tree backup.' };
    }
    const envelope = parsed as Partial<BackupEnvelope>;
    if (envelope.format !== BACKUP_FORMAT || envelope.version !== BACKUP_VERSION) {
      return { ok: false, error: 'This backup format or version is not supported.' };
    }
    const validation = validateFamilyTree(envelope.data);
    if (!validation.ok || !validation.data) {
      return { ok: false, error: validation.errors.slice(0, 5).join(' ') };
    }
    return { ok: true, data: validation.data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? `The file is not valid JSON: ${error.message}` : 'The file is not valid JSON.',
    };
  }
}

export function downloadTextFile(contents: string, filename: string, mime = 'application/json'): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
