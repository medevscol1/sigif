const Producto = require('../models/producto.model');

// Mostrar inventario
exports.inventario = async (req, res) => {
    try {

        const productos = await Producto.find();

        res.render('pages/inventario', {
            productos
        });

    } catch (error) {
        console.error("Error al cargar el inventario:", error);

        res.status(500).send(
            "Error al cargar el inventario: " + error.message
        );
    }
};


// Mostrar control de inventario
exports.control = async (req, res) => {
    try {

        const productos = await Producto.find({
            activo: true
        });

        res.render('pages/inventario/control', {
            productos
        });

    } catch (error) {
        console.error("Error al cargar el control de inventario:", error);

        res.status(500).send(
            "Error al cargar el control de inventario: " + error.message
        );
    }
};


// Mostrar historial de inventario
exports.historial = async (req, res) => {
    try {

        const productos = await Producto.find();

        res.render('pages/inventario/historial', {
            productos
        });

    } catch (error) {
        console.error("Error al cargar el historial:", error);

        res.status(500).send(
            "Error al cargar el historial: " + error.message
        );
    }
};