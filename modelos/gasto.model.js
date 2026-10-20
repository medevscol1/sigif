const mongoose = require("mongoose");

const gastoSchema = new mongoose.Schema({
    concepto: {
        type: String,
        required: true,
        maxlength: 150
    },
    categoria: {
        type: String,
        required: true,
        enum: [
            "ARRIENDO",
            "NOMINA",
            "REPUESTOS",
            "SERVICIOS",
            "PUBLICIDAD",
            "TRANSPORTE",
            "OTROS"
        ]
    },
    valor: {
        type: Number,
        required: true,
        min: 0
    },
    fecha: {
        type: Date,
        required: true,
        default: Date.now
    },
    metodo_pago: {
        type: String,
        required: true,
        enum: ["EFECTIVO", "TRANSFERENCIA", "TARJETA", "CHEQUE"],
        default: "EFECTIVO"
    },
    proveedor: {
        type: String,
        maxlength: 150,
        default: ''
    },
    descripcion: {
        type: String,
        maxlength: 2000,
        default: ''
    },
    usuario: {
        type: String,
        required: true,
        maxlength: 100
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Gasto", gastoSchema);