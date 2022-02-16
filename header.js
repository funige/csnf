const CSNFHeader = function (rawHeader) {
  this.rawHeader = rawHeader

  const arr = rawHeader.name.split('/')
  if (arr.length < 2 || arr[0] !== '') throw new Error('invalid header')

  switch (arr.length) {
    case 2:
      this.type = 'root'
      break

    case 3:
      if (arr[2] === 'story.json') {
        this.type = 'story'
      } else {
        this.type = 'page'
        this.pid = arr[2]
      }
      break

    case 4:
    default:
      if (arr[3] === 'thumb') {
        this.type = 'thumbnail'
      } else if (arr[3].match('^ly_[dn][0-9]$') || arr[3].match('(b|bt)$')) {
        this.type = 'bitmap'
      } else if (arr[3].match('s$')) {
        this.type = 'shape'
      } else if (arr[3].match('t$')) {
        this.type = 'text'
      }
      this.pid = arr[2]
      this.name = arr[3]
      break
  }
}

CSNFHeader.prototype.removeRawHeader = function () {
  if (this.rawHeader) {
    delete this.rawHeader
  }
}

CSNFHeader.prototype.isLayer = function () {
  return ([
    'bitmap',
    'shape',
    'text'
  ].find(type => type === this.type))
}

module.exports = CSNFHeader
