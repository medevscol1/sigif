const mongoose = require("mongoose");

const facturaSchema = new mongoose.Schema({
    numero: {
        type: Number,
        required: true,
        index: true
    },
    fecha: {
        type: Date,
        default: Date.now
    },
    cliente: {
        nombre: {
            type: String,
            default: "Consumidor Final"
        },
        correo: {
            type: String,
            default: "consumidorfinal@pos.com"
        },
        telefono: {
            type: String,
            default: ""
        },
        documento: {
            type: String,
            default: ""
        },
        refId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Cliente"
        }
    },
    vendedor: {
        type: String,
        default: "medevs"
    },
    baseGravable: {
        type: Number,
        default: 0
    },
    ivaPorcentaje: {
        type: Number,
        default: 19
    },
    iva: {
        type: Number,
        default: 0
    },
    productos: [
        {
            producto: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Producto"
            },
            nombre: {
                type: String,
                required: true
            },
            cantidad: {
                type: Number,
                default: 1
            },
            precio: {
                type: Number,
                required: true
            },
            subtotal: {
                type: Number,
                default: 0
            }
        }
    ],
    total: {
        type: Number,
        required: true
    },
    tipo: {
        type: String,
        enum: ["salida", "entrada"],
        default: "salida"
    },
    estado: {
        type: String,
        enum: ["pagada", "pendiente", "anulada"],
        default: "pagada"
    },
    metodoPago: {
        type: String,
        default: "Efectivo"
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Factura", facturaSchema);