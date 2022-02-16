#!/usr/bin/env node
const program = require('commander')
const CSNF = require('./csnf')

const _action = async function (file, filter) {
  if (program.info) {
    return _info(file)
  } else {
    return _dump(file, filter)
  }
}

const _dump = async function (file, filter) {
  const csnf = new CSNF()
  csnf.readFile(file).then(() => {
    for (let i = 0; i < csnf.story.page_count; i++) {
      const page = csnf.pages[i]
      const pid = page.pid

      if (pid <= 0) continue
      if (program.page && parseInt(program.page) !== (i - 1)) continue

      const layers = page.layers
      layers.forEach((layer) => {
        if (!filter || layer.header.name.match(filter)) {
          console.log(`/${csnf.story.story_id}/${pid}/${layer.header.name}`)

          if (program.long) {
            console.log('header=>', layer.header.rawHeader)
            let width, height

            switch (layer.header.type) {
              case 'bitmap':
                width = layer.data[0] + layer.data[1] * 0x100
                height = layer.data[2] + layer.data[3] * 0x100
                console.log(`data=> bitmap ${width}x${height}`)
                break

              case 'text':
              case 'shape':
                console.log('data=>', layer.data)
                break
            }
            console.log('\n')
          }
        }
      })
    }
  })
}

const _info = function (file) {
  const csnf = new CSNF()
  csnf.readFile(file).then(() => {
    const story = csnf.story

    console.log('title:', story.title)
    console.log('author:', story.author)
    console.log()
    console.log('baseframe_size:', story.baseframe_size)
    console.log('finishing_size:', story.finishing_size)
    console.log('sheet_size:', story.sheet_size)
    console.log()
    console.log('bind_right:', story.bind_right)
    console.log('startpage_right:', story.startpage_right)
    console.log('story_id:', story.story_id)
    console.log()
    console.log('page_count:', story.page_count)
    console.log('pageinfo:')
    console.log(story.pageinfo)
  })
}

program
  .arguments('<file> [filter]')
  .option('-i, --info', 'show story info')
  .option('-l, --long', 'list in long format')
  .option('-p, --page <page>', 'show specified page only')
  .action(_action)
  .parse(process.argv)
