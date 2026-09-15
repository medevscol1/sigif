const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const usuarioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        maxlength: 100
    },
    documento: {
        type: String,
        required: false,
        maxlength: 15,
        unique: true,
        sparse: true,
        match: [/^\d+$/, 'Documento solo números']
    },
    contra: {
        type: String,
        required: true,
        maxlength: 128
    },
    telefono: {
        type: String,
        required: false,
        maxlength: 12,
        sparse: true,
        match: [/^\d+$/, 'Teléfono solo números']
    },
    correo: {
        type: String,
        required: false,
        maxlength: 100,
        unique: true,
        sparse: true,
        lowercase: true,
        trim: true
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
        enum: ["SuperAdmin", "Admin", "Empleado"],
        default: "Empleado"
    },
    es_superadmin_principal: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

usuarioSchema.methods.setPassword = async function(rawPassword) {
    const salt = await bcrypt.genSalt(10);
    this.contra = await bcrypt.hash(rawPassword, salt);
};

usuarioSchema.methods.checkPassword = async function(rawPassword) {
    if (!this.contra) return false;
    // Soporta contraseñas legacy en texto plano migrándolas al verificar
    if (this.contra.startsWith('$2a$') || this.contra.startsWith('$2b$') || this.contra.startsWith('$2y$')) {
        return bcrypt.compare(rawPassword, this.contra);
    }
    // legacy plain comparison
    return this.contra === rawPassword;
};

// Hook para normalizar correo y hashear contraseña si no está hasheada
usuarioSchema.pre('save', async function() {
    if (this.correo) {
        this.correo = this.correo.trim().toLowerCase();
    }
    if (this.isModified('contra')) {
        const c = this.contra || '';
        const isHashed = c.startsWith('$2a$') || c.startsWith('$2b$') || c.startsWith('$2y$');
        if (!isHashed) {
            const salt = await bcrypt.genSalt(10);
            this.contra = await bcrypt.hash(c, salt);
        }
    }
});

module.exports = mongoose.model("Usuarios", usuarioSchema);