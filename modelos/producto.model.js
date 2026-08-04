const mongoose = require("mongoose");

const productoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        maxlength: 100
    },
    descripcion: {
        type: String,
        default: null
    },
    precio: {
        type: mongoose.Schema.Types.Decimal128,
        required: true
    },
    stock: {
        type: Number,
        default: 0
    },
    categoria: {
        type: String,
        required: true,
        maxlength: 100
    },
    activo: {
        type: Boolean,
        default: true
    },
    fecha_creacion: {
        type: Date,
        default: Date.now
    },
    fecha_actualizacion: {
        type: Date,
        default: Date.now
    }
});

// Actualiza automáticamente la fecha de modificación
productoSchema.pre("save", function (next) {
    this.fecha_actualizacion = Date.now();
    next();
});

module.exports = mongoose.model("Producto", productoSchema);