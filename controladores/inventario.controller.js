const Producto = require('../modelos/producto.model');
const { EntradaInventario, DetalleEntradaInventario } = require('../modelos/entradaInventario.model');
const Auditoria = require('../modelos/auditoria.model');
const logger = require('../services/logs');

function getUsuario(req) {
    return (req.session && req.session.logueado && req.session.logueado.nombre) ? req.session.logueado.nombre : 'Sistema';
}

// Mostrar inventario
exports.inventario = async (req, res) => {
    try {
        const productos = await Producto.find();

        res.render('inventario/inventario', { productos, request: req });

    } catch (error) {
        console.error("Error al cargar el inventario:", error);
        res.status(500).send("Error al cargar el inventario: " + error.message);
    };
};

// Mostrar control de inventario
exports.control = async (req, res) => {
    try {
        const productos = await Producto.find({ activo: true });

        res.render('inventario/inv_control', { productos, request: req });

    } catch (error) {
        console.error("Error al cargar el control de inventario:", error);
        res.status(500).send("Error al cargar el control de inventario: " + error.message);
    };
};

// Mostrar historial de inventario
exports.historial = async (req, res) => {
    try {
        const productos = await Producto.find();

        res.render('inventario/inv_historial', { productos, request: req });

    } catch (error) {
        console.error("Error al cargar el historial:", error);
        res.status(500).send("Error al cargar el historial: " + error.message);
    };
};

// Mostrar formulario de ingresos
exports.ingresos = async (req, res) => {
    try {
        const productos = await Producto.find({ activo: true }).sort({ nombre: 1 });
        const entradas = await EntradaInventario.find().populate('detalles.producto').sort({ fecha: -1 }).lean();

        res.render('inventario/inv_ingresos', { productos, entradas, request: req });

    } catch (error) {
        console.error("Error al cargar ingresos:", error);
        res.status(500).send("Error al cargar ingresos: " + error.message);
    };
};

// Registrar entrada al inventario
exports.registrarEntrada = async (req, res) => {
    try {
        const { proveedor, documento, observaciones, items } = req.body;
        const usuario = getUsuario(req);

        if (!proveedor || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "Datos inválidos" });
        }

        // Calcular total
        let total = 0;
        const detalles = [];

        for (const item of items) {
            const cantidad = Number(item.cantidad);
            const precio = Number(item.precio);
            const precioVenta = Number(item.precio_venta);
            const subtotal = cantidad * precio;
            total += subtotal;

            let producto;
            if (item.producto_id) {
                producto = await Producto.findById(item.producto_id);
                if (!producto) {
                    return res.status(400).json({ success: false, message: `Producto ${item.producto_id} no encontrado` });
                }
            } else {
                // Crear nuevo producto
                producto = new Producto({
                    nombre: item.nombre,
                    categoria: item.categoria,
                    descripcion: item.descripcion,
                    precio: precioVenta,
                    stock: 0,
                    activo: item.activo !== false
                });
                await producto.save();
            }

            detalles.push({
                producto: producto._id,
                cantidad,
                precio,
                subtotal
            });

            // Actualizar stock y precio de venta
            producto.stock += cantidad;
            producto.precio = precioVenta;
            await producto.save();
        }

        // Buscar último número de entrada
        const ultimaEntrada = await EntradaInventario.findOne().sort({ numero: -1 });
        const nuevoNumero = (ultimaEntrada && ultimaEntrada.numero) ? ultimaEntrada.numero + 1 : 1;

        const entrada = new EntradaInventario({
            numero: nuevoNumero,
            proveedor,
            documento: documento || '',
            observaciones: observaciones || '',
            usuario,
            total,
            detalles
        });

        await entrada.save();

        const accion = `REGISTRO UNA ENTRADA AL INVENTARIO ${entrada.numeroFactura()} (proveedor: ${proveedor})`;
        await Auditoria.create({ usuario, accion, modulo: "INVENTARIO" });
        await logger.escribirArchivo(accion, usuario, "INVENTARIO");

        return res.json({ success: true, message: `Entrada ${entrada.numeroFactura()} registrada correctamente.`, entrada_id: entrada._id });

    } catch (error) {
        console.error("Error registrando entrada:", error);
        return res.status(500).json({ success: false, message: "Error al registrar la entrada" });
    };
};

// Exportar entrada a PDF
exports.exportarEntradaPDF = async (req, res) => {
    try {
        const entrada = await EntradaInventario.findById(req.params.id).populate('detalles.producto').lean();
        if (!entrada) {
            return res.status(404).send("Entrada no encontrada");
        }

        res.render('inventario/entrada_pdf', { entrada, request: req });

    } catch (error) {
        console.error("Error generando PDF:", error);
        res.status(500).send("Error generando PDF: " + error.message);
    };
};