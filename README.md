# csnf

csnf is a parser and generator for CSNF (CLIP STUDIO name files).
```
npm install csnf
```

[![build status](https://secure.travis-ci.org/funige/csnf.png)](http://travis-ci.org/funige/csnf)
[![npm version](https://badge.fury.io/js/csnf.svg)](https://badge.fury.io/js/csnf)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](http://opensource.org/licenses/MIT)

## Usage

``` js
const CSNF = require('csnf')

const csnf = new CSNF({ template: 'B4' })
const page = csnf.addPage()

// CSNF has 4 layer types (Frame, Draw, Text, Note),
// each type allows up to 3 layers.

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

const rect = csnf.baseframeRect()
const p0 = [rect.x, rect.y]
const p1 = [rect.x + rect.width, rect.y]
const p2 = [rect.x + rect.width, rect.y + rect.height]
const p3 = [rect.x, rect.y + rect.height]

const fontSize = 11
const vertical = true
page.addTextLayer([
  csnf.text(p1, fontSize, vertical, 'vertical\ntext')
])

const w = 4
page.addFrameLayer([
  csnf.line(w, p0, p2),
  csnf.polygon(w, p0, p1, p2, p3)
])

await csnf.writeFile('test.csnf')
```

# License

MIT
