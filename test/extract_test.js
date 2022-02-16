const test = require('tape')
const tar = require('../tar-stream')
const fixtures = require('./fixtures')
const concat = require('concat-stream')
const fs = require('fs')

test('extract', function (t) {
  t.plan(4)

  const extract = tar.extract()

  extract.on('entry', function (header, stream, callback) {
    switch (header.name) {
      case '/1':
        t.deepEqual(header, {
          name: '/1',
          mode: 0,
          uid: 0,
          gid: 0,
          size: 0,
          mtime: new Date(0),
          type: 'directory',
          linkname: null,
          uname: '',
          gname: '',
          devmajor: 0,
          devminor: 0
        })
        break

      case '/1/story.json':
        t.deepEqual(header, {
          name: '/1/story.json',
          mode: 0,
          uid: 0,
          gid: 0,
          size: 393,
          mtime: new Date(0),
          type: 'file',
          linkname: null,
          uname: '',
          gname: '',
          devmajor: 0,
          devminor: 0
        })
        break

      case '/1/1':
        t.deepEqual(header, {
          name: '/1/1',
          mode: 0,
          uid: 0,
          gid: 0,
          size: 0,
          mtime: new Date(0),
          type: 'directory',
          linkname: null,
          uname: '',
          gname: '',
          devmajor: 0,
          devminor: 0
        })
        break
    }
    stream.pipe(concat((data) => {
      if (header.name === '/1/story.json') {
        t.same(data.toString(), '{"body":{"story_id":1,"version":1,"page_count":1,"bind_right":true,"startpage_right":false,"dpi":72,"baseframe_size":[180,268],"finishing_size":[210,297],"sheet_size":[257,364],"author":"funige","title":"min","pageinfo_count":1,"pageinfo":[[0,1,1,0,0]],"layer_color":[[-7950848,-16736256,-16777216],[-16738348,-16777056,-16777216],[-4259752,-6291456,-16777216],[-1918976,-6250496,-16777216]]}}')
      }
      callback()
    }))
  })

  extract.on('finish', function () {})
  extract.end(fs.readFileSync(fixtures.MIN_CSNF))
})
