#!/usr/bin/env node
const program = require('commander')
const CSNF = require('./csnf')
const fs = require('fs')

const _action = async function (file) {
  const csnf = new CSNF({
    template: program.template,
    bindRight: !!program.bind.match(/right/i),
    startpageRight: !!program.startpage.match(/right/i)
  })

  _getTexts(file).forEach((text) => {
    const page = csnf.addPage()
    const rect = csnf.finishingRect()
    let x = rect.x + rect.width
    const y = rect.y
    const fontSize = parseInt(program.fontsize)

    const shapes = []
    for (const item of text) {
      if (item !== '') {
        const tmp = item.split('\n')
        const ymax = Math.max(...tmp.map((item) => item.length)) * fontSize
        const xmax = tmp.length * fontSize

        const pos = [x - (xmax / 2), y + (ymax / 2)]
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

const _getTexts = function (file) {
  let texts = fs.readFileSync(file).toString().replace(/\r?\n/g, '\n')
  console.log(file)

  if (program.comment) {
    const regexp = new RegExp('^' + program.comment)
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
