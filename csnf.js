var tar = require('./tar-stream')
var concat = require('concat-stream')
var util = require('util')
var events = require('events')
var color = require('color-parse')
var maxPID = 0

var CSNFHeader = require('./header')
var CSNFBitmap = require('./bitmap')
var CSNFPage = require('./page')

var CSNF = function (opts = {}) {
  this.pages = []
  this.initStory(opts)
}

util.inherits(CSNF, events.EventEmitter)

CSNF.prototype.addPage = function (pid) {
  var page = new CSNFPage(pid || this.generatePID())
  this.pages.push(page)

  this.updatePageinfo()
  return page
}

CSNF.prototype.generatePID = function () {
  this.pages.forEach(page => {
    if (maxPID < page.pid) {
      maxPID = page.pid
    }
  })
  return maxPID + 1
}

CSNF.prototype.read = function (data) {
  return new Promise(resolve => {
    var extract = tar.extract()
    var currentPage = null

    extract.on('entry', (rawHeader, stream, callback) => {
      var header = new CSNFHeader(rawHeader)
      var wait = false

      stream.pipe(concat((rawData) => {
        if (header.isLayer()) {
          if (!currentPage || currentPage.pid !== header.pid) {
            throw new Error('Invalid format')
          }
        }

        var layer
        switch (header.type) {
          case 'root':
            break

          case 'story':
            this.story = JSON.parse(rawData.toString()).body
            break

          case 'page':
            currentPage = this.addPage(header.pid)
            this.emit('page', currentPage)
            break

          case 'bitmap':
            CSNFBitmap.extract(rawData).then(bitmap => {
              layer = currentPage.addLayer(header, bitmap)
              this.emit('layer', layer)
              callback()
            })
            wait = true
            break

          case 'shape':
          case 'text':
            layer = currentPage.addLayer(header, JSON.parse(rawData).body.shape)
            this.emit('layer', layer)
            break

          case 'thumbnail':
          default:
            layer = currentPage.addLayer(header, rawData)
            this.emit('layer', layer)
            break
        }
        if (!wait) callback()
      }))
    })

    extract.on('finish', () => { resolve(this) })
    extract.end(data)
  })
}

CSNF.prototype.readFile = async function (path) {
  var fs = require('fs')
  await this.read(fs.readFileSync(path))
}

CSNF.prototype.write = async function (format) {
  if (this.pages.length === 0) {
    throw new Error('No page data')
  }

  var pack = tar.pack()
  pack.entry({
    name: `/${this.story.story_id}`,
    type: 'directory'
  })

  pack.entry({
    name: `/${this.story.story_id}/story.json`,
    type: 'file'
  }, JSON.stringify({ body: this.story }))

  for (var page of this.pages) {
    var pid = page.pid
    if (pid > 0) {
      pack.entry({
        name: `/${this.story.story_id}/${pid}`,
        type: 'directory'
      })
      this.emit('page', page)

      for (var layer of page.layers) {
        pack.entry({
          name: `/${this.story.story_id}/${pid}/${layer.header.name}`,
          type: 'file'
        }, await this.packData(layer))
        this.emit('layer', layer)
      }
    }
  }
  pack.finalize()
  var data = await new Promise((resolve, reject) => {
    pack.pipe(concat((data) => {
      resolve(data)
    }))
  })

  return data
}

CSNF.prototype.writeFile = async function (path) {
  var fs = require('fs')
  fs.writeFileSync(path, await this.write())
}

CSNF.prototype.packData = async function (layer) {
  var data
  switch (layer.header.type) {
    case 'shape':
    case 'text':
      data = JSON.stringify({
        body: {
          count: layer.data.length,
          shape: layer.data
        }
      })
      break

    case 'bitmap':
      data = await CSNFBitmap.pack(layer.data, layer.header.name)
      break

    default:
      data = layer.data
      break
  }
  return data
}

