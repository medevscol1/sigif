const mongoose = require('mongoose');

const ventaSchema = new mongoose.Schema({
  productos: [{
    producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' },
    cantidad: { type: Number, default: 1 },
    precio: { type: Number, default: 0 }
  }],
  total: { type: Number, default: 0 },
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Venta', ventaSchema);
