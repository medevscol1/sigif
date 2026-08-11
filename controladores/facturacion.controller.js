const Cliente = require('../models/cliente.model');
const Producto = require('../models/producto.model');

// Mostrar página principal de facturación
exports.facturacion = async (req, res) => {
    try {

        const clientes = await Cliente.find();

        const productos = await Producto.find({
            activo: true,
            stock: { $gt: 0 }
        });

        res.render('pages/facturacion', {
            clientes,
            productos
        });

    } catch (error) {
        console.error("Error al cargar facturación:", error);

        res.status(500).send(
            "Error al cargar facturación: " + error.message
        );
    }
};


// Mostrar clientes
exports.clientes = async (req, res) => {
    try {

        const clientes = await Cliente.find();

        res.render('pages/facturacion/clientes', {
            clientes
        });

    } catch (error) {
        console.error("Error al cargar clientes:", error);

        res.status(500).send(
            "Error al cargar clientes: " + error.message
        );
    }
};


// Mostrar productos disponibles para facturación
exports.productos = async (req, res) => {
    try {

        const productos = await Producto.find({
            activo: true,
            stock: { $gt: 0 }
        });

        res.render('pages/facturacion/productos', {
            productos
        });

    } catch (error) {
        console.error("Error al cargar productos:", error);

        res.status(500).send(
            "Error al cargar productos: " + error.message
        );
    }
};