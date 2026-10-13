require("dotenv").config(); // Carga variables de entorno desde el archivo .env

const express = require("express");
const session = require("express-session");
const conexion = require("./configuracion/connectiondb");
const path = require('path');
const Usuario = require('./modelos/usuario.model');
const Producto = require('./modelos/producto.model');
const Auditoria = require('./modelos/auditoria.model');
const Venta = require('./modelos/venta.model');
const Factura = require('./modelos/factura.model');
const Cliente = require('./modelos/cliente.model');
const Entrada = require('./modelos/entrada.model');
const productoController = require('./controladores/producto.controller');
const usuarioController = require('./controladores/usuario.controller');
const dashboardController = require('./controladores/dashboard.controller');
const facturacionController = require('./controladores/facturacion.controller');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Views y motor de plantillas EJS
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Sesión (fiel a Django request.session.logueado)
app.use(session({
    secret: process.env.SESSION_SECRET || 'sigif-secret-dev',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 2 } // 2 horas
}));

// Helpers similares a filtros de Django
app.locals.floatformat = (value, digits = 0) => {
    if (value == null) return '';
    const num = Number(value);
    if (isNaN(num)) return value;
    return num.toFixed(digits);
};
app.locals.intcomma = (value) => {
    if (value == null) return '';
    return Number(value).toLocaleString('en-US');
};
app.locals.pluralize = (count, singular = '', plural = 's') => {
    return (Number(count) === 1) ? singular : plural;
};
app.locals.dateFormat = (date, locale = 'es-ES', options = {}) => {
    if (!date) return '';
    try {
        return new Date(date).toLocaleString(locale, options);
    } catch (e) {
        return date;
    }
};

app.locals.formatoPrecio = (value) => {
    if (value === null || value === undefined || value === '') return '$0';

    let numero = value;
    if (typeof value === 'object' && value !== null && typeof value.toString === 'function') {
        const texto = value.toString();
        const match = texto.match(/-?\d+(?:[.,]\d+)?/);
        numero = match ? match[0].replace('.', '').replace(',', '.') : 0;
    }

    const parsed = Number(numero);
    if (Number.isNaN(parsed)) return '$0';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(parsed);
};

// Middleware para exponer request, messages, logueado a las plantillas (fiel a base.html)
app.use((req, res, next) => {
    // request para compatibilidad {{ request.session.logueado }}
    res.locals.request = req;
    req.session.logueado = req.session.logueado || null;
    // mensajes flash simple (array)
    if (!req.session.messages) req.session.messages = [];
    res.locals.messages = req.session.messages;
    // Valores por defecto para evitar ReferenceError en las plantillas
    res.locals.total = 0;
    res.locals.to = 0;
    res.locals.low_stock = 0;
    res.locals.out_of_stock = 0;
    res.locals.ventas_totales = 0;
    res.locals.actividades_recientes = [];
    res.locals.endpoints = [];
    res.locals.q = '';
    res.locals.facturas = [];
    res.locals.productosVendidos = [];
    res.locals.clientesFacturacion = [];
    res.locals.entradas = [];
    res.locals.registrosEntradas = [];
    next();
});

// Servir archivos estáticos desde /static
// Intenta servir desde /static de Node y fallback a sigif-final/static
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/static', express.static(path.join(__dirname, 'sigif-final', 'static')));

// ============ RUTAS USUARIOS (fieles a Django apps/usuarios/urls.py) ============
// Login en raiz
app.get("/", (req, res) => {
    if (req.session.logueado) return res.redirect('/inicio');
    const msgs = req.session.messages || [];
    req.session.messages = [];
    return res.render('usuarios/login', { request: req, messages: msgs });
});
app.get("/login", (req, res) => {
    if (req.session.logueado) return res.redirect('/inicio');
    const msgs = req.session.messages || [];
    req.session.messages = [];
    return res.render('usuarios/login', { request: req, messages: msgs });
});
app.post("/", usuarioController.login_view);
app.post("/login", usuarioController.login_view);
app.get("/logout", usuarioController.logout_view);
app.get("/logout/", usuarioController.logout_view);

// Usuarios CRUD
app.get("/usuarios", usuarioController.usuarios);
app.get("/usuarios/", usuarioController.usuarios);
// compat Node old /usuarios/crear vs Django /crear_usuarios/
app.get("/crear_usuarios", usuarioController.vistaCrear);
app.get("/crear_usuarios/", usuarioController.vistaCrear);
app.get("/usuarios/crear", usuarioController.vistaCrear);
app.post("/crear_usuarios", usuarioController.crear_usuarios);
app.post("/crear_usuarios/", usuarioController.crear_usuarios);
app.post("/usuarios/crear", usuarioController.crear_usuarios);

