import { ZodType, zstd } from "./deps.ts";
import { hasCachedSymbol, symbolCache } from "./symbolCache.ts";

export abstract class Serializable {
  public abstract stream(streamer: Streamer): void;
}

export const serialize = (serializable: Serializable): Uint8Array => {
  const streamer = new WriteStreamer();
  serializable.stream(streamer);
  return streamer.getBuffer();
};

export const deserialize = <T extends Serializable>(
  serializable: T,
  buffer: Uint8Array,
): T => {
  const streamer = new ReadStreamer(buffer);
  serializable.stream(streamer);
  return serializable;
};

export abstract class Message<T> extends Serializable {
  public data!: T;
  constructor(init?: Partial<T> | undefined) {
    super();
    this.defaultInit();
    this.data = { ...this.data, ...init };
  }

  public abstract defaultInit(): void;
  getSymbol(): bigint {
    if (!hasCachedSymbol(this.constructor.name)) throw new Error("No symbol");
    return symbolCache[this.constructor.name];
  }
}

export enum StreamerMode {
  Read,
  Write,
}

export interface Streamer {
  getStreamMode(): StreamerMode;
  streamUint8(value: number): number;
  streamUint32(value: number): number;
  streamSint64(value: bigint): bigint;
  streamUint64(value: bigint): bigint;
  streamNullTerminatedString(value: string): string;
  streamNullTerminatedJson<T>(
    value: T,
    schema?: ZodType,
  ): T;
  streamZstdCompressedFrame(streamFrame: (streamer: Streamer) => void): void;
}

export class ReadStreamer implements Streamer {
  public buffer: Uint8Array;
  public offset: number;

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
    this.offset = 0;
  }

  public getStreamMode(): StreamerMode {
    return StreamerMode.Read;
  }

  public streamUint8(_value: number): number {
    const uint8Array = new Uint8Array(this.buffer.buffer, this.offset, 1);
    this.offset++;
    return uint8Array[0];
  }

  public streamUint32(_value: number): number {
    const uint32Array = new Uint32Array(this.buffer.buffer, this.offset, 1);
    this.offset += 4;
    return uint32Array[0];
  }

  public streamSint64(_value: bigint): bigint {
    const uint64Array = new BigInt64Array(this.buffer.buffer, this.offset, 1);
    this.offset += 8;
    return uint64Array[0];
  }

  public streamUint64(_value: bigint): bigint {
    const uint64Array = new BigUint64Array(this.buffer.buffer, this.offset, 1);
    this.offset += 8;
    return uint64Array[0];
  }

  public streamNullTerminatedString(_value: string): string {
    let stringBuffer = "";
    while (this.buffer[this.offset] !== 0) {
      stringBuffer += String.fromCharCode(this.buffer[this.offset]);
      this.offset++;
    }
    this.offset++;
    return stringBuffer;
  }

  public streamNullTerminatedJson<T>(
    _value: T,
    schema?: ZodType,
  ): T {
    const jsonString = this.streamNullTerminatedString("");
    const jsonObject = JSON.parse(jsonString);
    schema?.parse(jsonObject);
    return jsonObject;
  }

  public streamZstdCompressedFrame(
    streamFrame: (streamer: Streamer) => void,
  ): void {
    const decompressedSize = this.streamUint32(0);
    // Todo: Figure out how big the zstd frame is
    const remainingBuffer = this.buffer.slice(this.offset);
    const decompressedBuffer = zstd.decompress(remainingBuffer);
    const frameBuffer = decompressedBuffer.slice(0, decompressedSize);
    const frameStreamer = new ReadStreamer(new Uint8Array(frameBuffer));
    streamFrame(frameStreamer);
    this.offset += remainingBuffer.length;
  }
}

export class WriteStreamer implements Streamer {
  public buffers: Uint8Array[];

  constructor() {
    this.buffers = [];
  }

  public getBuffer(): Uint8Array {
    let offset = 0;
    for (const buffer of this.buffers) {
      offset += buffer.length;
    }
    const outputBuffer = new Uint8Array(offset);
    offset = 0;
    for (const buffer of this.buffers) {
      outputBuffer.set(buffer, offset);
      offset += buffer.length;
    }
    return outputBuffer;
  }

  public getStreamMode(): StreamerMode {
    return StreamerMode.Write;
  }

  public streamUint8(value: number): number {
    this.buffers.push(new Uint8Array([value]));
    return value;
  }

  public streamUint32(value: number): number {
    const uint32Array = new Uint32Array([value]);
    this.buffers.push(new Uint8Array(uint32Array.buffer));
    return value;
  }

  public streamSint64(value: bigint): bigint {
    const uint64Array = new BigInt64Array([value]);
    this.buffers.push(new Uint8Array(uint64Array.buffer));
    return value;
  }

  public streamUint64(value: bigint): bigint {
    const uint64Array = new BigUint64Array([value]);
    this.buffers.push(new Uint8Array(uint64Array.buffer));
    return value;
  }

  public streamNullTerminatedString(value: string): string {
    const stringBuffer = new TextEncoder().encode(value);
    this.buffers.push(stringBuffer);
    this.buffers.push(new Uint8Array([0]));
    return value;
  }

  public streamNullTerminatedJson<T>(
    value: T,
    schema?: ZodType,
  ): T {
    schema?.parse(value);
    const jsonString = JSON.stringify(value);
    this.streamNullTerminatedString(jsonString);
    return value;
  }

  public streamZstdCompressedFrame(
    streamFrame: (streamer: Streamer) => void,
  ): void {
    const frameStreamer = new WriteStreamer();
    streamFrame(frameStreamer);
    const frameBuffer = frameStreamer.getBuffer();
    const compressedBuffer = zstd.compress(frameBuffer);
    this.streamUint32(frameBuffer.length);
    this.buffers.push(compressedBuffer);
  }
}
