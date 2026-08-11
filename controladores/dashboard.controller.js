const Producto = require('../models/producto.model');

// Mostrar dashboard
exports.dashboard = async (req, res) => {
    try {

        // Cantidad total de productos
        const total = await Producto.countDocuments();

        // Cantidad de productos con stock bajo
        const low_stock_count = await Producto.countDocuments({
            stock: { $lte: 5 },
            activo: true
        });

        
        // Renderizar dashboard
        res.render('pages/dashboard/index', {
            total,
            low_stock_count,
            sales_this_month,
            messages
        });

    } catch (error) {
        console.error("Error al cargar el dashboard:", error);

        res.status(500).send(
            "Error al cargar el dashboard: " + error.message
        );
    }
};