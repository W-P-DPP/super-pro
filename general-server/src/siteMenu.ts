import { readFile, rename, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';

export const siteMenuFilePath = fileURLToPath(new URL('../siteMenu.json', import.meta.url));

export async function loadSiteMenuSource(): Promise<unknown> {
  const raw = await readFile(siteMenuFilePath, 'utf8');
  return JSON.parse(raw) as unknown;
}

export async function saveSiteMenuSource(source: unknown): Promise<void> {
  const tempFilePath = `${siteMenuFilePath}.tmp`;
  await writeFile(
    tempFilePath,
    `${JSON.stringify(source, null, 2)}\n`,
    'utf8',
  );
  await rename(tempFilePath, siteMenuFilePath);
}
