const Producto = require("../models/producto.model");
const Auditoria = require("../models/auditoria.model");

// Listar productos
exports.productos = async (req, res) => {
    try {
        const productos = await Producto.find();

        res.render("productos/productos", {
            productos
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error al cargar los productos.");
    }
};

// Mostrar formulario crear
exports.vistaCrearProducto = (req, res) => {
    res.render("productos/crear_productos");
};

// Crear producto
exports.crearProducto = async (req, res) => {
    try {

        const producto = new Producto({
            nombre: req.body.nombre,
            descripcion: req.body.descripcion,
            precio: req.body.precio,
            stock: req.body.stock,
            categoria: req.body.categoria,
            activo: req.body.activo === "on" || req.body.activo === true
        });

        await producto.save();

        await Auditoria.create({
            usuario: req.session.logueado.nombre,
            accion: `CREO UN PRODUCTO: ${producto.nombre}`,
            modulo: "PRODUCTOS"
        });

        res.redirect("/productos");

    } catch (error) {
        console.error(error);
        res.status(500).send("Error al crear el producto.");
    }
};

// Mostrar formulario actualizar
exports.vistaActualizarProducto = async (req, res) => {
    try {

        const producto = await Producto.findById(req.params.id);

        if (!producto) {
            return res.status(404).send("Producto no encontrado.");
        }

        res.render("productos/actualizar_productos", {
            producto
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error.");
    }
};

// Actualizar producto
exports.actualizarProducto = async (req, res) => {
    try {

        const producto = await Producto.findById(req.params.id);

        if (!producto) {
            return res.status(404).send("Producto no encontrado.");
        }

        producto.nombre = req.body.nombre;
        producto.descripcion = req.body.descripcion;
        producto.precio = req.body.precio;
        producto.stock = req.body.stock;
        producto.categoria = req.body.categoria;
        producto.activo = req.body.activo === "on" || req.body.activo === true;
        producto.fecha_actualizacion = Date.now();

        await producto.save();

        await Auditoria.create({
            usuario: req.session.logueado.nombre,
            accion: `ACTUALIZO UN PRODUCTO: ${producto.nombre}`,
            modulo: "PRODUCTOS"
        });

        res.redirect("/productos");

    } catch (error) {
        console.error(error);
        res.status(500).send("Error al actualizar el producto.");
    }
};

// Eliminar producto
exports.eliminarProducto = async (req, res) => {
    try {

        const producto = await Producto.findById(req.params.id);

        if (!producto) {
            return res.status(404).send("Producto no encontrado.");
        }

        const nombre = producto.nombre;

        await producto.deleteOne();

        await Auditoria.create({
            usuario: req.session.logueado.nombre,
            accion: `ELIMINO UN PRODUCTO: ${nombre}`,
            modulo: "PRODUCTOS"
        });

        res.redirect("/productos");

    } catch (error) {
        console.error(error);
        res.status(500).send("Error al eliminar el producto.");
    }
};