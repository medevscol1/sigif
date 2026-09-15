const Factura = require('../modelos/factura.model');
const Cliente = require('../modelos/cliente.model');
const Producto = require('../modelos/producto.model');

// Datos iniciales para sembrar si la base de datos no tiene facturas
const FACTURAS_SEMILLA = [
    {
        numero: 58,
        fecha: new Date('2026-09-11T15:54:00'),
        cliente: { nombre: 'Daniel Moya', correo: 'dmoya1873@gmail.com' },
        vendedor: 'medevs',
        baseGravable: 84,
        ivaPorcentaje: 19,
        iva: 16,
        productos: [{ nombre: 'Test', cantidad: 1, precio: 100, subtotal: 100 }],
        total: 100,
        tipo: 'salida'
    },
    {
        numero: 57,
        fecha: new Date('2026-09-11T15:53:00'),
        cliente: { nombre: 'Consumidor Final', correo: 'consumidorfinal@pos.com' },
        vendedor: 'carlos',
        baseGravable: 294118,
        ivaPorcentaje: 19,
        iva: 55882,
        productos: [{ nombre: 'Llanta Delantera 130/70/17 Sellomátic', cantidad: 1, precio: 350000, subtotal: 350000 }],
        total: 350000,
        tipo: 'salida'
    },
    {
        numero: 56,
        fecha: new Date('2026-09-11T15:52:00'),
        cliente: { nombre: 'Consumidor Final', correo: 'consumidorfinal@pos.com' },
        vendedor: 'carlos',
        baseGravable: 294118,
        ivaPorcentaje: 19,
        iva: 55882,
        productos: [{ nombre: 'Llanta Delantera 130/70/17 Sellomátic', cantidad: 1, precio: 350000, subtotal: 350000 }],
        total: 350000,
        tipo: 'salida'
    },
    {
        numero: 55,
        fecha: new Date('2026-09-03T15:57:00'),
        cliente: { nombre: 'Consumidor Final', correo: 'consumidorfinal@pos.com' },
        vendedor: 'medevs',
        baseGravable: 43697,
        ivaPorcentaje: 19,
        iva: 8303,
        productos: [{ nombre: 'Aceite Motul 4T 20W50', cantidad: 1, precio: 52000, subtotal: 52000 }],
        total: 52000,
        tipo: 'salida'
    },
    {
        numero: 54,
        fecha: new Date('2026-09-03T14:30:00'),
        cliente: { nombre: 'Daniel Moya', correo: 'dmoya1873@gmail.com' },
        vendedor: 'medevs',
        baseGravable: 533613,
        ivaPorcentaje: 19,
        iva: 101387,
        productos: [{ nombre: 'Kit de Arrastre + Llantas', cantidad: 1, precio: 635000, subtotal: 635000 }],
        total: 635000,
        tipo: 'salida'
    },
    {
        numero: 53,
        fecha: new Date('2026-08-25T16:00:00'),
        cliente: { nombre: 'Taller Los Pits', correo: 'lospits@mototaller.com' },
        vendedor: 'carlos',
        baseGravable: 1554622,
        ivaPorcentaje: 19,
        iva: 295378,
        productos: [{ nombre: 'Lote Repuestos y Accesorios', cantidad: 1, precio: 1850000, subtotal: 1850000 }],
        total: 1850000,
        tipo: 'salida'
    },
    {
        numero: 52,
        fecha: new Date('2026-08-24T11:20:00'),
        cliente: { nombre: 'Andres Machado', correo: 'machado@sigif.co' },
        vendedor: 'medevs',
        baseGravable: 184874,
        ivaPorcentaje: 19,
        iva: 35126,
        productos: [{ nombre: 'Pastillas de Freno Delanteras', cantidad: 2, precio: 110000, subtotal: 220000 }],
        total: 220000,
        tipo: 'salida'
    },
    {
        numero: 51,
        fecha: new Date('2026-08-20T17:15:00'),
        cliente: { nombre: 'Moto Servicio Express', correo: 'motoservicio@gmail.com' },
        vendedor: 'carlos',
        baseGravable: 403361,
        ivaPorcentaje: 19,
        iva: 76639,
        productos: [{ nombre: 'Batería Gel 12V 7Ah', cantidad: 2, precio: 240000, subtotal: 480000 }],
        total: 480000,
        tipo: 'salida'
    },
    {
        numero: 50,
        fecha: new Date('2026-08-18T10:05:00'),
        cliente: { nombre: 'Consumidor Final', correo: 'consumidorfinal@pos.com' },
        vendedor: 'medevs',
        baseGravable: 75630,
        ivaPorcentaje: 19,
        iva: 14370,
        productos: [{ nombre: 'Filtro de Aire K&N', cantidad: 1, precio: 90000, subtotal: 90000 }],
        total: 90000,
        tipo: 'salida'
    },
    {
        numero: 49,
        fecha: new Date('2026-08-15T16:45:00'),
        cliente: { nombre: 'Juan Esteban Ruiz', correo: 'jruiz@correo.com' },
        vendedor: 'carlos',
        baseGravable: 268908,
        ivaPorcentaje: 19,
        iva: 51092,
        productos: [{ nombre: 'Cadena Reforzada O-Ring 520', cantidad: 1, precio: 320000, subtotal: 320000 }],
        total: 320000,
        tipo: 'salida'
    },
    {
        numero: 48,
        fecha: new Date('2026-08-12T13:10:00'),
        cliente: { nombre: 'Consumidor Final', correo: 'consumidorfinal@pos.com' },
        vendedor: 'medevs',
        baseGravable: 37815,
        ivaPorcentaje: 19,
        iva: 7185,
        productos: [{ nombre: 'Bujía Iridium NGK', cantidad: 1, precio: 45000, subtotal: 45000 }],
        total: 45000,
        tipo: 'salida'
    },
    {
        numero: 47,
        fecha: new Date('2026-08-10T09:30:00'),
        cliente: { nombre: 'Distribuidora Motos del Valle', correo: 'ventas@distrimotos.com' },
        vendedor: 'carlos',
        baseGravable: 1176471,
        ivaPorcentaje: 19,
        iva: 223529,
        productos: [{ nombre: 'Cubiertas Traseras 140/70/17', cantidad: 4, precio: 350000, subtotal: 1400000 }],
        total: 1400000,
        tipo: 'salida'
    },
    {
        numero: 46,
        fecha: new Date('2026-08-08T18:20:00'),
        cliente: { nombre: 'Consumidor Final', correo: 'consumidorfinal@pos.com' },
        vendedor: 'medevs',
        baseGravable: 63025,
        ivaPorcentaje: 19,
        iva: 11975,
        productos: [{ nombre: 'Guantes de Protección Cuero', cantidad: 1, precio: 75000, subtotal: 75000 }],
        total: 75000,
        tipo: 'salida'
    },
    {
        numero: 45,
        fecha: new Date('2026-08-05T14:40:00'),
        cliente: { nombre: 'Daniel Moya', correo: 'dmoya1873@gmail.com' },
        vendedor: 'medevs',
        baseGravable: 151261,
        ivaPorcentaje: 19,
        iva: 28739,
        productos: [{ nombre: 'Casco Integral Certificado DOT', cantidad: 1, precio: 180000, subtotal: 180000 }],
        total: 180000,
        tipo: 'salida'
    },
    {
        numero: 44,
        fecha: new Date('2026-08-03T11:15:00'),
        cliente: { nombre: 'Consumidor Final', correo: 'consumidorfinal@pos.com' },
        vendedor: 'carlos',
        baseGravable: 210084,
        ivaPorcentaje: 19,
        iva: 39916,
        productos: [{ nombre: 'Manillar ProTaper + Puños', cantidad: 1, precio: 250000, subtotal: 250000 }],
        total: 250000,
        tipo: 'salida'
    },
    {
        numero: 43,
        fecha: new Date('2026-08-01T15:00:00'),
        cliente: { nombre: 'Moto Club Ruta 40', correo: 'contacto@ruta40.org' },
        vendedor: 'medevs',
        baseGravable: 478992,
        ivaPorcentaje: 19,
        iva: 91008,
        productos: [{ nombre: 'Juego de Espejos Retrovisores', cantidad: 6, precio: 95000, subtotal: 570000 }],
        total: 570000,
        tipo: 'salida'
    },
    {
        numero: 42,
        fecha: new Date('2026-07-28T16:30:00'),
        cliente: { nombre: 'Consumidor Final', correo: 'consumidorfinal@pos.com' },
        vendedor: 'carlos',
        baseGravable: 105042,
        ivaPorcentaje: 19,
        iva: 19958,
        productos: [{ nombre: 'Líquido de Frenos Dot 4 + Mantenimiento', cantidad: 1, precio: 125000, subtotal: 125000 }],
        total: 125000,
        tipo: 'salida'
    },
    {
        numero: 41,
        fecha: new Date('2026-07-25T12:00:00'),
        cliente: { nombre: 'Consumidor Final', correo: 'consumidorfinal@pos.com' },
        vendedor: 'medevs',
        baseGravable: 88235,
        ivaPorcentaje: 19,
        iva: 16765,
        productos: [{ nombre: 'Luces Exploradoras LED Cree', cantidad: 1, precio: 105000, subtotal: 105000 }],
        total: 105000,
        tipo: 'salida'
    },
    {
        numero: 40,
        fecha: new Date('2026-07-20T10:10:00'),
        cliente: { nombre: 'Carlos Andrés Meza', correo: 'cmeza@gmail.com' },
        vendedor: 'carlos',
        baseGravable: 243697,
        ivaPorcentaje: 19,
        iva: 46303,
        productos: [{ nombre: 'Amortiguador Trasero Monoshock', cantidad: 1, precio: 290000, subtotal: 290000 }],
        total: 290000,
        tipo: 'salida'
    },
    {
        numero: 39,
        fecha: new Date('2026-07-15T14:20:00'),
        cliente: { nombre: 'Consumidor Final', correo: 'consumidorfinal@pos.com' },
        vendedor: 'medevs',
        baseGravable: 58824,
        ivaPorcentaje: 19,
        iva: 11176,
        productos: [{ nombre: 'Kit Limpieza de Cadena y Lubricante', cantidad: 1, precio: 70000, subtotal: 70000 }],
        total: 70000,
        tipo: 'salida'
    }
];

