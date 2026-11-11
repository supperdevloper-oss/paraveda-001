/** ZIP outputs entirely in-browser using fflate (MIT). */
import { zipSync, strToU8 } from 'fflate';
import { SITE } from '../site-config';
import { dedupeName, withExtension } from '../utils/format';

export interface ZipItem { name: string; blob: Blob; sourceName?: string }

/** Build a ZIP from completed outputs. Duplicate names are deterministically suffixed. */
export async function createZip(items: ZipItem[]): Promise<Blob> {
  if (!items.length) throw new Error('There are no completed files to put in a ZIP.');
  const entries: Record<string, Uint8Array> = {};
  const used = new Set<string>(['README.txt']);
  for (const item of items) {
    let name = sanitise(item.name || 'converted-file');
    name = dedupeName(name, used);
    used.add(name);
    entries[name] = new Uint8Array(await item.blob.arrayBuffer());
  }
  // A short manifest makes a bulk download easier to identify later.
  entries['README.txt'] = strToU8(`Converted with ${SITE.name}. Files were processed in your browser.\n`);
  const bytes = zipSync(entries, { level: 6 });
  return new Blob([Uint8Array.from(bytes).buffer], { type: 'application/zip' });
}

function sanitise(name: string): string {
  return name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/^\.+/, '').slice(0, 180) || 'converted-file';
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = sanitise(name);
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after the browser has started consuming the resource.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function zipNameForTool(toolName: string): string {
  const safe = toolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'files';
  return withExtension(`convertflow-${safe}`, 'zip');
}
