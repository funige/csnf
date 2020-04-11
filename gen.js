#!/usr/bin/env node
var program = require('commander')
var getPixels = require('get-pixels')
var fs = require('fs')
var CSNF = require('./csnf')
var CSNFBitmap = require('./bitmap')

var _action = async function () {
  var csnf = new CSNF({
    template: program.template,
    bindRight: !!program.bind.match(/right/i),
    startpageRight: !!program.startpage.match(/right/i)
  })

  var images = []
  var texts = []
  for (var file of program.args) {
    if (_isImage(file)) {
      images.push(await _getImage(file))
    } else {
      texts.push(..._getTexts(file))
    }
  }

  while (images.length > 0 || texts.length > 0) {
    var page = csnf.addPage()
    var rect = csnf.finishingRect()
    var x = rect.x + rect.width
    var y = rect.y
    var fontSize = parseInt(program.fontsize)

    var image = images.shift()
    if (image) {
      page.addDrawLayer(image)
    }

    var text = texts.shift()
    if (text) {
      var shapes = []
      for (var line of text) {
        if (line !== '') {
          var tmp = line.split('\n')
          var ymax = Math.max(...tmp.map((item) => item.length)) * fontSize
          var xmax = tmp.length * fontSize

          var pos = [x - (xmax / 2), y + (ymax / 2)]
          shapes.push(csnf.text(pos, fontSize, 0, 0, true, line))
          x -= (xmax + fontSize)
        }
      }
      if (shapes.length) {
        page.addTextLayer(shapes)
      }
    }
  }
  await csnf.writeFile(program.out)
}

var _getImage = async function (file) {
  return new Promise((resolve, reject) => {
    getPixels(file, (err, pixels) => {
      if (err) {
        console.log(`${file}: unknown format...`)
        reject(err)
      } else {
        console.log(file)
        resolve(CSNFBitmap.fromNdarray(pixels))
      }
    })
  })
}

// split text file
// 1 blank line to new baroon
// 2 blank lines to new page

var _getTexts = function (file) {
  var texts = fs.readFileSync(file).toString().replace(/\r?\n/g, '\n')
  console.log(file)

  if (program.comment) {
    var regexp = new RegExp('^' + program.comment)
    texts = texts.split('\n').filter(line => !line.match(regexp)).join('\n')
  }
  return texts
    .split(/\n\n\n/)
    .map((text) => text.split(/\n\n/))
}

var _isImage = function (filename) {
  return filename.match(/\.(jpg|png|gif)$/i)
}

// parse args

program
  .arguments('<file> [...]')
  .option('-o, --out <name>', 'output filename', 'output.csnf')
  .option('-t, --template <name>', 'template', 'B4')
  .option('    --bind <dir>', 'binding', 'right')
  .option('    --startpage <dir>', 'startpage', 'left')
  .option('    --fontsize <size>', 'font size', '12')
  .option('-c, --comment [str]', 'delimiter for line comments', '’')
  .action(_action)
  .parse(process.argv)
