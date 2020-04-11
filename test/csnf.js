var test = require('tape')
var fixtures = require('./fixtures')
var fs = require('fs')
var CSNF = require('../csnf')

test('layer test', async function (t) {
  t.plan(1)

  var csnf = new CSNF()
  var page = csnf.addPage()

  var drawData = Uint8Array.of(
    255, 255, 255, 255, 255, 255, 255, 255,
    255, 0, 0, 0, 0, 255, 255, 255,
    255, 0, 255, 255, 255, 0, 255, 255,
    255, 0, 255, 255, 255, 255, 0, 255,
    255, 0, 255, 255, 255, 255, 0, 255,
    255, 0, 255, 255, 255, 0, 255, 255,
    255, 0, 0, 0, 0, 255, 255, 255,
    128, 255, 255, 255, 255, 255, 255, 255
  )
  page.addDrawLayer(csnf.bitmap(8, 8, drawData))

  var noteData = Uint8Array.of(
    255, 255, 255, 255, 255, 255, 255, 255,
    255, 0, 255, 255, 255, 255, 0, 255,
    255, 0, 0, 255, 255, 255, 0, 255,
    255, 0, 255, 0, 255, 255, 0, 255,
    255, 0, 255, 255, 0, 255, 0, 255,
    255, 0, 255, 255, 255, 0, 0, 255,
    255, 0, 255, 255, 255, 255, 0, 255,
    128, 255, 255, 255, 255, 255, 255, 255
  )
  page.addNoteLayer(csnf.bitmap(8, 8, noteData))

  var frame = csnf.baseframeRect()
  var p0 = [frame.x, frame.y]
  var p1 = [frame.x + frame.width, frame.y]
  var p2 = [frame.x + frame.width, frame.y + frame.height]
  var p3 = [frame.x, frame.y + frame.height]

  var fontSize = 11
  var vertical = true
  page.addTextLayer([
    csnf.text(p1, fontSize, 0, 0, vertical, 'vertical text')
  ])

  var w = 4
  page.addFrameLayer([
    csnf.line(w, p0, p2),
    csnf.rectangle(w, p0, p1, p2, p3),
    csnf.polygon(w, [291, 837], [184, 796], [235, 721], [314, 726], [331, 807])
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

  page.addTextLayer([csnf.text([100, 30], 11, 0, 0, false, 'test')])
  page.addTextLayer([csnf.text([200, 30], 11, 0, 0, false, 'test')], 1)
  page.addTextLayer([csnf.text([300, 30], 11, 0, 0, false, 'test')], 2)

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
  t.deepEqual(csnf.story.pageinfo, [[0, 1, p1, 0, 0], [0, 3, p3, 2, p2]])

  csnf.setBindRight(false)
  t.equal(csnf.story.pageinfo_count, 2)
  t.deepEqual(csnf.story.pageinfo, [[0, 1, p1, 2, p2], [0, 3, p3, 0, 0]])

  csnf.setStartpageRight(true)
  t.equal(csnf.story.pageinfo_count, 2)
  t.deepEqual(csnf.story.pageinfo, [[0, 0, 0, 1, p1], [0, 2, p2, 3, p3]])

  csnf.setBindRight(true)
  t.equal(csnf.story.pageinfo_count, 2)
  t.deepEqual(csnf.story.pageinfo, [[0, 2, p2, 1, p1], [0, 0, 0, 3, p3]])
})

test('convenient methods', function (t) {
  t.plan(9)

  var csnf = new CSNF({ template: 'B4' })
  t.deepEqual(
    csnf.sheetRect(),
    { x: 0, y: 0, width: 728, height: 1031 }
  )
  t.deepEqual(
    csnf.finishingRect(),
    { x: 52.5, y: 76.5, width: 623, height: 878 }
  )
  t.deepEqual(
    csnf.baseframeRect(),
    { x: 109, y: 133, width: 510, height: 765 }
  )
  t.deepEqual(
    csnf.px2mm(csnf.mm2px([100, 200])),
    [100, 200]
  )

  var p = [100, 101]
  var q = [200, 201]
  var r = [300, 301]
  var s = [400, 401]
  var u = [500, 501]
  t.deepEqual(
    csnf.line(4, p, q),
    [1, 4, ...p, ...q]
  )
  t.deepEqual(
    csnf.rectangle(4, p, q, r, s),
    [2, 4, ...p, ...q, ...r, ...s]
  )
  t.deepEqual(
    csnf.polygon(4, p, q, r, s, u),
    [4, 4, 5, ...p, ...q, ...r, ...s, ...u]
  )
  t.deepEqual(
    csnf.text(p, 12, 13, 14, true, 'text'),
    [5, ...p, 12, 13, 14, true, 'text']
  )
  t.deepEqual(
    csnf.bitmap(3, 2, Uint8Array.of(100, 101, 102, 200, 201, 202)),
    Uint8Array.of(3, 0, 2, 0, 100, 101, 102, 200, 201, 202)
  )
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