CSNF.prototype.updatePageinfo = function () {
  var tmp = []
  var info = []

  var startBlank = (this.story.startpage_right !== this.story.bind_right)
  if (startBlank) {
    tmp.push(null)
  }
  for (var page of this.pages) {
    tmp.push(page)
  }
  if (tmp.length % 2) {
    tmp.push(null)
  }

  var count = 1
  while (tmp.length > 0) {
    var page0 = tmp.shift()
    var page1 = tmp.shift()

    var p0 = page0 ? parseInt(page0.pid) : 0
    var p1 = page1 ? parseInt(page1.pid) : 0
    var i0 = page0 ? count++ : 0
    var i1 = page1 ? count++ : 0

    if (this.story.bind_right) {
      info.push([0, i1, p1, i0, p0])
    } else {
      info.push([0, i0, p0, i1, p1])
    }
  }

  this.story.pageinfo = info
  this.story.pageinfo_count = info.length
  this.story.page_count = this.pages.length
}

CSNF.prototype.initStory = function (opts) {
  this.story = {
    dpi: 72,
    bind_right: true,
    startpage_right: false,

    story_id: 1,
    version: 1,
    layer_color: [
      // #86ae00, #00a000, #000000 (Frame)
      // #0097d4, #0000a0, #000000 (Draw)
      // #bf0058, #a00000, #000000 (Text)
      // #e2b800, #a0a000, #000000 (Note)
      [-7950848, -16736256, -16777216],
      [-16738348, -16777056, -16777216],
      [-4259752, -6291456, -16777216],
      [-1918976, -6250496, -16777216]
    ]
  }

  this.setTemplate(opts.template || 'B4')

  for (var key in opts) {
    switch (key) {
      case 'template':
      case 'bindRight':
      case 'startpageRight':
      case 'author':
      case 'title':
      case 'sheetSize':
      case 'finishingSize':
      case 'baseframeSize':
      case 'frameColor':
      case 'drawColor':
      case 'textColor':
      case 'noteColor':
        var handler = 'set' + key.charAt(0).toUpperCase() + key.slice(1)
        this[handler](opts[key])
        break

      case 'dpi':
        this.setDPI(opts.dpi)
        break

      default:
        throw new Error('Unknown opts')
    }
  }
}

CSNF.prototype.setFrameColor = function (value) {
  return this.setColor(value, this.FRAME)
}

CSNF.prototype.setDrawColor = function (value) {
  return this.setColor(value, this.DRAW)
}

CSNF.prototype.setTextColor = function (value) {
  return this.setColor(value, this.TEXT)
}

CSNF.prototype.setNoteColor = function (value) {
  return this.setColor(value, this.NOTE)
}

CSNF.prototype.setColor = function (value, index) {
  if (typeof value === 'string') {
    value = [value]
  }
  this.story.layer_color[index] = value.map(item => {
    var rgb = color(item)
    if (rgb.values) {
      var r = ('0' + rgb.values[0].toString(16)).slice(-2)
      var g = ('0' + rgb.values[1].toString(16)).slice(-2)
      var b = ('0' + rgb.values[2].toString(16)).slice(-2)
      return parseInt('0x' + r + g + b) - 0x1000000
    } else throw new Error('Unknown color format')
  })
  return this
}

CSNF.prototype.setTemplate = function (value) {
  switch (value.toUpperCase()) {
    case 'A4':
      this.setSheetSize([210, 297])
      this.setFinishingSize([182, 257])
      this.setBaseframeSize([150, 220])
      break

    case 'B4':
    default:
      this.setSheetSize([257, 364])
      this.setFinishingSize([220, 310])
      this.setBaseframeSize([180, 270])
      break
  }
  return this
}

CSNF.prototype.setDPI = function (value) {
  this.story.dpi = value
  return this
}

CSNF.prototype.setSheetSize = function (size) {
  this.story.sheet_size = size
  return this
}

