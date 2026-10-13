const mongoose = require('mongoose');

const entradaSchema = new mongoose.Schema({
  numero: { type: String, required: true, trim: true },
  proveedor: { type: String, required: true, trim: true },
  registro: { type: String, default: 'Sistema', trim: true },
  fecha: { type: Date, default: Date.now },
  productos: [{
    producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
    cantidad: { type: Number, required: true, min: 1 },
    precio: { type: Number, required: true, min: 0 }
  }],
  total: { type: Number, required: true, min: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Entrada', entradaSchema);
