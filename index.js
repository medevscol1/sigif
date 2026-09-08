require("dotenv").config(); // Carga variables de entorno desde el archivo .env

const express = require("express"); // Importa Express para crear el servidor HTTP
const conexion = require("./configuracion/connectiondb"); // Importa la conexión a MongoDB
const path = require('path');
const Usuario = require('./modelos/usuario.model');
const Producto = require('./modelos/producto.model');
const Auditoria = require('./modelos/auditoria.model');
const Venta = require('./modelos/venta.model');
const Factura = require('./modelos/factura.model');
const productoController = require('./controladores/producto.controller');
const usuarioController = require('./controladores/usuario.controller');

const app = express(); // Crea la instancia de la aplicación Express

app.use(express.json()); // Habilita el parseo de JSON en el cuerpo de las peticiones
app.use(express.urlencoded({ extended: true }));

// Views y motor de plantillas EJS
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Valores por defecto para evitar ReferenceError en las plantillas
app.use((req, res, next) => {
    res.locals.request = req;
    res.locals.total = 0;
    res.locals.to = 0;
    res.locals.low_stock = 0;
    res.locals.out_of_stock = 0;
    res.locals.ventas_totales = 0;
    res.locals.actividades_recientes = [];
    res.locals.messages = [];
    res.locals.endpoints = [];
    next();
});

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

// Servir archivos estáticos desde /static
app.use('/static', express.static(path.join(__dirname, 'static')));

// Ruta raíz: responde con un mensaje indicando que el servidor está activo
app.get("/", (req, res) => {
    // Mostrar la página de login como índice
    try {
        res.render('usuarios/login', { request: req });
    } catch (err) {
        res.send("Servidor SIGIF funcionando");
    }
});

// Rutas para navegar entre vistas convertidas
app.get('/dashboard', async (req, res) => {
    try {
        const total = await Usuario.countDocuments();
        const to = await Producto.countDocuments();
        const low_stock = await Producto.countDocuments({ stock: { $gt: 0, $lt: 5 } });
        const out_of_stock = await Producto.countDocuments({ stock: { $lte: 0 } });
        const ventas = await Venta.find().sort({ fecha: -1 }).limit(10).lean();
        const ventas_totales = await Venta.aggregate([
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]).then(r => (r[0] ? r[0].total : 0));
        const actividades_recientes = await Auditoria.find().sort({ fecha: -1 }).limit(10).lean();

        return res.render('dashboard_index', {
            total,
            to,
            low_stock,
            out_of_stock,
            ventas_totales,
            actividades_recientes,
            request: req
        });
    } catch (err) {
        console.error('Error cargando dashboard:', err);
        return res.render('dashboard_index', { request: req });
    }
});
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
// Productos - formularios y acciones
app.get('/productos/crear', productoController.vistaCrearProducto);
app.post('/productos/crear', productoController.crearProducto);
app.get('/productos/editar/:id', productoController.vistaActualizarProducto);
app.post('/productos/editar/:id', productoController.actualizarProducto);
app.post('/productos/eliminar/:id', productoController.eliminarProducto);
app.get('/productos/crear', (req, res) => res.render('productos/crear_productos'));
app.get('/productos/editar/:id', (req, res) => res.render('productos/actualizar_productos', { id: req.params.id }));
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
app.get('/usuarios', async (req, res) => {
    try {
        const usuarios = await Usuario.find().lean();
        return res.render('usuarios/usuarios', { usuarios, request: req });
    } catch (err) {
        console.error('Error listando usuarios', err);
        return res.render('usuarios/usuarios', { request: req });
    }
});
// Usuarios - formularios y acciones
app.get('/usuarios/crear', usuarioController.formulario);
app.post('/usuarios/crear', usuarioController.insertOne);
app.post('/usuarios/editar', usuarioController.findOneAndUpdate);
app.post('/usuarios/eliminar', usuarioController.findOneAndDelete);
app.get('/usuarios/crear', (req, res) => res.render('usuarios/crear_usuarios'));
app.get('/usuarios/editar/:id', usuarioController.findOne);
app.get('/login', (req, res) => res.render('usuarios/login'));
app.get('/logout', (req, res) => { /* implementar logout */ res.redirect('/login'); });

// Maneja el resultado de la promesa de conexión a MongoDB
conexion
    .then(() => {
        console.log("Conexion exitosa a MongoDB"); // Se ejecuta cuando la conexión es exitosa
    })
    .catch((error) => {
        console.log("Error conectando a MongoDB:"); // Se ejecuta cuando hay un error al conectar
        console.log(error);
    });

app.listen(1514, () => {
    console.log("Servidor conectado en puerto 1514"); // Inicia el servidor en el puerto 1514
});