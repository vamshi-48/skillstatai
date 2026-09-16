import fs from 'node:fs'
import zlib from 'node:zlib'

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
  crcTable[n] = c
}

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function makeChunk(type, data) {
  const len = data.length
  const chunk = Buffer.alloc(12 + len)
  chunk.writeUInt32BE(len, 0)
  chunk.write(type, 4, 4, 'ascii')
  data.copy(chunk, 8)
  chunk.writeUInt32BE(crc32(chunk.slice(4, 8 + len)), 8 + len)
  return chunk
}

function makePng(width, height, rgbaBuffer) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const ihdrChunk = makeChunk('IHDR', ihdr)
  const rawData = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    const rawOffset = y * (1 + width * 4)
    rawData[rawOffset] = 0
    rgbaBuffer.copy(rawData, rawOffset + 1, y * width * 4, (y + 1) * width * 4)
  }
  const idatChunk = makeChunk('IDAT', zlib.deflateSync(rawData, { level: 9 }))
  const iendChunk = makeChunk('IEND', Buffer.alloc(0))
  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk])
}

// Read public/logo.png
const origBuf = fs.readFileSync('public/logo.png')
let pos = 8
const idatChunks = []
while (pos < origBuf.length) {
  const len = origBuf.readUInt32BE(pos)
  const type = origBuf.slice(pos + 4, pos + 8).toString('ascii')
  if (type === 'IDAT') idatChunks.push(origBuf.slice(pos + 8, pos + 8 + len))
  pos += 12 + len
}
const raw = zlib.inflateSync(Buffer.concat(idatChunks))
const srcW = 1024
const srcH = 1024
const srcPixels = Buffer.alloc(srcW * srcH * 4)

for (let y = 0; y < srcH; y++) {
  const rowStart = y * (1 + srcW * 4)
  for (let x = 0; x < srcW * 4; x++) {
    const rawVal = raw[rowStart + 1 + x]
    const upVal = y > 0 ? srcPixels[(y - 1) * srcW * 4 + x] : 0
    srcPixels[y * srcW * 4 + x] = (rawVal + upVal) & 0xff
  }
}

// Downscale to 128x128 with high-quality box filter
const dstW = 128
const dstH = 128
const dstPixels = Buffer.alloc(dstW * dstH * 4)
const scale = srcW / dstW
const cx = dstW / 2
const cy = dstH / 2
const radius = dstW * 0.47

for (let dy = 0; dy < dstH; dy++) {
  for (let dx = 0; dx < dstW; dx++) {
    const dist = Math.sqrt((dx - cx + 0.5) ** 2 + (dy - cy + 0.5) ** 2)

    let rSum = 0, gSum = 0, bSum = 0, aSum = 0
    let count = 0
    const startX = Math.floor(dx * scale)
    const endX = Math.min(srcW, Math.floor((dx + 1) * scale))
    const startY = Math.floor(dy * scale)
    const endY = Math.min(srcH, Math.floor((dy + 1) * scale))

    for (let sy = startY; sy < endY; sy++) {
      for (let sx = startX; sx < endX; sx++) {
        const sIdx = (sy * srcW + sx) * 4
        rSum += srcPixels[sIdx]
        gSum += srcPixels[sIdx + 1]
        bSum += srcPixels[sIdx + 2]
        aSum += srcPixels[sIdx + 3]
        count++
      }
    }

    const avgR = rSum / count
    const avgG = gSum / count
    const avgB = bSum / count
    const avgA = (aSum / count) / 255

    const dIdx = (dy * dstW + dx) * 4

    if (dist <= radius) {
      // White circular backing: blend emblem on top of white
      dstPixels[dIdx] = Math.round(avgR * avgA + 255 * (1 - avgA))
      dstPixels[dIdx + 1] = Math.round(avgG * avgA + 255 * (1 - avgA))
      dstPixels[dIdx + 2] = Math.round(avgB * avgA + 255 * (1 - avgA))

      if (dist > radius - 1.5) {
        const edge = Math.max(0, Math.min(1, radius - dist))
        dstPixels[dIdx + 3] = Math.round(edge * 255)
      } else {
        dstPixels[dIdx + 3] = 255
      }
    } else {
      dstPixels[dIdx] = 0
      dstPixels[dIdx + 1] = 0
      dstPixels[dIdx + 2] = 0
      dstPixels[dIdx + 3] = 0
    }
  }
}

const faviconPng = makePng(dstW, dstH, dstPixels)
fs.writeFileSync('public/favicon.png', faviconPng)
fs.writeFileSync('public/favicon.ico', faviconPng)
console.log('Generated crisp 128x128 favicon.png! Bytes:', faviconPng.length)

// Also write self-contained base64 SVG favicon
const b64 = faviconPng.toString('base64')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <image href="data:image/png;base64,${b64}" width="128" height="128" />
</svg>
`
fs.writeFileSync('public/favicon.svg', svg)
console.log('Saved self-contained base64 favicon.svg!')
