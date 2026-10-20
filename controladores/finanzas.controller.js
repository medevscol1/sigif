const Gasto = require('../modelos/gasto.model');
const Factura = require('../modelos/factura.model');
const Producto = require('../modelos/producto.model');
const { DetalleEntradaInventario } = require('../modelos/entradaInventario.model');
const Auditoria = require('../modelos/auditoria.model');
const logger = require('../services/logs');

function getUsuario(req) {
    return (req.session && req.session.logueado && req.session.logueado.nombre) ? req.session.logueado.nombre : 'Sistema';
}

// Períodos como en Django
function _periodo(req) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const opcion = req.query.periodo || 'mes';
    let inicio, fin = new Date(hoy);
    fin.setHours(23, 59, 59, 999);

    if (opcion === 'hoy') {
        inicio = new Date(hoy);
    } else if (opcion === 'semana') {
        inicio = new Date(hoy);
        inicio.setDate(hoy.getDate() - hoy.getDay());
    } else if (opcion === 'ano') {
        inicio = new Date(hoy.getFullYear(), 0, 1);
    } else if (opcion === 'personalizado') {
        try {
            inicio = new Date(req.query.desde);
            fin = new Date(req.query.hasta);
            fin.setHours(23, 59, 59, 999);
        } catch (e) {
            inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        }
    } else {
        inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    }
    return { inicio, fin, opcion };
}

// Helper para calcular costos y rentabilidad
async function _resumen(inicio, fin) {
    const facturas = await Factura.find({
        fecha: { $gte: inicio, $lte: fin },
        tipo: 'salida'
    }).select('cliente vendedor total valorPagado metodoPago fecha').lean();

    const detalles = await Factura.aggregate([
        { $match: { fecha: { $gte: inicio, $lte: fin }, tipo: 'salida' } },
        { $unwind: '$productos' },
        { $project: {
            productoNombre: '$productos.nombre',
            cantidad: '$productos.cantidad',
            precio: '$productos.precio',
            subtotal: '$productos.subtotal',
            facturaFecha: '$fecha',
            facturaId: '$_id'
        }}
    ]);

    const gastos = await Gasto.find({ fecha: { $gte: inicio, $lte: fin } }).lean();

    // Calcular costos desde DetalleEntradaInventario
    let costos = 0;
    const productosMap = new Map();

    for (const det of detalles) {
        const compras = await DetalleEntradaInventario.find({ 'producto.nombre': det.productoNombre })
            .populate('entrada')
            .sort({ 'entrada.fecha': -1 })
            .lean();

        let costoUnitario = 0;
        for (const compra of compras) {
            if (compra.entrada && compra.entrada.fecha <= det.facturaFecha) {
                costoUnitario = compra.precio;
                break;
            }
        }
        if (!costoUnitario && compras.length > 0) {
            costoUnitario = compras[0].precio;
        }

        const subtotalCosto = costoUnitario * det.cantidad;
        costos += subtotalCosto;

        const key = det.productoNombre;
        if (!productosMap.has(key)) {
            productosMap.set(key, { producto: key, cantidad: 0, ingresos: 0, costos: 0 });
        }
        const item = productosMap.get(key);
        item.cantidad += det.cantidad;
        item.ingresos += det.subtotal;
        item.costos += subtotalCosto;
    }

    for (const item of productosMap.values()) {
        item.ganancia = item.ingresos - item.costos;
        item.margen = item.ingresos > 0 ? (item.ganancia / item.ingresos * 100) : 0;
    }

    const ingresos = facturas.reduce((sum, f) => sum + (Number(f.valorPagado) || Number(f.total) || 0), 0);
    const totalGastos = gastos.reduce((sum, g) => sum + (Number(g.valor) || 0), 0);
    const bruta = ingresos - costos;
    const neta = bruta - totalGastos;

    return {
        facturas, detalles, gastos,
        ingresos, costos, gastos_total: totalGastos,
        utilidad_bruta: bruta, utilidad_neta: neta,
        margen: ingresos > 0 ? (neta / ingresos * 100) : 0,
        ventas: facturas.length,
        ticket: facturas.length > 0 ? ingresos / facturas.length : 0,
        productos: Array.from(productosMap.values())
    };
}

