import { describe, expect, it } from "vitest";
import { decodeUpload } from "../files";

/**
 * Upload decode labels (spec B7 — issue #106). The utf-8 default must stay
 * byte-identical to the FileReader.readAsText behavior it replaced; the
 * windows-1252 label must map the legacy Excel single-byte accents.
 */

// "Jürgen" — ü is the single byte 0xFC in windows-1252.
const JURGEN_BYTES = [0x4a, 0xfc, 0x72, 0x67, 0x65, 0x6e];

function byteFile(bytes: number[]): File {
  return new File([new Uint8Array(bytes)], "data.csv", { type: "text/csv" });
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
});
