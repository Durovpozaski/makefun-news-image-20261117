// main.ts — entry program for news-image-20261117.
// Copies the bundled front-page image to the output directory and
// verifies it meets the competition limits (at most 1 MiB, 1024x1024).
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(HERE, "entry.png");
const OUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? join(HERE, "output"));
const TARGET = join(OUT_DIR, "entry.png");
const MAX_BYTES = 1024 * 1024;

function pngSize(buf: Buffer): { width: number; height: number } {
  const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIG)) {
    throw new Error("entry.png is not a PNG file");
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function main(): void {
  if (!existsSync(SOURCE)) throw new Error(`missing ${SOURCE}`);
  mkdirSync(OUT_DIR, { recursive: true });
  copyFileSync(SOURCE, TARGET);
  const data = readFileSync(TARGET);
  if (data.length > MAX_BYTES) {
    throw new Error(`entry.png is ${data.length} bytes, over the 1 MiB limit`);
  }
  const { width, height } = pngSize(data);
  if (width !== 1024 || height !== 1024) {
    throw new Error(`entry.png is ${width}x${height}, expected 1024x1024`);
  }
  console.log(`wrote ${TARGET} (${data.length} bytes, 1024x1024)`);
}

main();
