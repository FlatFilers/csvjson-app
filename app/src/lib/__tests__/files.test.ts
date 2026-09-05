import { describe, expect, it } from "vitest";
import { decodeUpload } from "../files";

/**
 * Upload decode labels (spec B7 — issue #106). The utf-8 default must stay
 * byte-identical to the FileReader.readAsText behavior it replaced; the
 * windows-1252 label must map the legacy Excel single-byte accents.
 */

// "Jürgen" — ü is the single byte 0xFC in windows-1252.
const JURGEN_BYTES = [0x4a, 0xfc, 0x72, 0x67, 0x65, 0x6e];

function chunkStream(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

/**
 * jsdom's File lacks Blob.stream(); attach a real web ReadableStream over
 * the file's bytes so the production streaming path runs under test.
 */
function byteFile(bytes: number[]): File {
  const file = new File([new Uint8Array(bytes)], "data.csv", {
    type: "text/csv",
  });
  return Object.assign(file, {
    stream: () => chunkStream([new Uint8Array(bytes)]),
  }) as unknown as File;
}

/** A File-like delivering the given chunks (jsdom-compatible). */
function chunkFile(chunks: number[][]): File {
  const bytes = chunks.flat();
  const file = new File([new Uint8Array(bytes)], "data.csv", {
    type: "text/csv",
  });
  return Object.assign(file, {
    stream: () => chunkStream(chunks.map((c) => new Uint8Array(c))),
  }) as unknown as File;
}

describe("decodeUpload (spec B7 — issue #106)", () => {
  it("decodes windows-1252 accented bytes under the windows-1252 label", async () => {
    await expect(
      decodeUpload(byteFile(JURGEN_BYTES), "windows-1252")
    ).resolves.toBe("Jürgen");
  });

  it("decodes ö (0xF6) under the windows-1252 label", async () => {
    // "Köln"
    await expect(
      decodeUpload(byteFile([0x4b, 0xf6, 0x6c, 0x6e]), "windows-1252")
    ).resolves.toBe("Köln");
  });

  it("keeps the utf-8 default byte-identical to readAsText: unmappable bytes become U+FFFD, never a throw", async () => {
    await expect(
      decodeUpload(byteFile(JURGEN_BYTES), "utf-8")
    ).resolves.toBe("J\uFFFDrgen");
  });

  it("strips a leading UTF-8 BOM under the default label (readAsText parity)", async () => {
    // BOM + "a,b"
    await expect(
      decodeUpload(byteFile([0xef, 0xbb, 0xbf, 0x61, 0x2c, 0x62]), "utf-8")
    ).resolves.toBe("a,b");
  });

  it("reconstructs a multi-byte UTF-8 sequence split across stream chunks", async () => {
    // "Jürgen" in UTF-8 — ü (0xC3 0xBC) straddles the chunk boundary.
    await expect(
      decodeUpload(
        chunkFile([[0x4a, 0xc3], [0xbc, 0x72, 0x67, 0x65, 0x6e]]),
        "utf-8"
      )
    ).resolves.toBe("Jürgen");
  });

  it("strips the BOM from the first chunk when more chunks follow", async () => {
    await expect(
      decodeUpload(chunkFile([[0xef, 0xbb, 0xbf, 0x61], [0x2c, 0x62]]), "utf-8")
    ).resolves.toBe("a,b");
  });
});
