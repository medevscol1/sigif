const mongoose = require("mongoose");

const auditoriaSchema = new mongoose.Schema({
    usuario: {
        type: String,
        required: true,
        maxlength: 100
    },
    accion: {
        type: String,
        required: true,
        maxlength: 255
    },
    modulo: {
        type: String,
        enum: [
            "USUARIOS",
            "PRODUCTOS",
            "INVENTARIO",
            "FACTURACION",
            "CONFIGURACION"
        ],
        required: true
    },
    fecha: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Auditoria", auditoriaSchema);