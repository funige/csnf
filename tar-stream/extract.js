const util = require('util')
const bl = require('bl')
const headers = require('./headers')

const Writable = require('readable-stream').Writable
const PassThrough = require('readable-stream').PassThrough

const noop = function () {}

const overflow = function (size) {
  size &= 511
  return size && 512 - size
}

const emptyStream = function (self, offset) {
  const s = new Source(self, offset)
  s.end()
  return s
}

const mixinPax = function (header, pax) {
  if (pax.path) header.name = pax.path
  if (pax.linkpath) header.linkname = pax.linkpath
  if (pax.size) header.size = parseInt(pax.size, 10)
  header.pax = pax
  return header
}

const Source = function (self, offset) {
  this._parent = self
  this.offset = offset
  PassThrough.call(this)
}

util.inherits(Source, PassThrough)

Source.prototype.destroy = function (err) {
  this._parent.destroy(err)
}

const Extract = function (opts) {
  if (!(this instanceof Extract)) return new Extract(opts)
  Writable.call(this, opts)

  opts = opts || {}

  this._offset = 0
  this._buffer = bl()
  this._missing = 0
  this._partial = false
  this._onparse = noop
  this._header = null
  this._stream = null
  this._overflow = null
  this._cb = null
  this._locked = false
  this._destroyed = false
  this._pax = null
  this._paxGlobal = null
  this._gnuLongPath = null
  this._gnuLongLinkPath = null

  const self = this
  const b = self._buffer

  const oncontinue = function () {
    self._continue()
  }

  const onunlock = function (err) {
    self._locked = false
    if (err) return self.destroy(err)
    if (!self._stream) oncontinue()
  }

  const onstreamend = function () {
    self._stream = null
    const drain = overflow(self._header.size)
    if (drain) self._parse(drain, ondrain)
    else self._parse(512, onheader)
    if (!self._locked) oncontinue()
  }

  const ondrain = function () {
    self._buffer.consume(overflow(self._header.size))
    self._parse(512, onheader)
    oncontinue()
  }

  const onpaxglobalheader = function () {
    const size = self._header.size
    self._paxGlobal = headers.decodePax(b.slice(0, size))
    b.consume(size)
    onstreamend()
  }

  const onpaxheader = function () {
    const size = self._header.size
    self._pax = headers.decodePax(b.slice(0, size))
    if (self._paxGlobal) self._pax = Object.assign({}, self._paxGlobal, self._pax)
    b.consume(size)
    onstreamend()
  }

  const ongnulongpath = function () {
    const size = self._header.size
    this._gnuLongPath = headers.decodeLongPath(b.slice(0, size), opts.filenameEncoding)
    b.consume(size)
    onstreamend()
  }

  const ongnulonglinkpath = function () {
    const size = self._header.size
    this._gnuLongLinkPath = headers.decodeLongPath(b.slice(0, size), opts.filenameEncoding)
    b.consume(size)
    onstreamend()
  }

  const onheader = function () {
    const offset = self._offset
    let header
    try {
      header = self._header = headers.decode(b.slice(0, 512), opts.filenameEncoding)
    } catch (err) {
      self.emit('error', err)
    }
    b.consume(512)

    if (!header) {
      self._parse(512, onheader)
      oncontinue()
      return
    }
    if (header.type === 'gnu-long-path') {
      self._parse(header.size, ongnulongpath)
      oncontinue()
      return
    }
    if (header.type === 'gnu-long-link-path') {
      self._parse(header.size, ongnulonglinkpath)
      oncontinue()
      return
    }
    if (header.type === 'pax-global-header') {
      self._parse(header.size, onpaxglobalheader)
      oncontinue()
      return
    }
    if (header.type === 'pax-header') {
      self._parse(header.size, onpaxheader)
      oncontinue()
      return
    }

    if (self._gnuLongPath) {
      header.name = self._gnuLongPath
      self._gnuLongPath = null
    }

    if (self._gnuLongLinkPath) {
      header.linkname = self._gnuLongLinkPath
      self._gnuLongLinkPath = null
    }

    if (self._pax) {
      self._header = header = mixinPax(header, self._pax)
      self._pax = null
    }

    self._locked = true

    if (!header.size || header.type === 'directory') {
      self._parse(512, onheader)
      self.emit('entry', header, emptyStream(self, offset), onunlock)
      return
    }

    self._stream = new Source(self, offset)

    self.emit('entry', header, self._stream, onunlock)
    self._parse(header.size, onstreamend)
    oncontinue()
  }

  this._onheader = onheader
  this._parse(512, onheader)
}

util.inherits(Extract, Writable)

Extract.prototype.destroy = function (err) {
  if (this._destroyed) return
  this._destroyed = true

  if (err) this.emit('error', err)
  this.emit('close')
  if (this._stream) this._stream.emit('close')
}

Extract.prototype._parse = function (size, onparse) {
  if (this._destroyed) return
  this._offset += size
  this._missing = size
  if (onparse === this._onheader) this._partial = false
  this._onparse = onparse
}

Extract.prototype._continue = function () {
  if (this._destroyed) return
  const cb = this._cb
  this._cb = noop
  if (this._overflow) this._write(this._overflow, undefined, cb)
  else cb()
}

Extract.prototype._write = function (data, enc, cb) {
  if (this._destroyed) return

  const s = this._stream
  const b = this._buffer
  const missing = this._missing
  if (data.length) this._partial = true

  // we do not reach end-of-chunk now. just forward it

  if (data.length < missing) {
    this._missing -= data.length
    this._overflow = null
    if (s) return s.write(data, cb)
    b.append(data)
    return cb()
  }

  // end-of-chunk. the parser should call cb.

  this._cb = cb
  this._missing = 0

  let overflow = null
  if (data.length > missing) {
    overflow = data.slice(missing)
    data = data.slice(0, missing)
  }

  if (s) s.end(data)
  else b.append(data)

  this._overflow = overflow
  this._onparse()
}

Extract.prototype._final = function (cb) {
  if (this._partial) return this.destroy(new Error('Unexpected end of data'))
  cb()
}

module.exports = Extract
