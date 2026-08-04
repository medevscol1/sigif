const mongoose = require("mongoose"); // Importa Mongoose para definir el esquema de configuración empresarial

const empresaConfigSchema = new mongoose.Schema({
    nombre_comercial: {
        type: String,
        default: "SIGIF",
        maxlength: 150
    },
    nit: {
        type: String,
        default: "900.123.456-7",
        maxlength: 50
    },
    direccion: {
        type: String,
        default: 'CASA DE MOYA "LA AURORA"',
        maxlength: 255
    },
    moneda: {
        type: String,
        default: "COP ($) - Pesos Colombianos",
        maxlength: 50
    },
    impuesto: {
        type: String,
        default: "19%",
        maxlength: 10
    },
    correo_contacto: {
        type: String,
        default: "soporte@sigif.com",
        lowercase: true
    }
});

module.exports = mongoose.model("EmpresaConfig", empresaConfigSchema); // Exporta el modelo de configuración de la empresa