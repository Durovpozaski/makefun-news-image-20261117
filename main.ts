// main.ts — entry program for news-image-20261117.
// Copies the bundled front-page image to the output directory, then
// verifies the file that ACTUALLY landed on disk by reading it back:
// PNG signature, IHDR chunk header, IHDR dimensions, byte size, and a
// byte-for-byte match against the bundled source. The checks run on the
// written file, never on the in-memory source buffer alone, so a failed
// or truncated copy cannot slip through.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(HERE, "entry.png");
const OUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? join(HERE, "output"));
const TARGET = join(OUT_DIR, "entry.png");
const MAX_BYTES = 1024 * 1024;
const EXPECTED_WIDTH = 1024;
const EXPECTED_HEIGHT = 1024;

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function fail(message: string): never {
  throw new Error(`verification failed: ${message}`);
}

// Reads the file the program just wrote and proves it is the image we
// meant to ship: a real PNG, with a well-formed IHDR chunk, the right
// dimensions, within the size limit, and byte-identical to the source.
function verifyWrittenFile(writtenPath: string, source: Buffer): Buffer {
  if (!existsSync(writtenPath)) fail(`output file missing: ${writtenPath}`);
  const data = readFileSync(writtenPath);
  if (data.length > MAX_BYTES) {
    fail(`output is ${data.length} bytes, over the 1 MiB limit`);
  }
  if (data.length < 33 || !data.subarray(0, 8).equals(PNG_SIGNATURE)) {
    fail("output does not start with the PNG signature");
  }
  const ihdrLength = data.readUInt32BE(8);
  const ihdrType = data.subarray(12, 16).toString("latin1");
  if (ihdrLength !== 13 || ihdrType !== "IHDR") {
    fail(`first chunk is not IHDR (length ${ihdrLength}, type ${ihdrType})`);
  }
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  if (width !== EXPECTED_WIDTH || height !== EXPECTED_HEIGHT) {
    fail(`output is ${width}x${height}, expected ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}`);
  }
  if (!data.equals(source)) {
    fail("output bytes differ from the bundled entry.png");
  }
  return data;
}

function main(): void {
  if (!existsSync(SOURCE)) throw new Error(`missing ${SOURCE}`);
  const source = readFileSync(SOURCE);
  mkdirSync(OUT_DIR, { recursive: true });
  copyFileSync(SOURCE, TARGET);
  const data = verifyWrittenFile(TARGET, source);
  console.log(`wrote ${TARGET} (${data.length} bytes, 1024x1024, verified)`);
}

main();
