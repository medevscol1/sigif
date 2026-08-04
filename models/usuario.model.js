const mongoose = require("mongoose");

const usuarioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        maxlength: 100
    },
    contra: {
        type: String,
        required: true,
        maxlength: 15
    },
    telefono: {
        type: String,
        required: true,
        maxlength: 12
    },
    activo: {
        type: Boolean,
        default: true
    },
    fecha_inicio: {
        type: Date,
        default: null
    },
    cargo: {
        type: String,
        enum: ["Admin", "Empleado"],
        default: "Empleado"
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Usuarios", usuarioSchema);