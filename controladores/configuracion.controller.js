const EmpresaConfig = require('../models/EmpresaConfig'); // revisa la ruta del modelo

// get y post : obtener o actualizar la informacion de la empresa
exports.configuracion = async (req, res) => {
    try {
        let config = await EmpresaConfig.findOne();

        // si no existe un registro inicial lo crea
        if (!config) {
            config = await EmpresaConfig.create({
                nombre_comercial: '',
                nit: '',
                direccion: '',
                moneda: '$',
                impuesto: 0,
                correo_contacto: ''
            });
        }

        // Si la petición es POST (procesar formulario)
        if (req.method === 'POST') {
            // Verificación equivalente a request.user.is_staff
            if (req.user && req.user.role === 'Admin') {
                const { nombre_comercial, nit, direccion, moneda, impuesto, correo_contacto } = req.body;

                // Sección 1: Datos Generales
                if (nombre_comercial !== undefined) {
                    config.nombre_comercial = nombre_comercial;
                    config.nit = nit;
                    config.direccion = direccion;
                }
                // Sección 2: Ajustes Comerciales
                else if (moneda !== undefined) {
                    config.moneda = moneda;
                    config.impuesto = impuesto;
                    config.correo_contacto = correo_contacto;
                }

                await config.save();
            }

            return res.redirect('/configuracion');
        }

        // Petición GET: Renderizar vista
        res.render('configuracion/configuracion', { config });
    } catch (error) {
        console.error('Error en configuracion:', error);
        res.status(500).send('Error interno del servidor');
    }
};

// GET: Vista de Backup y Permisos
exports.backupypermisos = async (req, res) => {
    try {
        res.render('configuracion/backupypermisos');
    } catch (error) {
        console.error('Error en backupypermisos:', error);
        res.status(500).send('Error interno del servidor');
    }
};
