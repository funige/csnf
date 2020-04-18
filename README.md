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
var CSNF = require('csnf')

var csnf = new CSNF({ template: 'B4' })
var page = csnf.addPage()

// CSNF has 4 layer types (Frame, Draw, Text, Note),
// each type allows up to 3 layers.

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

var rect = csnf.baseframeRect()
var p0 = [rect.x, rect.y]
var p1 = [rect.x + rect.width, rect.y]
var p2 = [rect.x + rect.width, rect.y + rect.height]
var p3 = [rect.x, rect.y + rect.height]

var fontSize = 11
var vertical = true
page.addTextLayer([
  csnf.text(p1, fontSize, vertical, 'vertical\ntext')
])

var w = 4
page.addFrameLayer([
  csnf.line(w, p0, p2),
  csnf.rectangle(w, p0, p1, p2, p3),
  csnf.polygon(w, [291, 837], [184, 796], [235, 721], [314, 726], [331, 807])
])

await csnf.writeFile('test.csnf')
```

# License

MIT