// 1. Dashboard - Estado de resultados (P&G)
exports.dashboard = async (req, res) => {
    try {
        const { inicio, fin, opcion } = _periodo(req);
        const data = await _resumen(inicio, fin);

        const gastosPorCategoria = await Gasto.aggregate([
            { $match: { fecha: { $gte: inicio, $lte: fin } } },
            { $group: { _id: '$categoria', total: { $sum: '$valor' } } },
            { $sort: { total: -1 } }
        ]);

        res.render('finanzas/dashboard', {
            ...data,
            inicio, fin, periodo: opcion,
            gastos_categoria: gastosPorCategoria,
            request: req
        });
    } catch (error) {
        console.error('Error en dashboard finanzas:', error);
        res.status(500).send('Error en dashboard: ' + error.message);
    };
};

// 2. Ventas por categoría
exports.ventasCategoria = async (req, res) => {
    try {
        const { inicio, fin, opcion } = _periodo(req);
        const data = await _resumen(inicio, fin);

        const catMap = new Map();
        const catFacturas = new Map();
        const catProductos = new Map();

        for (const det of data.detalles) {
            const prod = await Producto.findOne({ nombre: det.productoNombre }).lean();
            const cat = prod?.categoria || 'Repuestos Generales';

            if (!catMap.has(cat)) {
                catMap.set(cat, { categoria: cat, ingresos: 0, costos: 0, unidades: 0 });
                catFacturas.set(cat, new Set());
                catProductos.set(cat, new Set());
            }
            const entry = catMap.get(cat);
            entry.ingresos += det.subtotal;
            entry.unidades += det.cantidad;
            catFacturas.get(cat).add(String(det.facturaId));
            catProductos.get(cat).add(det.productoNombre);
        }

        // Calcular costos por categoría
        for (const [cat, entry] of catMap.entries()) {
            const items = data.productos.filter(p => {
                const prodCat = Producto.findOne({ nombre: p.producto }).lean(); // async issue - simplified
            });
            // Simplified: use data.productos which already has costos
            for (const p of data.productos) {
                const prod = await Producto.findOne({ nombre: p.producto }).lean();
                if (prod && (prod.categoria || 'Repuestos Generales') === cat) {
                    entry.costos += p.costos;
                }
            }
        }

        const categoriasResumen = [];
        for (const [cat, entry] of catMap.entries()) {
            const ganancia = entry.ingresos - entry.costos;
            const margen = entry.ingresos > 0 ? (ganancia / entry.ingresos * 100) : 0;
            categoriasResumen.push({
                categoria: cat,
                ingresos: entry.ingresos,
                costos: entry.costos,
                ganancia,
                margen,
                unidades: entry.unidades,
                transacciones: catFacturas.get(cat).size,
                total_skus: catProductos.get(cat).size
            });
        }

        categoriasResumen.sort((a, b) => b.ingresos - a.ingresos);

        res.render('finanzas/ventas_categoria', {
            inicio, fin, periodo: opcion,
            categorias_resumen: categoriasResumen,
            total_unidades: categoriasResumen.reduce((s, c) => s + c.unidades, 0),
            categoria_lider: categoriasResumen[0] || null,
            categoria_rentable: categoriasResumen.sort((a, b) => b.ganancia - a.ganancia)[0] || null,
            request: req
        });
    } catch (error) {
        console.error('Error en ventas por categoría:', error);
        res.status(500).send('Error: ' + error.message);
    };
};

