const mongoose = require("mongoose");

const detalleEntradaSchema = new mongoose.Schema({
    producto: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Producto',
        required: true
    },
    cantidad: {
        type: Number,
        required: true,
        min: 1
    },
    precio: {
        type: Number,
        required: true,
        min: 0
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0
    }
});

const entradaInventarioSchema = new mongoose.Schema({
    numero: {
        type: Number,
        required: true,
        unique: true
    },
    proveedor: {
        type: String,
        required: true,
        maxlength: 150
    },
    documento: {
        type: String,
        maxlength: 50,
        default: ''
    },
    observaciones: {
        type: String,
        maxlength: 500,
        default: ''
    },
    usuario: {
        type: String,
        required: true,
        maxlength: 100
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    fecha: {
        type: Date,
        default: Date.now
    },
    detalles: [detalleEntradaSchema]
}, {
    timestamps: true
});

entradaInventarioSchema.methods.numeroFactura = function() {
    return `ENT-${String(this.numero).padStart(6, '0')}`;
};

module.exports = {
    EntradaInventario: mongoose.model("EntradaInventario", entradaInventarioSchema),
    DetalleEntradaInventario: mongoose.model("DetalleEntradaInventario", detalleEntradaSchema)
};