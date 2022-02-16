const test = require('tape')
const tar = require('../tar-stream')
const fixtures = require('./fixtures')
const concat = require('concat-stream')
const fs = require('fs')

test('pack', function (t) {
  t.plan(2)

  const pack = tar.pack()

  pack.entry({
    name: '/1',
    type: 'directory'
  })
  pack.entry({
    name: '/1/story.json',
    type: 'file'
  }, '{"body":{"story_id":1,"version":1,"page_count":1,"bind_right":true,"startpage_right":false,"dpi":72,"baseframe_size":[180,268],"finishing_size":[210,297],"sheet_size":[257,364],"author":"funige","title":"min","pageinfo_count":1,"pageinfo":[[0,1,1,0,0]],"layer_color":[[-7950848,-16736256,-16777216],[-16738348,-16777056,-16777216],[-4259752,-6291456,-16777216],[-1918976,-6250496,-16777216]]}}')
  pack.entry({
    name: '/1/1',
    type: 'directory'
  })

  pack.finalize()

  pack.pipe(concat((data) => {
    fs.writeFileSync(fixtures.MIN_CSNF, data)
    t.same(data.length & 511, 0)
    t.deepEqual(data, fs.readFileSync(fixtures.MIN_CSNF))
  }))
})