// Función para verificar y sembrar datos si la colección está vacía
async function sembrarFacturasSiVacio() {
    try {
        const total = await Factura.countDocuments();
        if (total === 0) {
            await Factura.insertMany(FACTURAS_SEMILLA);
            console.log('Facturas de demostración sembradas exitosamente.');
        }
    } catch (err) {
        console.error('Error al sembrar facturas:', err);
    }
}

// Vista principal de facturación (Facturas de salidas)
exports.facturacion = async (req, res) => {
    try {
        await sembrarFacturasSiVacio();

        const facturas = await Factura.find({ tipo: 'salida' })
            .sort({ numero: -1, fecha: -1 })
            .lean();

        const clientes = await Cliente.find().lean();
        const productos = await Producto.find({ activo: true }).lean();

        res.render('facturacion/facturacion', {
            facturas,
            totalFacturas: facturas.length,
            clientes,
            productos,
            activeTab: 'salidas',
            request: req
        });
    } catch (error) {
        console.error("Error al cargar facturación:", error);
        res.status(500).send("Error al cargar facturación: " + error.message);
    }
};

// Facturas de entradas
exports.facturasEntrada = async (req, res) => {
    try {
        const facturas = await Factura.find({ tipo: 'entrada' })
            .sort({ numero: -1, fecha: -1 })
            .lean();

        res.render('facturacion/facturas_entrada', {
            facturas,
            totalFacturas: facturas.length,
            activeTab: 'entradas',
            request: req
        });
    } catch (error) {
        console.error("Error al cargar facturas de entrada:", error);
        res.status(500).send("Error al cargar facturas de entrada: " + error.message);
    }
};

