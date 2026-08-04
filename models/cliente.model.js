const mongoose = require("mongoose");

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