CSNF.prototype.setFinishingSize = function (size) {
  this.story.finishing_size = size
  return this
}

CSNF.prototype.setBaseframeSize = function (size) {
  this.story.baseframe_size = size
  return this
}

CSNF.prototype.setAuthor = function (value) {
  this.story.author = value
  return this
}

CSNF.prototype.setTitle = function (value) {
  this.story.title = value
  return this
}

CSNF.prototype.setBindRight = function (value) {
  this.story.bind_right = value
  this.updatePageinfo()
  return this
}
CSNF.prototype.setStartpageRight = function (value) {
  this.story.startpage_right = value
  this.updatePageinfo()
  return this
}

// convenient methods

CSNF.prototype.sheetRect = function () {
  var sheet = this.mm2px(this.story.sheet_size)
  return { x: 0, y: 0, width: sheet[0], height: sheet[1] }
}

CSNF.prototype.finishingRect = function () {
  var sheet = this.mm2px(this.story.sheet_size)
  var finishing = this.mm2px(this.story.finishing_size)
  var left = (sheet[0] - finishing[0]) / 2
  var top = (sheet[1] - finishing[1]) / 2
  return { x: left, y: top, width: finishing[0], height: finishing[1] }
}

CSNF.prototype.baseframeRect = function () {
  var sheet = this.mm2px(this.story.sheet_size)
  var baseframe = this.mm2px(this.story.baseframe_size)
  var left = (sheet[0] - baseframe[0]) / 2
  var top = (sheet[1] - baseframe[1]) / 2
  return { x: left, y: top, width: baseframe[0], height: baseframe[1] }
}

CSNF.prototype.removeRawHeader = function () {
  for (var page of this.pages) {
    for (var layer of page.layers) {
      if (layer.header.rawHeader) {
        delete layer.header.rawHeader
        delete layer.header.pid
      }
    }
  }
  return this
}

CSNF.prototype.mm2px = function (mm) {
  if (typeof mm === 'number') {
    return Math.floor(mm * (this.dpi / 25.4))
  }
  return mm.map((x) => Math.floor(x * (this.story.dpi / 25.4)))
}

CSNF.prototype.px2mm = function (px) {
  if (typeof px === 'number') {
    return px * (25.4 / this.story.dpi)
  }
  return px.map((x) => Math.round(x * (25.4 / this.story.dpi)))
}

CSNF.prototype.text = function (p, fontSize, vertical, str, flag = 0) {
  var f1 = 0
  var f2 = flag & (this.BOLD | this.ITALIC)
  return [5, p[0], p[1], fontSize, f1, f2, vertical, str]
}

CSNF.prototype.line = function (lineWidth, p, q) {
  return [1, lineWidth, p[0], p[1], q[0], q[1]]
}

CSNF.prototype.polygon = function (lineWidth, ...args) {
  var length = args.length
  var result = (length === 4) ? [2, lineWidth] : [4, lineWidth, length]

  args.forEach(arg => {
    result.push(arg[0], arg[1])
  })
  return result
}

CSNF.prototype.bitmap = function (width, height, data) {
  var result = new Uint8Array(data.length + 4)
  result[0] = width % 0x100
  result[1] = width / 0x100
  result[2] = height % 0x100
  result[3] = height / 0x100
  result.set(data, 4)
  return result
}

CSNF.prototype.rectangle = function (lineWidth, p, q, r, s) {
  console.log('obsoleted - use polygon() instead of rectangle()')
  return [2, lineWidth, p[0], p[1], q[0], q[1], r[0], r[1], s[0], s[1]]
}

CSNF.Bitmap = CSNFBitmap

// layer type
CSNF.prototype.FRAME = 0
CSNF.prototype.DRAW = 1
CSNF.prototype.TEXT = 2
CSNF.prototype.NOTE = 3

// text type
CSNF.prototype.BOLD = 1
CSNF.prototype.ITALIC = 2

module.exports = CSNF
