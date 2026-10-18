let table: Uint32Array | null = null

function tableOf(): Uint32Array {
  if (!table) {
    table = new Uint32Array(256)

    for (let n = 0; n < 256; n += 1) {
      let c = n

      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      }

      table[n] = c >>> 0
    }
  }

  return table
}

/** The CRC-32 a PNG chunk carries over its type and data. */
export function crc32(bytes: Uint8Array): number {
  const lookup = tableOf()
  let crc = 0xffffffff

  for (const byte of bytes) {
    crc = lookup[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}