// 3. Gastos operativos
exports.gastos = async (req, res) => {
    try {
        const { inicio, fin, opcion } = _periodo(req);
        const data = await _resumen(inicio, fin);

        let gastosQs = Gasto.find({ fecha: { $gte: inicio, $lte: fin } });
        if (req.query.categoria) gastosQs = gastosQs.find({ categoria: req.query.categoria });
        if (req.query.metodo_pago) gastosQs = gastosQs.find({ metodo_pago: req.query.metodo_pago });
        const gastos = await gastosQs.sort({ fecha: -1 }).lean();

        const gastosPorCategoria = await Gasto.aggregate([
            { $match: { fecha: { $gte: inicio, $lte: fin } } },
            { $group: { _id: '$categoria', total: { $sum: '$valor' }, cantidad: { $sum: 1 } } },
            { $sort: { total: -1 } }
        ]);

        const gastosEfectivo = await Gasto.aggregate([
            { $match: { fecha: { $gte: inicio, $lte: fin }, metodo_pago: 'EFECTIVO' } },
            { $group: { _id: null, total: { $sum: '$valor' } } }
        ]);

        const diasPeriodo = Math.max(Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)) + 1, 1);
        const promedioDiario = data.gastos_total / diasPeriodo;

        res.render('finanzas/gastos', {
            ...data,
            inicio, fin, periodo: opcion,
            gastos,
            gastos_por_categoria: gastosPorCategoria,
            categoria_mayor_gasto: gastosPorCategoria[0] || null,
            gastos_efectivo: gastosEfectivo[0]?.total || 0,
            gastos_bancos: data.gastos_total - (gastosEfectivo[0]?.total || 0),
            promedio_diario_gasto: promedioDiario,
            categorias_opciones: Gasto.schema.path('categoria').enumValues,
            metodos_opciones: Gasto.schema.path('metodo_pago').enumValues,
            filtro_categoria_actual: req.query.categoria || '',
            filtro_metodo_actual: req.query.metodo_pago || '',
            request: req
        });
    } catch (error) {
        console.error('Error en gastos:', error);
        res.status(500).send('Error: ' + error.message);
    };
};

// Crear/Editar gasto
exports.editarGasto = async (req, res) => {
    try {
        const { pk } = req.params;
        const usuario = getUsuario(req);

        if (req.method === 'GET') {
            const gasto = pk ? await Gasto.findById(pk).lean() : null;
            return res.render('finanzas/editar_gasto', {
                gasto,
                categorias_opciones: Gasto.schema.path('categoria').enumValues,
                metodos_opciones: Gasto.schema.path('metodo_pago').enumValues,
                request: req
            });
        }

        // POST
        const { concepto, categoria, valor, fecha, metodo_pago, proveedor, descripcion } = req.body;

        const campos = {
            concepto: concepto.trim(),
            categoria,
            valor: Number(valor),
            fecha: new Date(fecha),
            metodo_pago,
            proveedor: proveedor?.trim() || '',
            descripcion: descripcion?.trim() || '',
            usuario
        };

        let accion;
        if (pk) {
            await Gasto.findByIdAndUpdate(pk, campos);
            accion = 'ACTUALIZÓ';
        } else {
            await Gasto.create(campos);
            accion = 'REGISTRÓ';
        }

        await Auditoria.create({ usuario, accion: `${accion} GASTO: ${campos.concepto}`, modulo: 'FINANZAS' });
        await logger.escribirArchivo(`${accion} GASTO: ${campos.concepto}`, usuario, 'FINANZAS');

        res.redirect('/finanzas/gastos');
    } catch (error) {
        console.error('Error editando gasto:', error);
        res.status(500).send('Error: ' + error.message);
    };
};

// Eliminar gasto
exports.eliminarGasto = async (req, res) => {
    try {
        const { pk } = req.params;
        const usuario = getUsuario(req);

        const gasto = await Gasto.findById(pk);
        if (!gasto) return res.redirect('/finanzas/gastos');

        const nombre = gasto.concepto;
        await gasto.deleteOne();

        await Auditoria.create({ usuario, accion: `ELIMINÓ GASTO: ${nombre}`, modulo: 'FINANZAS' });
        await logger.escribirArchivo(`ELIMINÓ GASTO: ${nombre}`, usuario, 'FINANZAS');

        res.redirect('/finanzas/gastos');
    } catch (error) {
        console.error('Error eliminando gasto:', error);
        res.redirect('/finanzas/gastos');
    };
};

// 4. Rentabilidad
exports.rentabilidad = async (req, res) => {
    try {
        const { inicio, fin, opcion } = _periodo(req);
        const data = await _resumen(inicio, fin);

        for (const item of data.productos) {
            const prod = await Producto.findOne({ nombre: item.producto }).lean();
            const totalUnidades = (prod?.stock || 0) + item.cantidad;
            item.rotacion = totalUnidades > 0 ? (item.cantidad / totalUnidades * 100) : 0;
        }

        res.render('finanzas/rentabilidad', {
            ...data,
            inicio, fin, periodo: opcion,
            productos_rentabilidad: [...data.productos].sort((a, b) => b.ganancia - a.ganancia),
            mas_vendidos: [...data.productos].sort((a, b) => b.cantidad - a.cantidad).slice(0, 5),
            mayor_margen: [...data.productos].sort((a, b) => b.margen - a.margen).slice(0, 5),
            request: req
        });
    } catch (error) {
        console.error('Error en rentabilidad:', error);
        res.status(500).send('Error: ' + error.message);
    };
};

