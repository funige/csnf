const JSZip = require('jszip')

const CSNFBitmap = function () {}

CSNFBitmap.pack = function (data, name = 'image') {
  return new Promise(resolve => {
    const jszip = new JSZip()

    jszip.file(name, data, { createFolders: false, binary: true })
    jszip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    }).then(buffer => {
      resolve(buffer)
    })
  })
}

CSNFBitmap.extract = function (data) {
  return new Promise(resolve => {
    const jszip = new JSZip()
    jszip.loadAsync(data).then(zip => {
      const filename = Object.keys(zip.files)[0]
      zip.file(filename).async('uint8Array').then(buffer => {
        resolve(buffer)
      })
    })
  })
}

CSNFBitmap.toCanvas = function (bitmap) {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap[0] + bitmap[1] * 0x100
  canvas.height = bitmap[2] + bitmap[3] * 0x100

  const ctx = canvas.getContext('2d')
  const imageData = ctx.createImageData(canvas.width, canvas.height)
  imageData.data.set(bitmap + 4)
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

CSNFBitmap.fromCanvas = function (canvas, scale = 1.0) {
  const width = canvas.width
  const height = canvas.height
  const bitmapWidth = Math.round(width * scale)
  const bitmapHeight = Math.round(height * scale)

  const bitmap = new Uint8Array(bitmapWidth * bitmapHeight + 4)
  bitmap[0] = bitmapWidth % 0x100
  bitmap[1] = Math.floor(bitmapWidth / 0x100)
  bitmap[2] = bitmapHeight % 0x100
  bitmap[3] = Math.floor(bitmapHeight / 0x100)

  let ctx
  let imageData
  if (scale === 1) {
    ctx = canvas.getContext('2d')
    imageData = ctx.getImageData(0, 0, width, height)
  } else {
    const tmpCanvas = document.createElement('canvas')
    tmpCanvas.width = bitmapWidth
    tmpCanvas.height = bitmapHeight
    ctx = tmpCanvas.getContext('2d')
    ctx.drawImage(canvas, 0, 0, width, height, 0, 0, bitmapWidth, bitmapHeight)
    imageData = ctx.getImageData(0, 0, bitmapWidth, bitmapHeight)
  }

  const buf8 = new Uint8ClampedArray(imageData.data.buffer)
  let index = 0
  for (let y = 0; y < bitmapHeight; y++) {
    for (let x = 0; x < bitmapWidth; x++) {
      bitmap[index + 4] = buf8[index * 4 + 3]
      index += 1
    }
  }
  return bitmap
}

CSNFBitmap.fromNdarray = function (pixels) {
  const bitmapWidth = pixels.shape[0]
  const bitmapHeight = pixels.shape[1]

  const bitmap = new Uint8Array(bitmapWidth * bitmapHeight + 4)
  bitmap[0] = bitmapWidth % 0x100
  bitmap[1] = Math.floor(bitmapWidth / 0x100)
  bitmap[2] = bitmapHeight % 0x100
  bitmap[3] = Math.floor(bitmapHeight / 0x100)

  let src = 0
  let dst = 4
  const m = pixels.data
  for (let y = 0; y < bitmapHeight; y++) {
    for (let x = 0; x < bitmapWidth; x++) {
      const r = m[src + 0]
      const g = m[src + 1]
      const b = m[src + 2]
      const a = m[src + 3]
      const i = ((0xff - r) + (0xff - g) + (0xff - b)) / 3.0
      bitmap[dst] = i * (a / 0xff)
      dst += 1
      src += 4
    }
  }
  return bitmap
}

module.exports = CSNFBitmap
