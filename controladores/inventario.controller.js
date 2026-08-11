const Producto = require("../models/producto.model");

// MOSTRAR INVENTARIO
exports.inventario = async (req, res) => {
    try {
        const producto = await Producto.find();

        res.render("inventario/inventario", {
            producto
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error al cargar el inventario.");
    }
};


// MOSTRAR INVENTARIO
exports.invHistorial = async (req, res) => {
    try {
        const movimientos = await Producto
            .find()
            .sort({ _id: -1 })
            .limit(2);

        movimientos.forEach((movimiento) => {
            movimiento.total = movimiento.precio * movimiento.stock;
        });

        res.render("inventario/inv_historial", {
            movimientos
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error al cargar el historial.");
    }
};

// MOSTRAR INVENTARIO
exports.invControl = async (req, res) => {
    try {
        const producto = await Producto.find();

        res.render("inventario/inv_control", {
            producto
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error al cargar el control de inventario.");
    }
};