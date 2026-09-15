const Usuario = require('../modelos/usuario.model');
const Producto = require('../modelos/producto.model');
const Factura = require('../modelos/factura.model');
const Auditoria = require('../modelos/auditoria.model');

// Fiel a apps/dashboard/views.py
exports.index = async (req, res) => {
    try {
        const total = await Usuario.countDocuments();
        const to = await Producto.countDocuments();
        const productosActivos = { activo: true };
        // Usar count con filtro activo como Django
        const low_stock = await Producto.countDocuments({ activo: true, stock: { $gt: 0, $lt: 5 } });
        const out_of_stock = await Producto.countDocuments({ activo: true, stock: 0 });

        // Ventas del mes (Factura total sum desde inicio mes)
        const ahora = new Date();
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);

        let ventas_totales = 0;
        try {
            const agg = await Factura.aggregate([
                { $match: { fecha: { $gte: inicioMes } } },
                { $group: { _id: null, total: { $sum: "$total" } } }
            ]);
            ventas_totales = agg[0] ? agg[0].total : 0;
        } catch (e) {
            // fallback si Factura no existe o tipo decimal
            console.error('Error agregando ventas', e);
            ventas_totales = 0;
        }

        const actividades_recientes = await Auditoria.find().sort({ fecha: -1 }).limit(4).lean();

        // Mensajes flash
        const messages = req.session.messages || [];
        req.session.messages = [];

        return res.render('dashboard_index', {
            total,
            to,
            low_stock,
            out_of_stock,
            ventas_totales,
            actividades_recientes,
            request: req,
            messages
        });
    } catch (error) {
        console.error("Error al cargar el dashboard:", error);
        const messages = req.session.messages || [];
        req.session.messages = [];
        return res.status(500).render('dashboard_index', {
            request: req,
            messages,
            total: 0,
            to: 0,
            low_stock: 0,
            out_of_stock: 0,
            ventas_totales: 0,
            actividades_recientes: []
        });
    }
};

// Alias para compatibilidad
exports.dashboard = exports.index;