// Registro de entradas
exports.registroEntradas = async (req, res) => {
    try {
        const productos = await Producto.find().lean();
        res.render('facturacion/registro_entradas', {
            productos,
            activeTab: 'registro_entradas',
            request: req
        });
    } catch (error) {
        console.error("Error al cargar registro de entradas:", error);
        res.status(500).send("Error: " + error.message);
    }
};

// Clientes
exports.clientes = async (req, res) => {
    try {
        const clientes = await Cliente.find().lean();
        res.render('facturacion/cliente', {
            clientes,
            activeTab: 'clientes',
            request: req
        });
    } catch (error) {
        console.error("Error al cargar clientes:", error);
        res.status(500).send("Error al cargar clientes: " + error.message);
    }
};

// Productos facturación
exports.productos = async (req, res) => {
    try {
        const productos = await Producto.find({ activo: true }).lean();
        res.render('facturacion/productos_facturacion', {
            productos,
            activeTab: 'productos',
            request: req
        });
    } catch (error) {
        console.error("Error al cargar productos para facturación:", error);
        res.status(500).send("Error al cargar productos: " + error.message);
    }
};

// Descargar/Imprimir Factura en PDF
exports.descargarPDF = async (req, res) => {
    try {
        const id = req.params.id;
        let factura;

        // Buscar por ObjectId o por número de factura
        if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
            factura = await Factura.findById(id).lean();
        } else if (!isNaN(Number(id))) {
            factura = await Factura.findOne({ numero: Number(id) }).lean();
        }

        if (!factura) {
            return res.status(404).send('Factura no encontrada');
        }

        res.render('facturacion/factura_imprimir', {
            factura,
            request: req
        });
    } catch (error) {
        console.error("Error al generar PDF de factura:", error);
        res.status(500).send("Error al generar PDF: " + error.message);
    }
};

