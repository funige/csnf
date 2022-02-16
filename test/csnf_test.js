const test = require('tape')
const fixtures = require('./fixtures')
const fs = require('fs')
const CSNF = require('../csnf')

test('layer test', async function (t) {
  t.plan(1)

  const csnf = new CSNF()
  const page = csnf.addPage()

  const drawData = Uint8Array.of(
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

  const noteData = Uint8Array.of(
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

  const frame = csnf.baseframeRect()
  const p0 = [frame.x, frame.y]
  const p1 = [frame.x + frame.width, frame.y]
  const p2 = [frame.x + frame.width, frame.y + frame.height]
  const p3 = [frame.x, frame.y + frame.height]

  const fontSize = 11
  const vertical = true
  page.addTextLayer([
    csnf.text(p1, fontSize, vertical, 'vertical text')
  ])

  const w = 4
  page.addFrameLayer([
    csnf.line(w, p0, p2),
    csnf.polygon(w, p0, p1, p2, p3),
    csnf.polygon(w, [291, 837], [184, 796], [235, 721], [314, 726], [331, 807])
  ])

  const tmp = 'layer_test.csnf'
  await csnf.writeFile(tmp)

  const csnf2 = new CSNF()
  await csnf2.readFile(`test/fixtures/${tmp}`)
  t.deepEqual(csnf, csnf2.removeRawHeader())

  fs.unlinkSync(tmp)
})

test('slot test', async function (t) {
  t.plan(2)

  const csnf = new CSNF()
  const page = csnf.addPage()

  page.addTextLayer([csnf.text([100, 30], 11, false, 'test')])
  page.addTextLayer([csnf.text([200, 30], 11, false, 'test')], 1)
  page.addTextLayer([csnf.text([300, 30], 11, false, 'test')], 2)

  t.equal(page.layers.length, 3)
  const tmp = 'slot_test.csnf'
  await csnf.writeFile(tmp)

  const csnf2 = new CSNF()
  await csnf2.readFile(`test/fixtures/${tmp}`)
  t.deepEqual(csnf, csnf2.removeRawHeader())

  fs.unlinkSync(tmp)
})

test('set template', function (t) {
  t.plan(5)
  const b4 = new CSNF({ template: 'b4' })
  const a4 = new CSNF({ template: 'a4' })

  const csnf = new CSNF()
  const csnf2 = new CSNF({
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

  const csnf = new CSNF({
    frameColor: ['#86ae00', '#00a000', 'black'],
    drawColor: '#0097d4'
  })
  t.deepEqual(csnf.story.layer_color[csnf.FRAME], [-7950848, -16736256, -16777216])
  t.deepEqual(csnf.story.layer_color[csnf.DRAW], [-16738348])
})

test('set bindRight and startpageRight', async function (t) {
  t.plan(11)

  const csnf = new CSNF()
  const p1 = 100
  const p2 = 200
  const p3 = 300
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

  const csnf = new CSNF({ template: 'B4' })
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

  const p = [100, 101]
  const q = [200, 201]
  const r = [300, 301]
  const s = [400, 401]
  const u = [500, 501]
  t.deepEqual(
    csnf.line(4, p, q),
    [1, 4, ...p, ...q]
  )
  t.deepEqual(
    csnf.polygon(4, p, q, r, s),
    [2, 4, ...p, ...q, ...r, ...s]
  )
  t.deepEqual(
    csnf.polygon(4, p, q, r, s, u),
    [4, 4, 5, ...p, ...q, ...r, ...s, ...u]
  )
  t.deepEqual(
    csnf.text(p, 12, true, 'text', csnf.BOLD),
    [5, ...p, 12, 0, 1, true, 'text']
  )
  t.deepEqual(
    csnf.bitmap(3, 2, Uint8Array.of(100, 101, 102, 200, 201, 202)),
    Uint8Array.of(3, 0, 2, 0, 100, 101, 102, 200, 201, 202)
  )
})

test('csnf read', async function (t) {
  t.plan(8)

  const csnf = new CSNF()
  await csnf.readFile(fixtures.TEST_CSNF)

  t.equal(csnf.story.story_id, 1)
  t.equal(csnf.pages.length, 1)
  t.equal(csnf.pages[0].layers.length, 10)

  const layer = csnf.pages[0].layers[0]
  t.equal(layer.header.name, 'ly_f0_b')
  t.equal(layer.header.type, 'bitmap')

  const bitmap = layer.data
  const width = bitmap[0] + bitmap[1] * 0x100
  const height = bitmap[2] + bitmap[3] * 0x100
  t.equal(width, 728)
  t.equal(height, 1031)
  t.equal(width * height + 4, 750572)
})
