const mongoose = require("mongoose"); // Importa Mongoose para definir el esquema y el modelo

const clienteSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        maxlength: 100
    },
    correo: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    }
});

module.exports = mongoose.model("Cliente", clienteSchema);