app.get("/editar_usuarios/:id", usuarioController.editar_usuarios);
app.get("/editar_usuarios/:id/", usuarioController.editar_usuarios);
app.get("/usuarios/editar/:id", usuarioController.editar_usuarios);
app.post("/editar_usuarios/:id", usuarioController.editar_usuarios);
app.post("/editar_usuarios/:id/", usuarioController.editar_usuarios);
app.post("/usuarios/editar", usuarioController.editar_usuarios_post); // legacy form

app.post("/cambiar_estado_usuario/:id", usuarioController.cambiar_estado_usuario);
app.post("/cambiar_estado_usuario/:id/", usuarioController.cambiar_estado_usuario);

// ============ DASHBOARD (fiel a apps/dashboard/views.py) ============
app.get("/inicio", dashboardController.index);
app.get("/inicio/", dashboardController.index);
app.get("/dashboard", dashboardController.index);
app.get("/dashboard/", dashboardController.index);

// ============ OTRAS RUTAS (no modificar otros modulos, mantener compatibles) ============
app.get('/api', (req, res) => res.render('api/index', { endpoints: [] }));
app.get('/productos', async (req, res) => {
    try {
        const productos = await Producto.find().sort({ fecha_creacion: -1 }).lean();
        const totalProductos = productos.length;
        const activos = productos.filter(p => p.activo).length;
        const inactivos = productos.filter(p => !p.activo).length;
        const stockBajo = productos.filter(p => Number(p.stock || 0) > 0 && Number(p.stock || 0) < 5).length;

        return res.render('productos/productos', {
            productos,
            totalProductos,
            activos,
            inactivos,
            stockBajo,
            request: req
        });
    } catch (err) {
        console.error('Error listando productos', err);
        return res.render('productos/productos', { productos: [], request: req });
    }
});
app.get('/productos/crear', productoController.vistaCrearProducto);
app.post('/productos/crear', productoController.crearProducto);
app.get('/productos/editar/:id', productoController.vistaActualizarProducto);
app.post('/productos/editar/:id', productoController.actualizarProducto);
app.post('/productos/toggle/:id', productoController.toggleProducto);
app.post('/productos/eliminar/:id', productoController.eliminarProducto);
app.get('/configuracion', (req, res) => res.render('configuracion/configuracion'));
app.get('/configuracion/backup', (req, res) => res.render('configuracion/backupypermisos'));
app.get('/finanzas', (req, res) => res.render('finanzas/finanzas', { request: req }));
app.get('/inventario', async (req, res) => {
    try {
        const productos = await Producto.find().lean();
        return res.render('inventario/inventario', { productos, request: req });
    } catch (err) {
        console.error('Error cargando inventario:', err);
        return res.render('inventario/inventario', { productos: [], request: req });
    }
});
app.get('/inventario/control', async (req, res) => {
    try {
        const productos = await Producto.find().lean();
        return res.render('inventario/inv_control', { productos, request: req });
    } catch (err) {
        console.error('Error cargando control de inventario:', err);
        return res.render('inventario/inv_control', { productos: [], request: req });
    }
});
app.get('/inventario/ingresos', (req, res) => res.render('inventario/inv_ingresos', { request: req }));
app.get('/inventario/historial', (req, res) => res.render('inventario/inv_historial', { request: req }));
app.get('/facturacion', async (req, res) => {
    try {
        const facturas = await Factura.find().populate('cliente').sort({ fecha: -1 }).lean();
        return res.render('facturacion/facturacion', { facturas, request: req });
    } catch (err) {
        console.error('Error cargando facturación:', err);
        return res.render('facturacion/facturacion', {
            facturas: [], request: req,
            messages: ['No fue posible cargar las facturas en este momento.']
        });
    }
});
app.get('/facturacion/factura/:id', async (req, res) => {
    try {
        const factura = await Factura.findById(req.params.id).populate('cliente').lean();
        if (!factura) return res.status(404).send('Factura no encontrada');
        return res.render('facturacion/factura_print', { factura, request: req });
    } catch (err) {
        return res.status(404).send('Factura no encontrada');
    }
});
app.get('/facturacion/cliente', async (req, res) => {
    try {
        const [clientes, facturas] = await Promise.all([
            Cliente.find().lean(),
            Factura.find().sort({ fecha: -1 }).lean()
        ]);
        const facturasPorCliente = new Map();
        facturas.forEach(factura => {
            const clienteId = factura.cliente ? String(factura.cliente) : '';
            if (!clienteId) return;
            const historial = facturasPorCliente.get(clienteId) || [];
            historial.push(factura);
            facturasPorCliente.set(clienteId, historial);
        });
        const clientesFacturacion = clientes.map(cliente => {
            const historial = facturasPorCliente.get(String(cliente._id)) || [];
            return {
                cliente,
                facturas: historial,
                totalCompras: historial.reduce((total, factura) => total + (Number(factura.total) || 0), 0),
                ultimaCompra: historial[0] || null
            };
        }).sort((a, b) => b.totalCompras - a.totalCompras);
        return res.render('facturacion/cliente', { clientesFacturacion, request: req });
    } catch (err) {
        console.error('Error cargando clientes de facturación:', err);
        return res.render('facturacion/cliente', { clientesFacturacion: [], request: req });
    }
});
app.get('/facturacion/productos', async (req, res) => {
    try {
        const [productos, ventas] = await Promise.all([
            Producto.find().lean(),
            Venta.find().populate('productos.producto').sort({ fecha: -1 }).lean()
        ]);
        const resumen = new Map();

        ventas.forEach(venta => {
            (venta.productos || []).forEach(item => {
                const producto = item.producto;
                const productoId = producto && producto._id ? String(producto._id) : String(producto || '');
                if (!productoId) return;
                const cantidad = Number(item.cantidad) || 0;
                const precio = Number(item.precio || (producto && producto.precio)) || 0;
                const actual = resumen.get(productoId) || {
                    producto: producto || productos.find(p => String(p._id) === productoId),
                    ventas: 0, unidades: 0, ingresos: 0, movimientos: []
                };
                actual.ventas += 1;
                actual.unidades += cantidad;
                actual.ingresos += cantidad * precio;
                actual.movimientos.push({
                    id: String(venta._id).slice(-6).toUpperCase(),
                    fecha: venta.fecha,
                    cantidad,
                    total: cantidad * precio
                });
                resumen.set(productoId, actual);
            });
        });

        const productosVendidos = Array.from(resumen.values())
            .filter(item => item.producto)
            .sort((a, b) => b.ingresos - a.ingresos);
        return res.render('facturacion/productos_facturacion', { productosVendidos, request: req });
    } catch (err) {
        console.error('Error cargando productos para facturación:', err);
        return res.render('facturacion/productos_facturacion', { productosVendidos: [], request: req });
    }
});
app.get('/facturacion/entradas', async (req, res) => {
    try {
        const [entradas, productos] = await Promise.all([
            Entrada.find().populate('productos.producto').sort({ fecha: -1 }).lean(),
            Producto.find({ activo: true }).sort({ nombre: 1 }).lean()
        ]);
        const registrosEntradas = entradas.flatMap(entrada => (entrada.productos || []).map(item => ({
            entrada,
            producto: item.producto,
            cantidad: item.cantidad,
            precio: item.precio,
            subtotal: Number(item.cantidad || 0) * Number(item.precio || 0)
        })));
        return res.render('facturacion/registro_entradas', { entradas, productos, registrosEntradas, request: req });
    } catch (err) {
        console.error('Error cargando registro de entradas:', err);
        return res.render('facturacion/registro_entradas', { entradas: [], productos: [], registrosEntradas: [], request: req });
    }
});
app.post('/facturacion/entradas', async (req, res) => {
    try {
        const { numero, proveedor, registro, fecha, producto, cantidad, precio } = req.body;
        const unidades = Number(cantidad);
        const precioUnitario = Number(precio);
        if (!numero || !proveedor || !producto || !Number.isFinite(unidades) || unidades < 1 || !Number.isFinite(precioUnitario) || precioUnitario < 0) {
            return res.redirect('/facturacion/entradas?error=datos');
        }
        await Entrada.create({
            numero, proveedor, registro: registro || 'Sistema', fecha: fecha || Date.now(),
            productos: [{ producto, cantidad: unidades, precio: precioUnitario }],
            total: unidades * precioUnitario
        });
        await Producto.findByIdAndUpdate(producto, { $inc: { stock: unidades } });
        return res.redirect('/facturacion/entradas');
    } catch (err) {
        console.error('Error registrando entrada:', err);
        return res.redirect('/facturacion/entradas?error=servidor');
    }
});
app.get('/facturacion/pago', (req, res) => res.render('facturacion/pago', { request: req }));
app.get('/facturas', async (req, res) => {
    try {
        const entradas = await Entrada.find().populate('productos.producto').sort({ fecha: -1 }).lean();
        return res.render('facturacion/facturas_entrada', { entradas, request: req });
    } catch (err) {
        console.error('Error cargando facturas de entrada:', err);
        return res.render('facturacion/facturas_entrada', { entradas: [], request: req });
    }
});
app.get('/auditoria', async (req, res) => {
    try {
        const registros = await Auditoria.find().sort({ fecha: -1 }).lean();
        return res.render('auditoria/ver_registros', { registros, request: req });
    } catch (err) {
        console.error('Error cargando auditoria:', err);
        return res.render('auditoria/ver_registros', { registros: [], request: req });
    }
});

// Handler 404 simple
app.use((req, res) => {
    res.status(404).send('404 - No encontrado: ' + req.originalUrl);
});

const PORT = process.env.PORT || 1514;

conexion
    .then(() => {
        console.log("Conexion exitosa a MongoDB");
    })
    .catch((error) => {
        console.log("Error conectando a MongoDB:");
        console.log(error);
    });

app.listen(PORT, () => {
    console.log(`Servidor conectado en http://localhost:${PORT}`);
});