// 5. Caja y conciliación
exports.cajaConciliacion = async (req, res) => {
    try {
        const { inicio, fin, opcion } = _periodo(req);
        const data = await _resumen(inicio, fin);

        const EmpresaConfig = require('../modelos/configuracion.model');
        const configEmpresa = await EmpresaConfig.findOne().lean() || {};

        // Agrupar por fecha
        const diasCaja = new Map();
        let totalEfectivoVentas = 0, totalTarjetaVentas = 0, totalTransfVentas = 0, totalCreditoVentas = 0;
        let totalGastosEfectivo = 0, totalGastosOtros = 0;

        for (const fac of data.facturas) {
            const fDate = new Date(fac.fecha).toLocaleDateString('es-CO');
            if (!diasCaja.has(fDate)) {
                diasCaja.set(fDate, { fecha: fDate, ventas_efectivo: 0, ventas_tarjeta: 0, ventas_transferencia: 0, ventas_credito: 0, total_entradas: 0, gastos_efectivo: 0, gastos_otros: 0, total_salidas: 0, num_ventas: 0, num_gastos: 0 });
            }
            const entry = diasCaja.get(fDate);
            const valorPagado = Number(fac.valorPagado) || Number(fac.total) || 0;
            entry.total_entradas += valorPagado;
            entry.num_ventas++;
            if (fac.metodoPago === 'EFECTIVO') { entry.ventas_efectivo += valorPagado; totalEfectivoVentas += valorPagado; }
            else if (fac.metodoPago === 'TARJETA') { entry.ventas_tarjeta += valorPagado; totalTarjetaVentas += valorPagado; }
            else if (fac.metodoPago === 'TRANSFERENCIA') { entry.ventas_transferencia += valorPagado; totalTransfVentas += valorPagado; }
            else { entry.ventas_credito += valorPagado; totalCreditoVentas += valorPagado; }
        }

        for (const g of data.gastos) {
            const gDate = new Date(g.fecha).toLocaleDateString('es-CO');
            if (!diasCaja.has(gDate)) {
                diasCaja.set(gDate, { fecha: gDate, ventas_efectivo: 0, ventas_tarjeta: 0, ventas_transferencia: 0, ventas_credito: 0, total_entradas: 0, gastos_efectivo: 0, gastos_otros: 0, total_salidas: 0, num_ventas: 0, num_gastos: 0 });
            }
            const entry = diasCaja.get(gDate);
            entry.total_salidas += g.valor;
            entry.num_gastos++;
            if (g.metodo_pago === 'EFECTIVO') { entry.gastos_efectivo += g.valor; totalGastosEfectivo += g.valor; }
            else { entry.gastos_otros += g.valor; totalGastosOtros += g.valor; }
        }

        const cortesDiarios = Array.from(diasCaja.values())
            .map(e => ({ ...e, saldo_caja_efectivo: e.ventas_efectivo - e.gastos_efectivo, total_neto: e.total_entradas - e.total_salidas }))
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        const saldoEfectivoEnCaja = totalEfectivoVentas - totalGastosEfectivo;
        const cuentasPendientes = data.facturas.reduce((s, f) => s + (Number(f.total) - (Number(f.valorPagado) || 0)), 0);

        res.render('finanzas/caja_conciliacion', {
            ...data,
            inicio, fin, periodo: opcion,
            cortes_diarios: cortesDiarios,
            total_efectivo_ventas: totalEfectivoVentas,
            total_tarjeta_ventas: totalTarjetaVentas,
            total_transf_ventas: totalTransfVentas,
            total_credito_ventas: totalCreditoVentas,
            total_gastos_efectivo: totalGastosEfectivo,
            total_gastos_otros: totalGastosOtros,
            saldo_efectivo_en_caja: saldoEfectivoEnCaja,
            cuentas_pendientes: cuentasPendientes,
            config_empresa: configEmpresa,
            request: req
        });
    } catch (error) {
        console.error('Error en caja conciliación:', error);
        res.status(500).send('Error: ' + error.message);
    };
};