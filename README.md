# csnf

csnf is a parser and generator for CLIP STUDIO name files.
```
npm install csnf
```

[![build status](https://secure.travis-ci.org/funige/csnf.png)](http://travis-ci.org/funige/csnf)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](http://opensource.org/licenses/MIT)

## Usage

``` js
import { CSNF } from 'csnf'

var csnf = new CSNF({ template: 'b4' })
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

var frame = csnf.mm2px(csnf.story.baseframe_size)
var sheet = csnf.mm2px(csnf.story.sheet_size)
var x = (sheet[0] - frame[0]) / 2
var y = (sheet[1] - frame[1]) / 2
var p0 = [x, y]
var p1 = [x + frame[0], y]
var p2 = [x + frame[0], y + frame[1]]
var p3 = [x, y + frame[1]]

page.addFrameLayer([
  [1, 4, ...p0, ...p2], // line
  [2, 4, ...p0, ...p1, ...p2, ...p3], // rectangle
  [4, 4, 5, 291, 837, 184, 796, 235, 721, 314, 726, 331, 807] // polygon
])

page.addTextLayer([
  [5, ...p1, 11, 0, 0, true, 'vertical text']
])

await csnf.writeFile('test.csnf')
```

# License

MIT
