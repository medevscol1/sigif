const mongoose = require("mongoose"); // Importa Mongoose para definir el esquema y el modelo de auditoría

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

module.exports = mongoose.model("Auditoria", auditoriaSchema); // Exporta el modelo de Auditoría