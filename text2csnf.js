#!/usr/bin/env node
var program = require('commander')
var CSNF = require('./csnf')
var fs = require('fs')

var _action = async function (file) {
  var csnf = new CSNF({
    template: program.template,
    bindRight: !!program.bind.match(/right/i),
    startpageRight: !!program.startpage.match(/right/i)
  })

  _getTexts(file).forEach((text) => {
    var page = csnf.addPage()
    var rect = csnf.finishingRect()
    var x = rect.x + rect.width
    var y = rect.y
    var fontSize = parseInt(program.fontsize)

    var shapes = []
    for (var item of text) {
      if (item !== '') {
        var tmp = item.split('\n')
        var ymax = Math.max(...tmp.map((item) => item.length)) * fontSize
        var xmax = tmp.length * fontSize

        var pos = [x - (xmax / 2), y + (ymax / 2)]
        shapes.push(csnf.text(pos, fontSize, 0, 0, true, item))
        x -= (xmax + fontSize)
      }
    }
    if (shapes.length) {
      page.addTextLayer(shapes)
    }
  })

  await csnf.writeFile(program.out)
}

// split texts
// 1 blank line to new item
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

// parse args

program
  .arguments('<file>')
  .option('-o, --out <name>', 'output filename', 'output.csnf')
  .option('-t, --template <name>', 'template', 'B4')
  .option('    --bind <dir>', 'binding', 'right')
  .option('    --startpage <dir>', 'startpage', 'left')
  .option('    --fontsize <size>', 'font size', '12')
  .option('-c, --comment [str]', 'delimiter for line comments', '’')
  .action(_action)
  .parse(process.argv)
