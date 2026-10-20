const EmpresaConfig = require('../modelos/configuracion.model');
const Usuario = require('../modelos/usuario.model');
const Auditoria = require('../modelos/auditoria.model');
const logger = require('../services/logs');

function getUsuario(req) {
    return (req.session && req.session.logueado && req.session.logueado.nombre) ? req.session.logueado.nombre : 'Sistema';
}

function limpiarTexto(valor, maximo) {
    valor = (valor || '').trim();
    valor = valor.replace('<', '').replace('>', '');
    if (valor.length > maximo) valor = valor.substring(0, maximo);
    return valor;
}

// Configuración de la empresa
exports.configuracion = async (req, res) => {
    try {
        let config = await EmpresaConfig.findOne();
        if (!config) config = new EmpresaConfig();

        if (req.method === 'POST') {
            const usuario = getUsuario(req);
            const esAdmin = req.session.logueado && ['SuperAdmin', 'Admin'].includes(req.session.logueado.rol);

            if (req.user?.is_staff || esAdmin) {
                try {
                    if (req.body.nombre_comercial) {
                        config.nombre_comercial = limpiarTexto(req.body.nombre_comercial, 150);
                        config.nit = limpiarTexto(req.body.nit, 50);
                        config.direccion = limpiarTexto(req.body.direccion, 255);
                        if (!config.nombre_comercial) throw new Error('nombre_comercial requerido');
                    } else if (req.body.moneda) {
                        config.moneda = "COP ($) - Pesos Colombianos";
                        config.impuesto = limpiarTexto(req.body.impuesto, 10);
                        const correo = (req.body.correo_contacto || '').trim();
                        if (correo.length <= 100 && correo.includes('@')) {
                            config.correo_contacto = correo;
                        } else {
                            throw new Error('correo_contacto inválido');
                        }
                    }

                    await config.save();

                    await Auditoria.create({ usuario, accion: 'ACTUALIZÓ LA CONFIGURACIÓN DE LA EMPRESA', modulo: 'CONFIGURACION' });
                    await logger.escribirArchivo('ACTUALIZÓ LA CONFIGURACIÓN DE LA EMPRESA', usuario, 'CONFIGURACION');

                    req.session.messages = req.session.messages || [];
                    req.session.messages.push({ text: 'Configuración actualizada correctamente.', tags: 'success', type: 'success' });
                } catch (e) {
                    req.session.messages = req.session.messages || [];
                    req.session.messages.push({ text: 'Verifica los datos ingresados.', tags: 'error', type: 'error' });
                }
            }
        }

        res.render('configuracion/configuracion', { config, request: req });
    } catch (error) {
        console.error('Error en configuración:', error);
        res.status(500).send('Error: ' + error.message);
    };
};

// Backup y permisos (roles)
exports.backupypermisos = async (req, res) => {
    try {
        const usuarios = await Usuario.find().lean();

        if (req.method === 'POST') {
            const { user_id, rol_asignar } = req.body;
            const usuario = getUsuario(req);
            const actor = req.session.logueado ? await Usuario.findById(req.session.logueado.id).lean() : null;

            const cargosValidos = Usuario.schema.path('cargo').enumValues;
            if (!cargosValidos.includes(rol_asignar)) {
                req.session.messages = req.session.messages || [];
                req.session.messages.push({ text: 'Rol no válido.', tags: 'error', type: 'error' });
                return res.redirect('/configuracion/backup');
            }

            if (actor && actor.cargo !== 'SuperAdmin' && rol_asignar === 'SuperAdmin') {
                await Auditoria.create({ usuario: actor.nombre, accion: `INTENTO RECHAZADO DE ASIGNAR SUPERADMIN A USUARIO ${user_id}`, modulo: 'CONFIGURACION' });
                await logger.escribirArchivo(`INTENTO RECHAZADO DE ASIGNAR SUPERADMIN A USUARIO ${user_id}`, actor.nombre, 'CONFIGURACION');
                req.session.messages = req.session.messages || [];
                req.session.messages.push({ text: 'Solo SuperAdmin puede asignar SuperAdmin.', tags: 'error', type: 'error' });
                return res.redirect('/configuracion/backup');
            }

            try {
                const user = await Usuario.findById(user_id);
                if (!user) throw new Error('Usuario no encontrado');
                if (user.es_superadmin_principal) throw new Error('SuperAdmin principal no modificable');

                user.cargo = rol_asignar;
                await user.save();

                await Auditoria.create({ usuario, accion: `ACTUALIZÓ EL CARGO DE ${user.nombre}: ${rol_asignar}`, modulo: 'CONFIGURACION' });
                await logger.escribirArchivo(`ACTUALIZÓ EL CARGO DE ${user.nombre}: ${rol_asignar}`, usuario, 'CONFIGURACION');

                req.session.messages = req.session.messages || [];
                req.session.messages.push({ text: `Cargo de ${user.nombre} actualizado a ${user.cargo}.`, tags: 'success', type: 'success' });
            } catch (e) {
                req.session.messages = req.session.messages || [];
                req.session.messages.push({ text: e.message, tags: 'error', type: 'error' });
            }
            return res.redirect('/configuracion/backup');
        }

        res.render('configuracion/backupypermisos', { usuarios, request: req });
    } catch (error) {
        console.error('Error en backup/permisos:', error);
        res.status(500).send('Error: ' + error.message);
    };
};