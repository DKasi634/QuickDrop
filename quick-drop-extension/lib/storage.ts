import { browser } from 'wxt/browser';
import type { LocalDrop } from './types';

const STORAGE_KEY = 'quickdrop_history';
const MAX_HISTORY = 50;

export async function getDropHistory(): Promise<LocalDrop[]> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  const drops = (result[STORAGE_KEY] || []) as LocalDrop[];
  return drops.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function saveDrop(drop: LocalDrop): Promise<void> {
  const drops = await getDropHistory();
  drops.unshift(drop);
  if (drops.length > MAX_HISTORY) drops.length = MAX_HISTORY;
  await browser.storage.local.set({ [STORAGE_KEY]: drops });
}

export async function removeDrop(dropId: string): Promise<void> {
  const drops = await getDropHistory();
  const filtered = drops.filter((d) => d.id !== dropId);
  await browser.storage.local.set({ [STORAGE_KEY]: filtered });
}

export async function clearHistory(): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: [] });
}

export async function getActiveDropCount(): Promise<number> {
  const drops = await getDropHistory();
  const now = Date.now();
  return drops.filter((d) => new Date(d.expiresAt).getTime() > now).length;
}
