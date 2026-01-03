import AdmZip from 'adm-zip';
import { readFileSync } from 'fs';
import { join } from 'path';

interface IconCache {
  [key: string]: Buffer;
}

let iconCache: IconCache = {};
let loadPromise: Promise<void> | null = null;

async function loadIcons(): Promise<void> {
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const zipPath = join(process.cwd(), 'icons.zip');
      const zipBuffer = readFileSync(zipPath);
      const zip = new AdmZip(zipBuffer);
      const entries = zip.getEntries();

      const cache: IconCache = {};
      for (const entry of entries) {
        if (!entry.isDirectory && entry.entryName) {
          const fileName = entry.entryName.split('/').pop() || entry.entryName;
          const id = fileName.replace(/\.[^/.]+$/, '');
          cache[id] = entry.getData();
        }
      }

      iconCache = cache;
    } catch (error) {
      console.error('Failed to load icons:', error);
      iconCache = {};
    }
  })();

  return loadPromise;
}

export async function getIcon(id: string): Promise<Buffer | null> {
  await loadIcons();
  return iconCache[id] || null;
}

export async function hasIcon(id: string): Promise<boolean> {
  await loadIcons();
  return id in iconCache;
}

