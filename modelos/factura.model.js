const mongoose = require("mongoose"); // Importa Mongoose para definir el esquema y el modelo de factura

const facturaSchema = new mongoose.Schema({
    cliente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Cliente",
        required: true
    },
    fecha: {
        type: Date,
        default: Date.now
    },
    total: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model("Factura", facturaSchema); // Exporta el modelo de Factura