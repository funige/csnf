var JSZip = require('jszip')

var CSNFBitmap = function () {}

CSNFBitmap.pack = function (data, name = 'image') {
  return new Promise(resolve => {
    var jszip = new JSZip()

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
    var jszip = new JSZip()
    jszip.loadAsync(data).then(zip => {
      var filename = Object.keys(zip.files)[0]
      zip.file(filename).async('uint8Array').then(buffer => {
        resolve(buffer)
      })
    })
  })
}

CSNFBitmap.fromCanvas = function (canvas, scale = 1.0) {
  console.log('from canvas')

  var width = canvas.width
  var height = canvas.height
  var bitmapWidth = Math.round(width * scale)
  var bitmapHeight = Math.round(height * scale)

  var bitmap = new Uint8Array(bitmapWidth * bitmapHeight + 4)
  bitmap[0] = bitmapWidth % 0x100
  bitmap[1] = Math.floor(bitmapWidth / 0x100)
  bitmap[2] = bitmapHeight % 0x100
  bitmap[3] = Math.floor(bitmapHeight / 0x100)

  var ctx
  var imageData
  if (scale === 1) {
    ctx = canvas.getContext('2d')
    imageData = ctx.getImageData(0, 0, width, height)
  } else {
    var tmpCanvas = document.createElement('canvas')
    tmpCanvas.width = bitmapWidth
    tmpCanvas.height = bitmapHeight
    ctx = tmpCanvas.getContext('2d')
    ctx.drawImage(canvas, 0, 0, width, height, 0, 0, bitmapWidth, bitmapHeight)
    imageData = ctx.getImageData(0, 0, bitmapWidth, bitmapHeight)
  }

  var buf8 = new Uint8ClampedArray(imageData.data.buffer)
  var index = 0
  for (let y = 0; y < bitmapHeight; y++) {
    for (let x = 0; x < bitmapWidth; x++) {
      bitmap[index + 4] = buf8[index * 4 + 3]
      index += 1
    }
  }
  return bitmap
}

CSNFBitmap.toCanvas = function (bitmap) {
  var canvas = document.createElement('canvas')
  canvas.width = bitmap[0] + bitmap[1] * 0x100
  canvas.height = bitmap[2] + bitmap[3] * 0x100

  var ctx = canvas.getContext('2d')
  var imageData = ctx.createImageData(canvas.width, canvas.height)
  imageData.data.set(bitmap + 4)
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

module.exports = CSNFBitmap
