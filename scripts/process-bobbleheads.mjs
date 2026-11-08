// Trim transparent margins from the five Chief RAM Officer images and export optimized WebP.
//
// Usage:  npm run images -- <source-dir> [--height 560]
//
// <source-dir> must contain one image per mood, named after the mood:
//   calm.png  concerned.png  furious.png  sleep.png  nightmare.png
// (.png, .webp, .jpg and .jpeg are accepted; transparent PNG/WebP recommended.)
// Output goes to src/assets/bobblehead/<mood>.webp, overwriting the existing files.
// Pure Node + sharp, so it runs the same on Windows, macOS and Linux.
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const MOODS = ['calm', 'concerned', 'furious', 'sleep', 'nightmare'];
const EXTS = ['.png', '.webp', '.jpg', '.jpeg'];

const args = process.argv.slice(2);
const srcDir = args.find((a) => !a.startsWith('--'));
const hIdx = args.indexOf('--height');
const targetHeight = hIdx >= 0 ? Number(args[hIdx + 1]) : 560;

if (!srcDir || !Number.isFinite(targetHeight) || targetHeight <= 0) {
  console.error('Usage: npm run images -- <source-dir> [--height 560]');
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src', 'assets', 'bobblehead');
mkdirSync(outDir, { recursive: true });

let failed = false;
for (const mood of MOODS) {
  const input = EXTS.map((e) => path.join(srcDir, mood + e)).find((p) => existsSync(p));
  if (!input) {
    console.error(`missing: ${mood}.(png|webp|jpg) in ${srcDir}`);
    failed = true;
    continue;
  }
  const out = path.join(outDir, `${mood}.webp`);
  const info = await sharp(input)
    .ensureAlpha()
    // Trim fully transparent margins (trim compares against the top-left pixel, which is
    // transparent for these cut-outs; a small threshold eats anti-aliasing fringe noise).
    .trim({ threshold: 8 })
    // Never upscale: the supplied art is ~540 px tall; enlarging only adds blur and bytes.
    .resize({ height: targetHeight, withoutEnlargement: true })
    .webp({ quality: 82, alphaQuality: 90, effort: 6 })
    .toFile(out);
  console.log(
    `${mood.padEnd(10)} ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB  <- ${input}`,
  );
}
process.exit(failed ? 1 : 0);
