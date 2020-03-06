var CSNFLayer = require('./layer')

var CSNFPage = function (pid) {
  this.pid = String(pid)
  this.layers = []
  return this
}

CSNFPage.prototype.addLayer = function (header, data) {
  this.layers.forEach(layer => {
    if (layer.header.name === header.name) {
      throw new Error('Duplicated layer name')
    }
  })
  var layer = new CSNFLayer(header, data)
  this.layers.push(layer)
  return layer
}

CSNFPage.prototype.addDrawLayer = function (data, slot = 0) {
  return this.addLayer({ type: 'bitmap', name: `ly_d${slot}` }, data)
}

CSNFPage.prototype.addNoteLayer = function (data, slot = 0) {
  return this.addLayer({ type: 'bitmap', name: `ly_n${slot}` }, data)
}

CSNFPage.prototype.addFrameLayer = function (data, slot = 0) {
  return this.addLayer({ type: 'shape', name: `ly_f${slot}_s` }, data)
}

CSNFPage.prototype.addTextLayer = function (data, slot = 0) {
  // Texts may not properly rendered
  // when number of texts is less than 2
  if (data.length < 2) {
    var dummyText = data[0].map(item => (typeof item === 'string') ? '' : item)
    data.push(dummyText)
  }
  return this.addLayer({ type: 'text', name: `ly_t${slot}_t` }, data)
}

module.exports = CSNFPage
