/**
 * Generates the site's logo and icon assets from the two source artworks.
 *
 * The originals are far larger than anything the site renders (the wordmark is
 * 2172px wide and 863KB), so shipping them as-is would put a needless payload
 * in the header of every page. This trims the transparent margin, resizes to
 * the sizes actually used, and writes both webp and png.
 *
 *   npm run brand
 */
import { mkdirSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import sharp from 'sharp';

const SRC_WORDMARK = process.env.OB_WORDMARK ?? 'data/brand/wordmark-source.png';
const SRC_MARK = process.env.OB_MARK ?? 'data/brand/mark-source.webp';

const PUBLIC_BRAND = 'public/brand';
const APP_DIR = 'src/app';

async function describe(label, file) {
  const m = await sharp(file).metadata();
  console.log(`  ${label.padEnd(10)} ${basename(file).padEnd(28)} ${m.width}x${m.height}  ${m.format}  alpha=${m.hasAlpha}`);
  return m;
}

async function main() {
  for (const f of [SRC_WORDMARK, SRC_MARK]) {
    if (!existsSync(f)) {
      console.error(`missing source: ${f}`);
      process.exit(1);
    }
  }

  mkdirSync(PUBLIC_BRAND, { recursive: true });

  console.log('sources:');
  await describe('wordmark', SRC_WORDMARK);
  await describe('mark', SRC_MARK);

  /* -------------------------------------------------------- wordmark ----- */
  // Trim the transparent border so the logo can be positioned by its actual
  // ink, not by however much empty space the export left around it.
  const trimmed = await sharp(SRC_WORDMARK).trim().toBuffer();
  const tm = await sharp(trimmed).metadata();
  console.log(`\nwordmark trimmed to ${tm.width}x${tm.height}`);

  // The header renders it ~34px tall; 3x covers high-DPI screens.
  for (const h of [40, 80, 120]) {
    await sharp(trimmed)
      .resize({ height: h, withoutEnlargement: true })
      .webp({ quality: 92 })
      .toFile(`${PUBLIC_BRAND}/wordmark-${h}.webp`);
  }
  await sharp(trimmed).resize({ height: 120, withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(`${PUBLIC_BRAND}/wordmark.png`);

  /* ------------------------------------------------------------ mark ----- */
  const mark = await sharp(SRC_MARK).trim().toBuffer();

  // App Router picks these up by filename and emits the <link> tags itself.
  await sharp(mark).resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(`${APP_DIR}/icon.png`);
  await sharp(mark)
    .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    // Apple ignores transparency and composites on black, so give it a ground.
    .flatten({ background: '#ffffff' })
    .png()
    .toFile(`${APP_DIR}/apple-icon.png`);

  for (const s of [64, 192, 512]) {
    await sharp(mark)
      .resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(`${PUBLIC_BRAND}/mark-${s}.png`);
  }

  console.log('\nwrote:');
  for (const f of [
    `${PUBLIC_BRAND}/wordmark-40.webp`,
    `${PUBLIC_BRAND}/wordmark-80.webp`,
    `${PUBLIC_BRAND}/wordmark-120.webp`,
    `${PUBLIC_BRAND}/wordmark.png`,
    `${APP_DIR}/icon.png`,
    `${APP_DIR}/apple-icon.png`,
    `${PUBLIC_BRAND}/mark-64.png`,
    `${PUBLIC_BRAND}/mark-192.png`,
    `${PUBLIC_BRAND}/mark-512.png`,
  ]) {
    const { size } = await sharp(f).metadata();
    console.log(`  ${f.padEnd(34)} ${(size / 1024).toFixed(1)} KB`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
