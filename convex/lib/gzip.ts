/**
 * Minimal gzip/DEFLATE decoder for the default Convex runtime.
 *
 * Queries run in Convex's V8 isolate, where Node's `zlib` is unavailable.
 * `cells.seriesGz` is base64(gzip(JSON)), so `trends.series` needs a decoder
 * that works without Node built-ins. The implementation follows RFC 1951
 * (DEFLATE) and RFC 1952 (gzip).
 */

const LENGTH_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59,
  67, 83, 99, 115, 131, 163, 195, 227, 258,
];
const LENGTH_EXTRA = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3,
  4, 4, 4, 4, 5, 5, 5, 5, 0,
];
const DIST_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513,
  769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577,
];
const DIST_EXTRA = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8,
  9, 9, 10, 10, 11, 11, 12, 12, 13, 13,
];
const CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

class BitReader {
  private readonly data: Uint8Array;
  private position = 0;
  private bitBuffer = 0;
  private bitCount = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  readBits(count: number): number {
    while (this.bitCount < count) {
      if (this.position >= this.data.length) {
        throw new Error("Unexpected end of DEFLATE stream");
      }
      this.bitBuffer |= this.data[this.position] << this.bitCount;
      this.position += 1;
      this.bitCount += 8;
    }
    const value = this.bitBuffer & ((1 << count) - 1);
    this.bitBuffer >>>= count;
    this.bitCount -= count;
    return value;
  }

  alignToByte(): void {
    this.bitBuffer = 0;
    this.bitCount = 0;
  }

  readBytes(length: number): Uint8Array {
    if (this.position + length > this.data.length) {
      throw new Error("Unexpected end of stored DEFLATE block");
    }
    const slice = this.data.subarray(this.position, this.position + length);
    this.position += length;
    return slice;
  }
}

class Huffman {
  private readonly counts: number[];
  private readonly symbols: number[];

  constructor(lengths: number[]) {
    const counts = new Array<number>(16).fill(0);
    for (const length of lengths) counts[length] += 1;
    counts[0] = 0;

    const offsets = new Array<number>(16).fill(0);
    for (let length = 1; length < 16; length += 1) {
      offsets[length] = offsets[length - 1] + counts[length - 1];
    }

    const symbols = new Array<number>(lengths.length).fill(0);
    for (let symbol = 0; symbol < lengths.length; symbol += 1) {
      const length = lengths[symbol];
      if (length > 0) {
        symbols[offsets[length]] = symbol;
        offsets[length] += 1;
      }
    }

    this.counts = counts;
    this.symbols = symbols;
  }

  decode(reader: BitReader): number {
    let code = 0;
    let first = 0;
    let index = 0;
    for (let length = 1; length <= 15; length += 1) {
      code |= reader.readBits(1);
      const count = this.counts[length];
      if (code - first < count) {
        return this.symbols[index + (code - first)];
      }
      index += count;
      first = (first + count) << 1;
      code <<= 1;
    }
    throw new Error("Invalid Huffman code");
  }
}

class ByteSink {
  private buffer = new Uint8Array(1 << 16);
  private length = 0;

  push(byte: number): void {
    if (this.length === this.buffer.length) this.grow();
    this.buffer[this.length] = byte;
    this.length += 1;
  }

  copy(distance: number, count: number): void {
    if (distance <= 0 || distance > this.length) {
      throw new Error("Invalid DEFLATE back-reference");
    }
    for (let index = 0; index < count; index += 1) {
      this.push(this.buffer[this.length - distance]);
    }
  }

  append(bytes: Uint8Array): void {
    for (let index = 0; index < bytes.length; index += 1) this.push(bytes[index]);
  }

  toBytes(): Uint8Array {
    return this.buffer.subarray(0, this.length);
  }

  private grow(): void {
    const next = new Uint8Array(this.buffer.length * 2);
    next.set(this.buffer);
    this.buffer = next;
  }
}

let fixedLiteral: Huffman | null = null;
let fixedDistance: Huffman | null = null;

function fixedTables(): { literal: Huffman; distance: Huffman } {
  if (!fixedLiteral || !fixedDistance) {
    const literalLengths = new Array<number>(288).fill(0);
    for (let symbol = 0; symbol <= 143; symbol += 1) literalLengths[symbol] = 8;
    for (let symbol = 144; symbol <= 255; symbol += 1) literalLengths[symbol] = 9;
    for (let symbol = 256; symbol <= 279; symbol += 1) literalLengths[symbol] = 7;
    for (let symbol = 280; symbol <= 287; symbol += 1) literalLengths[symbol] = 8;
    fixedLiteral = new Huffman(literalLengths);
    fixedDistance = new Huffman(new Array<number>(30).fill(5));
  }
  return { literal: fixedLiteral, distance: fixedDistance };
}

