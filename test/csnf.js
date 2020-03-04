var test = require('tape')
var fixtures = require('./fixtures')
var fs = require('fs')
var CSNF = require('../csnf')

test('layer test', async function (t) {
  t.plan(1)

  var csnf = new CSNF()
  var page = csnf.addPage()

  var drawData = Uint8Array.of(
    8, 0, 8, 0,
    255, 255, 255, 255, 255, 255, 255, 255,
    255, 0, 0, 0, 0, 255, 255, 255,
    255, 0, 255, 255, 255, 0, 255, 255,
    255, 0, 255, 255, 255, 255, 0, 255,
    255, 0, 255, 255, 255, 255, 0, 255,
    255, 0, 255, 255, 255, 0, 255, 255,
    255, 0, 0, 0, 0, 255, 255, 255,
    128, 255, 255, 255, 255, 255, 255, 255
  )
  page.addDrawLayer(drawData)

  var noteData = Uint8Array.of(
    8, 0, 8, 0,
    255, 255, 255, 255, 255, 255, 255, 255,
    255, 0, 255, 255, 255, 255, 0, 255,
    255, 0, 0, 255, 255, 255, 0, 255,
    255, 0, 255, 0, 255, 255, 0, 255,
    255, 0, 255, 255, 0, 255, 0, 255,
    255, 0, 255, 255, 255, 0, 0, 255,
    255, 0, 255, 255, 255, 255, 0, 255,
    128, 255, 255, 255, 255, 255, 255, 255
  )
  page.addNoteLayer(noteData)

  var frame = csnf.mm2px(csnf.story.baseframe_size)
  var sheet = csnf.mm2px(csnf.story.sheet_size)
  var x = (sheet[0] - frame[0]) / 2
  var y = (sheet[1] - frame[1]) / 2
  var p0 = [x, y]
  var p1 = [x + frame[0], y]
  var p2 = [x + frame[0], y + frame[1]]
  var p3 = [x, y + frame[1]]

  page.addTextLayer([
    [ 5, ...p1, 11, 0, 0, true, 'vertical text' ]
  ])

  page.addFrameLayer([
    [ 1, 4, ...p0, ...p2 ], // line
    [ 2, 4, ...p0, ...p1, ...p2, ...p3 ], // rectangle
    [ 4, 4, 5, 291, 837, 184, 796, 235, 721, 314, 726, 331, 807 ] // polygon
  ])

  var tmp = 'layer_test.csnf'
  await csnf.writeFile(tmp)

  var csnf2 = new CSNF()
  await csnf2.readFile(`test/fixtures/${tmp}`)
  t.deepEqual(csnf, csnf2.removeRawHeader())

  fs.unlinkSync(tmp)
})

test('slot test', async function (t) {
  t.plan(2)

  var csnf = new CSNF()
  var page = csnf.addPage()

  page.addTextLayer([ [ 5, 100, 30, 11, 0, 0, false, 'test' ] ])
  page.addTextLayer([ [ 5, 200, 30, 11, 0, 0, false, 'test' ] ], 1)
  page.addTextLayer([ [ 5, 300, 30, 11, 0, 0, false, 'test' ] ], 2)

  t.equal(page.layers.length, 3)
  var tmp = 'slot_test.csnf'
  await csnf.writeFile(tmp)

  var csnf2 = new CSNF()
  await csnf2.readFile(`test/fixtures/${tmp}`)
  t.deepEqual(csnf, csnf2.removeRawHeader())

  fs.unlinkSync(tmp)
})

test('set template', function (t) {
  t.plan(5)
  var b4 = new CSNF({ template: 'b4' })
  var a4 = new CSNF({ template: 'a4' })

  var csnf = new CSNF()
  var csnf2 = new CSNF({
    sheetSize: [210, 297],
    finishingSize: [182, 257],
    baseframeSize: [150, 220]
  })
  t.deepEqual(a4.story.sheet_size, [210, 297])
  t.deepEqual(a4.story.finishing_size, [182, 257])
  t.deepEqual(a4.story.baseframe_size, [150, 220])

  t.deepEqual(b4.story, csnf.story)
  t.deepEqual(a4.story, csnf2.story)
})

test('set color', function (t) {
  t.plan(2)

  var csnf = new CSNF({
    frameColor: ['#86ae00', '#00a000', 'black'],
    drawColor: '#0097d4'
  })
  t.deepEqual(csnf.story.layer_color[CSNF.FRAME], [-7950848, -16736256, -16777216])
  t.deepEqual(csnf.story.layer_color[CSNF.DRAW], [-16738348])
})

test('set bindRight and startpageRight', async function (t) {
  t.plan(11)

  var csnf = new CSNF()
  var p1 = 100
  var p2 = 200
  var p3 = 300
  csnf.addPage(p1)
  csnf.addPage(p2)
  csnf.addPage(p3)

  t.equal(csnf.story.page_count, 3)
  t.equal(csnf.story.bind_right, true)
  t.equal(csnf.story.startpage_right, false)

  t.equal(csnf.story.pageinfo_count, 2)
  t.deepEqual(csnf.story.pageinfo, [ [ 0, 1, p1, 0, 0 ], [ 0, 3, p3, 2, p2 ] ])

  csnf.setBindRight(false)
  t.equal(csnf.story.pageinfo_count, 2)
  t.deepEqual(csnf.story.pageinfo, [ [ 0, 1, p1, 2, p2 ], [ 0, 3, p3, 0, 0 ] ])

  csnf.setStartpageRight(true)
  t.equal(csnf.story.pageinfo_count, 2)
  t.deepEqual(csnf.story.pageinfo, [ [ 0, 0, 0, 1, p1 ], [ 0, 2, p2, 3, p3 ] ])

  csnf.setBindRight(true)
  t.equal(csnf.story.pageinfo_count, 2)
  t.deepEqual(csnf.story.pageinfo, [ [ 0, 2, p2, 1, p1 ], [ 0, 0, 0, 3, p3 ] ])
})

test('csnf read', async function (t) {
  t.plan(8)

  var csnf = new CSNF()
  await csnf.readFile(fixtures.TEST_CSNF)

  t.equal(csnf.story.story_id, 1)
  t.equal(csnf.pages.length, 1)
  t.equal(csnf.pages[0].layers.length, 10)

  var layer = csnf.pages[0].layers[0]
  t.equal(layer.header.name, 'ly_f0_b')
  t.equal(layer.header.type, 'bitmap')

  var bitmap = layer.data
  var width = bitmap[0] + bitmap[1] * 0x100
  var height = bitmap[2] + bitmap[3] * 0x100
  t.equal(width, 728)
  t.equal(height, 1031)
  t.equal(width * height + 4, 750572)
})
