require("dotenv").config(); // Carga variables de entorno desde el archivo .env

const express = require("express"); // Importa Express para crear el servidor HTTP
const conexion = require("./configuracion/connectiondb"); // Importa la conexión a MongoDB
const path = require('path');

const app = express(); // Crea la instancia de la aplicación Express

app.use(express.json()); // Habilita el parseo de JSON en el cuerpo de las peticiones
app.use(express.urlencoded({ extended: true }));

// Views y motor de plantillas EJS
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Servir archivos estáticos desde /static
app.use(express.static(path.join(__dirname, 'static')));

// Ruta raíz: responde con un mensaje indicando que el servidor está activo
app.get("/", (req, res) => {
    // Renderiza la vista principal de la API si existe
    try {
        res.render('api/index', { request: req, endpoints: [] });
    } catch (err) {
        res.send("Servidor SIGIF funcionando");
    }
});

// Rutas para navegar entre vistas convertidas
app.get('/dashboard', (req, res) => res.render('dashboard_index', { request: req }));
app.get('/api', (req, res) => res.render('api/index', { endpoints: [] }));
app.get('/productos', (req, res) => res.render('productos/productos'));
app.get('/productos/crear', (req, res) => res.render('productos/crear_productos'));
app.get('/productos/editar/:id', (req, res) => res.render('productos/actualizar_productos', { id: req.params.id }));
app.get('/configuracion', (req, res) => res.render('configuracion/configuracion'));
app.get('/configuracion/backup', (req, res) => res.render('configuracion/backupypermisos'));
app.get('/inventario', (req, res) => res.render('inventario/inventario'));
app.get('/inventario/control', (req, res) => res.render('inventario/inv_control'));
app.get('/inventario/ingresos', (req, res) => res.render('inventario/inv_ingresos'));
app.get('/inventario/historial', (req, res) => res.render('inventario/inv_historial'));
app.get('/facturacion', (req, res) => res.render('facturacion/facturacion'));
app.get('/facturacion/cliente', (req, res) => res.render('facturacion/cliente'));
app.get('/facturacion/productos', (req, res) => res.render('facturacion/productos_facturacion'));
app.get('/facturacion/entradas', (req, res) => res.render('facturacion/registro_entradas'));
app.get('/facturacion/pago', (req, res) => res.render('facturacion/pago'));
app.get('/facturas', (req, res) => res.render('facturacion/facturas_entrada'));
app.get('/auditoria', (req, res) => res.render('auditoria/ver_registros'));
app.get('/usuarios', (req, res) => res.render('usuarios/usuarios'));
app.get('/usuarios/crear', (req, res) => res.render('usuarios/crear_usuarios'));
app.get('/usuarios/editar/:id', (req, res) => res.render('usuarios/editar_usuarios', { id: req.params.id }));
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