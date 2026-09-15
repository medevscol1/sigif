require("dotenv").config();

const express = require("express");
const session = require("express-session");
const conexion = require("./configuracion/connectiondb");
const path = require('path');
const Usuario = require('./modelos/usuario.model');
const Producto = require('./modelos/producto.model');
const Auditoria = require('./modelos/auditoria.model');
const Factura = require('./modelos/factura.model');
const productoController = require('./controladores/producto.controller');
const usuarioController = require('./controladores/usuario.controller');
const dashboardController = require('./controladores/dashboard.controller');

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

// Middleware para exponer request, messages, logueado a las plantillas (fiel a base.html)
app.use((req, res, next) => {
    // request para compatibilidad {{ request.session.logueado }}
    res.locals.request = req;
    req.session.logueado = req.session.logueado || null;
    // mensajes flash simple (array)
    if (!req.session.messages) req.session.messages = [];
    res.locals.messages = req.session.messages;
    // limpiar después de exponer? se limpia al leer en siguiente req; lo hacemos via helper
    // Valores por defecto dashboard
    res.locals.total = 0;
    res.locals.to = 0;
    res.locals.low_stock = 0;
    res.locals.out_of_stock = 0;
    res.locals.ventas_totales = 0;
    res.locals.actividades_recientes = [];
    res.locals.endpoints = [];
    res.locals.q = '';
    next();
});

// Helper para consumir mensajes (usado en controllers redirect)
app.use((req, res, next) => {
    const originalRedirect = res.redirect.bind(res);
    res.redirect = function(...args) {
        // mensajes persisten hasta render, no limpiar aquí
        return originalRedirect(...args);
    };
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
    return res.render('usuarios/login', { request: req, messages: req.session.messages || [] });
});
app.get("/login", (req, res) => {
    if (req.session.logueado) return res.redirect('/inicio');
    return res.render('usuarios/login', { request: req, messages: req.session.messages || [] });
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
        const productos = await Producto.find().lean();
        return res.render('productos/productos', { productos, request: req });
    } catch (err) {
        console.error('Error listando productos', err);
        return res.render('productos/productos', { request: req });
    }
});
app.get('/productos/crear', productoController.vistaCrearProducto);
app.post('/productos/crear', productoController.crearProducto);
app.get('/productos/editar/:id', productoController.vistaActualizarProducto);
app.post('/productos/editar/:id', productoController.actualizarProducto);
app.post('/productos/eliminar/:id', productoController.eliminarProducto);
app.get('/configuracion', (req, res) => res.render('configuracion/configuracion'));
app.get('/configuracion/backup', (req, res) => res.render('configuracion/backupypermisos'));
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
app.get('/facturacion', (req, res) => res.render('facturacion/facturacion'));
app.get('/facturacion/cliente', (req, res) => res.render('facturacion/cliente'));
app.get('/facturacion/productos', async (req, res) => {
    try {
        const productos = await Producto.find().lean();
        return res.render('facturacion/productos_facturacion', { productos, request: req });
    } catch (err) {
        console.error('Error cargando productos para facturación:', err);
        return res.render('facturacion/productos_facturacion', { productos: [], request: req });
    }
});
app.get('/facturacion/entradas', (req, res) => res.render('facturacion/registro_entradas'));
app.get('/facturacion/pago', (req, res) => res.render('facturacion/pago'));
app.get('/facturas', (req, res) => res.render('facturacion/facturas_entrada'));
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