function dynamicTables(reader: BitReader): { literal: Huffman; distance: Huffman } {
  const literalCount = reader.readBits(5) + 257;
  const distanceCount = reader.readBits(5) + 1;
  const codeLengthCount = reader.readBits(4) + 4;

  const codeLengths = new Array<number>(19).fill(0);
  for (let index = 0; index < codeLengthCount; index += 1) {
    codeLengths[CODE_LENGTH_ORDER[index]] = reader.readBits(3);
  }
  const codeLengthTable = new Huffman(codeLengths);

  const total = literalCount + distanceCount;
  const lengths: number[] = [];
  while (lengths.length < total) {
    const symbol = codeLengthTable.decode(reader);
    if (symbol < 16) {
      lengths.push(symbol);
    } else if (symbol === 16) {
      if (lengths.length === 0) throw new Error("Invalid repeat code");
      const previous = lengths[lengths.length - 1];
      const repeat = reader.readBits(2) + 3;
      for (let index = 0; index < repeat; index += 1) lengths.push(previous);
    } else if (symbol === 17) {
      const repeat = reader.readBits(3) + 3;
      for (let index = 0; index < repeat; index += 1) lengths.push(0);
    } else {
      const repeat = reader.readBits(7) + 11;
      for (let index = 0; index < repeat; index += 1) lengths.push(0);
    }
  }

  return {
    literal: new Huffman(lengths.slice(0, literalCount)),
    distance: new Huffman(lengths.slice(literalCount, total)),
  };
}

function inflateBlock(
  reader: BitReader,
  sink: ByteSink,
  literal: Huffman,
  distance: Huffman,
): void {
  for (;;) {
    const symbol = literal.decode(reader);
    if (symbol < 256) {
      sink.push(symbol);
      continue;
    }
    if (symbol === 256) return;

    const lengthIndex = symbol - 257;
    if (lengthIndex < 0 || lengthIndex >= LENGTH_BASE.length) {
      throw new Error("Invalid length code");
    }
    const length = LENGTH_BASE[lengthIndex] + reader.readBits(LENGTH_EXTRA[lengthIndex]);

    const distanceSymbol = distance.decode(reader);
    if (distanceSymbol >= DIST_BASE.length) {
      throw new Error("Invalid distance code");
    }
    const copyDistance = DIST_BASE[distanceSymbol] + reader.readBits(DIST_EXTRA[distanceSymbol]);
    sink.copy(copyDistance, length);
  }
}

function inflateRaw(data: Uint8Array): Uint8Array {
  const reader = new BitReader(data);
  const sink = new ByteSink();

  for (;;) {
    const finalBlock = reader.readBits(1);
    const blockType = reader.readBits(2);

    if (blockType === 0) {
      reader.alignToByte();
      const length = reader.readBits(16);
      const inverse = reader.readBits(16);
      if ((length ^ 0xffff) !== inverse) throw new Error("Corrupt stored block");
      sink.append(reader.readBytes(length));
    } else if (blockType === 1) {
      const tables = fixedTables();
      inflateBlock(reader, sink, tables.literal, tables.distance);
    } else if (blockType === 2) {
      const tables = dynamicTables(reader);
      inflateBlock(reader, sink, tables.literal, tables.distance);
    } else {
      throw new Error("Invalid DEFLATE block type");
    }

    if (finalBlock) break;
  }

  return sink.toBytes();
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function gunzipBytes(data: Uint8Array): Uint8Array {
  if (data.length < 18 || data[0] !== 0x1f || data[1] !== 0x8b || data[2] !== 8) {
    throw new Error("Not a gzip stream");
  }
  const flags = data[3];
  let offset = 10;
  if (flags & 0x04) {
    const extraLength = data[offset] | (data[offset + 1] << 8);
    offset += 2 + extraLength;
  }
  if (flags & 0x08) {
    while (offset < data.length && data[offset] !== 0) offset += 1;
    offset += 1;
  }
  if (flags & 0x10) {
    while (offset < data.length && data[offset] !== 0) offset += 1;
    offset += 1;
  }
  if (flags & 0x02) offset += 2;
  if (offset >= data.length) throw new Error("Truncated gzip header");
  return inflateRaw(data.subarray(offset));
}

export function gunzipJson<T>(base64: string): T {
  const text = new TextDecoder().decode(gunzipBytes(base64ToBytes(base64)));
  return JSON.parse(text) as T;
}