// Crear nueva factura
exports.crearFactura = async (req, res) => {
    try {
        const {
            clienteNombre,
            clienteCorreo,
            productoNombre,
            cantidad,
            precioUnitario,
            vendedor
        } = req.body;

        // Obtener el último número de factura
        const ultimaFactura = await Factura.findOne().sort({ numero: -1 });
        const nuevoNumero = ultimaFactura && ultimaFactura.numero ? ultimaFactura.numero + 1 : 1;

        const cant = Number(cantidad) || 1;
        const precio = Number(precioUnitario) || 0;
        const total = cant * precio;

        // Cálculo de IVA 19% y base gravable
        const ivaPorcentaje = 19;
        const baseGravable = Math.round(total / (1 + (ivaPorcentaje / 100)));
        const iva = total - baseGravable;

        const nuevaFactura = new Factura({
            numero: nuevoNumero,
            fecha: new Date(),
            cliente: {
                nombre: clienteNombre || 'Consumidor Final',
                correo: clienteCorreo || 'consumidorfinal@pos.com'
            },
            vendedor: vendedor || 'medevs',
            baseGravable,
            ivaPorcentaje,
            iva,
            productos: [{
                nombre: productoNombre || 'Producto General',
                cantidad: cant,
                precio: precio,
                subtotal: total
            }],
            total,
            tipo: 'salida',
            estado: 'pagada'
        });

        await nuevaFactura.save();

        res.redirect('/facturacion');
    } catch (error) {
        console.error("Error al crear factura:", error);
        res.status(500).send("Error al crear factura: " + error.message);
    }
};