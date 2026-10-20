require("dotenv").config();

const express = require("express");
const session = require("express-session");
const cron = require('node-cron');
const conexion = require("./configuracion/connectiondb");
const backup = require('./configuracion/backup');
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
const inventarioController = require('./controladores/inventario.controller');
const finanzasController = require('./controladores/finanzas.controller');
const configuracionController = require('./controladores/configuracion.controller');

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
    cookie: { maxAge: 1000 * 60 * 60 * 2 }
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
    try { return new Date(date).toLocaleString(locale, options); } catch (e) { return date; }
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

// Middleware para exponer request, messages, logueado a las plantillas
app.use((req, res, next) => {
    res.locals.request = req;
    req.session.logueado = req.session.logueado || null;
    if (!req.session.messages) req.session.messages = [];
    res.locals.messages = req.session.messages;
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

// Servir archivos estáticos
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/static', express.static(path.join(__dirname, 'sigif-final', 'static')));

// ============ RUTAS USUARIOS ============
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

app.get("/usuarios", usuarioController.usuarios);
app.get("/usuarios/", usuarioController.usuarios);
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
app.post("/usuarios/editar", usuarioController.editar_usuarios_post);

app.post("/cambiar_estado_usuario/:id", usuarioController.cambiar_estado_usuario);
app.post("/cambiar_estado_usuario/:id/", usuarioController.cambiar_estado_usuario);

// ============ DASHBOARD ============
app.get("/inicio", dashboardController.index);
app.get("/inicio/", dashboardController.index);
app.get("/dashboard", dashboardController.index);
app.get("/dashboard/", dashboardController.index);

// ============ PRODUCTOS ============
app.get('/productos', async (req, res) => {
    try {
        const productos = await Producto.find().sort({ fecha_creacion: -1 }).lean();
        const totalProductos = productos.length;
        const activos = productos.filter(p => p.activo).length;
        const inactivos = productos.filter(p => !p.activo).length;
        const stockBajo = productos.filter(p => Number(p.stock || 0) > 0 && Number(p.stock || 0) < 5).length;
        return res.render('productos/productos', { productos, totalProductos, activos, inactivos, stockBajo, request: req });
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

// ============ INVENTARIO ============
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
app.get('/inventario/historial', async (req, res) => {
    try {
        const productos = await Producto.find().lean();
        return res.render('inventario/inv_historial', { productos, request: req });
    } catch (err) {
        console.error('Error cargando historial:', err);
        return res.render('inventario/inv_historial', { productos: [], request: req });
    }
});
app.get('/inventario/ingresos', inventarioController.ingresos);
app.post('/inventario/registrar-entrada', inventarioController.registrarEntrada);
app.get('/inventario/entrada/pdf/:id', inventarioController.exportarEntradaPDF);

// ============ FACTURACION ============
app.get('/facturacion', facturacionController.facturacion);
app.get('/facturacion/entradas', facturacionController.facturasEntrada);
app.get('/facturacion/registro', facturacionController.registroEntradas);
app.get('/facturacion/clientes', facturacionController.clientes);
app.get('/facturacion/productos', facturacionController.productos);
app.get('/facturacion/factura/pdf/:id', facturacionController.descargarPDF);
app.post('/facturacion/crear', facturacionController.crearFactura);
app.post('/facturacion/entradas', facturacionController.registrarEntrada);
app.get('/facturacion/pago', (req, res) => res.render('facturacion/pago', { request: req }));

// ============ FINANZAS ============
app.get('/finanzas', finanzasController.dashboard);
app.get('/finanzas/dashboard', finanzasController.dashboard);
app.get('/finanzas/ventas-categoria', finanzasController.ventasCategoria);
app.get('/finanzas/ingresos', finanzasController.ventasCategoria);
app.get('/finanzas/gastos', finanzasController.gastos);
app.get('/finanzas/gastos/nuevo', finanzasController.editarGasto);
app.get('/finanzas/gastos/editar/:pk', finanzasController.editarGasto);
app.post('/finanzas/gastos/nuevo', finanzasController.editarGasto);
app.post('/finanzas/gastos/editar/:pk', finanzasController.editarGasto);
app.post('/finanzas/gastos/eliminar/:pk', finanzasController.eliminarGasto);
app.get('/finanzas/rentabilidad', finanzasController.rentabilidad);
app.get('/finanzas/caja-conciliacion', finanzasController.cajaConciliacion);
app.get('/finanzas/reportes', finanzasController.cajaConciliacion);

// ============ CONFIGURACION ============
app.get('/configuracion', (req, res) => {
    res.redirect('/configuracion/backup');
});
app.get('/configuracion/backup', configuracionController.backupypermisos);
app.post('/configuracion', (req, res) => {
    res.redirect('/configuracion/backup');
});
app.post('/configuracion/backup', configuracionController.backupypermisos);

// ============ AUDITORIA ============
app.get('/auditoria', async (req, res) => {
    try {
        const registros = await Auditoria.find().sort({ fecha: -1 }).lean();
        return res.render('auditoria/ver_registros', { registros, request: req });
    } catch (err) {
        console.error('Error cargando auditoria:', err);
        return res.render('auditoria/ver_registros', { registros: [], request: req });
    }
});

// Handler 404
app.use((req, res) => {
    res.status(404).send('404 - No encontrado: ' + req.originalUrl);
});

const PORT = process.env.PORT || 1514;
const backupSettings = backup.getBackupSettings();

if (backupSettings.enabled) {
    cron.schedule(backupSettings.schedule, async () => {
        console.log('Realizando backup programado de la base de datos');
        try { await backup.backupDatabase(); }
        catch (error) { console.error('Error al realizar el backup programado:', error); }
    }, { timezone: backupSettings.timezone, noOverlap: true });
    console.log(`Backup automático activo con cron: ${backupSettings.schedule} (${backupSettings.timezone})`);
} else {
    console.log('Backup automático desactivado por BACKUP_ENABLED=false');
}

conexion
    .then(() => { console.log("Conexion exitosa a MongoDB"); })
    .catch((error) => { console.log("Error conectando a MongoDB:"); console.log(error); });

app.listen(PORT, () => { console.log(`Servidor conectado en http://localhost:${PORT}`); });