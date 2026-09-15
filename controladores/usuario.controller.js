const Usuario = require('../modelos/usuario.model');
const Auditoria = require('../modelos/auditoria.model');

// Brute force simple en memoria (como Django cache)
const loginFails = new Map(); // ip -> {count, firstAt}
const MAX_INTENTOS = 5;
const VENTANA_MS = 5 * 60 * 1000;

function ipCliente(req){
    const xf = req.headers['x-forwarded-for'];
    if (xf) return xf.split(',')[0].trim();
    return req.ip || req.connection.remoteAddress || 'desconocido';
}
function checkLimit(req){
    const ip = ipCliente(req);
    const entry = loginFails.get(ip);
    if (!entry) return false;
    if (Date.now() - entry.firstAt > VENTANA_MS){
        loginFails.delete(ip);
        return false;
    }
    return entry.count >= MAX_INTENTOS;
}
function registerFail(req){
    const ip = ipCliente(req);
    let entry = loginFails.get(ip);
    if (!entry || Date.now() - entry.firstAt > VENTANA_MS){
        entry = { count: 1, firstAt: Date.now() };
    } else {
        entry.count += 1;
    }
    loginFails.set(ip, entry);
    return entry.count;
}
function clearFails(req){
    loginFails.delete(ipCliente(req));
}

function pushMessage(req, text, tags='info'){
    if (!req.session.messages) req.session.messages = [];
    // Formato compatible con Django messages + Node viejo {type,text}
    req.session.messages.push({ text, tags, type: tags });
}
function consumeMessages(req){
    const msgs = req.session.messages || [];
    req.session.messages = [];
    return msgs;
}

// Render login con mensajes
exports.login_view = async (req, res) => {
    if (req.method === 'GET') {
        if (req.session.logueado) return res.redirect('/inicio');
        const msgs = consumeMessages(req);
        return res.render('usuarios/login', { request: req, messages: msgs });
    }
    // POST
    if (checkLimit(req)){
        pushMessage(req, 'Demasiados intentos fallidos. Intenta de nuevo en unos minutos.', 'error');
        req.session.logueado = null;
        return res.redirect('/login');
    }
    // Django usa correo + clave, Node viejo usa nombre+contra => soportar ambos
    const correoRaw = (req.body.correo || req.body.email || req.body.nombre || '').trim().toLowerCase();
    const contraRaw = req.body.clave || req.body.contra || req.body.password || '';

    if (!correoRaw || !contraRaw){
        pushMessage(req, 'Ingrese su correo y contraseña.', 'error');
        return res.redirect('/login');
    }

    try {
        // Compatibilidad: DB vieja sin correo/documento. Buscar por correo O nombre (insensible a mayúsculas)
        const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const reExact = new RegExp('^' + escapeRegExp(correoRaw) + '$', 'i');
        let usuario = null;
        // Búsqueda flexible: correo exacto, correo case-insensitive, nombre exacto, nombre case-insensitive
        usuario = await Usuario.findOne({
            $or: [
                { correo: correoRaw },
                { correo: reExact },
                { nombre: correoRaw },
                { nombre: reExact }
            ]
        });
        // Fallback adicional: si tiene @ intentar solo correo lower, si no solo nombre
        if (!usuario) {
            if (correoRaw.includes('@')) {
                usuario = await Usuario.findOne({ correo: reExact });
            } else {
                usuario = await Usuario.findOne({ nombre: reExact });
            }
        }
        if (!usuario){
            registerFail(req);
            pushMessage(req, 'Usuario o contraseña incorrecto', 'error');
            req.session.logueado = null;
            return res.redirect('/login');
        }

        const ok = await usuario.checkPassword(contraRaw);
        if (!ok){
            registerFail(req);
            pushMessage(req, 'Usuario o contraseña incorrecto', 'error');
            req.session.logueado = null;
            return res.redirect('/login');
        }

        // migrar legacy plain a hash ya hecho en check? pero si es plain, pre save hashea, forzamos save si needed
        const isHashed = usuario.contra.startsWith('$2a$') || usuario.contra.startsWith('$2b$');
        if (!isHashed){
            usuario.contra = contraRaw;
            await usuario.save();
        }

        if (!usuario.activo){
            registerFail(req);
            pushMessage(req, 'Tu usuario está inactivo. Comunícate con un administrador.', 'error');
            req.session.logueado = null;
            return res.redirect('/login');
        }

        clearFails(req);
        pushMessage(req, 'Bienvenido al sistema', 'success');
        req.session.logueado = {
            id: usuario._id.toString(),
            nombre: usuario.nombre,
            rol: usuario.cargo,
            correo: usuario.correo
        };
        // Limpiar mensajes de éxito para no mostrar doble? mantenemos
        // Auditoria login
        try {
            await Auditoria.create({ usuario: usuario.nombre, accion: 'INICIO SESION', modulo: 'USUARIOS' });
        } catch(e){}

        return res.redirect('/inicio');
    } catch (error){
        console.error('Error login:', error);
        pushMessage(req, 'No fue posible iniciar sesión.', 'error');
        return res.redirect('/login');
    }
};

// Alias for old route
exports.login = exports.login_view;

exports.logout_view = async (req, res) => {
    const logueado = req.session.logueado;
    if (logueado){
        try {
            await Auditoria.create({ usuario: logueado.nombre || '', accion: 'CERRO SESION', modulo: 'USUARIOS' });
        } catch(e){}
    }
    req.session.destroy(() => {
        res.redirect('/login');
    });
};

// Listado usuarios con búsqueda q (como Django)
exports.usuarios = async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        let filtro = {};
        if (q){
            const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filtro = { $or: [{ nombre: re }, { cargo: re }, { telefono: re }, { correo: re }, { documento: re }] };
        }
        const usuarios = await Usuario.find(filtro).sort({ createdAt: -1 }).lean();
        // Para compatibilidad plantilla espera variable 'user' y 'usuarios'
        const msgs = consumeMessages(req);
        return res.render('usuarios/usuarios', {
            user: usuarios,
            usuarios,
            q,
            request: req,
            messages: msgs
        });
    } catch (err){
        console.error('Error listando usuarios', err);
        const msgs = consumeMessages(req);
        return res.render('usuarios/usuarios', { user: [], usuarios: [], q: '', request: req, messages: msgs });
    }
};

// Mostrar formulario crear
exports.vistaCrear = async (req, res) => {
    const msgs = consumeMessages(req);
    // si no logueado, permitir igual visual sin validar rol (modo visual)
    return res.render('usuarios/crear_usuarios', { request: req, messages: msgs, formErrors: null, formData: {} });
};

exports.crear_usuarios = async (req, res) => {
    try {
        const { nombre, documento, correo, contra, clave, telefono, cargo, fecha_inicio } = req.body;
        const pwd = contra || clave;
        // Validación mínima visual (no estricta)
        if (!nombre || !documento || !correo || !pwd || !telefono){
            pushMessage(req, 'Falta información obligatoria para crear el usuario.', 'error');
            const msgs = consumeMessages(req);
            return res.status(400).render('usuarios/crear_usuarios', {
                request: req,
                messages: msgs,
                formErrors: { general: 'Campos obligatorios faltantes' },
                formData: req.body
            });
        }
        // Verificar duplicados simples
        const existsCorreo = await Usuario.findOne({ correo: correo.trim().toLowerCase() });
        if (existsCorreo){
            pushMessage(req, 'Este correo electrónico ya está registrado en el sistema.', 'error');
            const msgs = consumeMessages(req);
            return res.render('usuarios/crear_usuarios', { request: req, messages: msgs, formErrors: null, formData: req.body });
        }
        const existsDoc = await Usuario.findOne({ documento: documento.trim() });
        if (existsDoc){
            pushMessage(req, 'Este documento ya está registrado en el sistema.', 'error');
            const msgs = consumeMessages(req);
            return res.render('usuarios/crear_usuarios', { request: req, messages: msgs, formErrors: null, formData: req.body });
        }
        const existsTel = await Usuario.findOne({ telefono: telefono.trim() });
        if (existsTel){
            pushMessage(req, 'Este número de teléfono ya está registrado en el sistema.', 'error');
            const msgs = consumeMessages(req);
            return res.render('usuarios/crear_usuarios', { request: req, messages: msgs, formErrors: null, formData: req.body });
        }

        const nuevo = new Usuario({
            nombre: nombre.trim(),
            documento: documento.trim(),
            correo: correo.trim().toLowerCase(),
            contra: pwd,
            telefono: telefono.trim(),
            cargo: cargo || 'Empleado',
            fecha_inicio: fecha_inicio || null,
            activo: true
        });
        // Impedir crear SuperAdmin si no es SuperAdmin logueado (simple)
        if (nuevo.cargo === 'SuperAdmin'){
            const log = req.session.logueado;
            if (!log || log.rol !== 'SuperAdmin'){
                // For visual mode, permitir pero degradar a Admin
                // Para fidelidad Django, bloquear
                pushMessage(req, 'Un Administrador no puede asignar el rol de SuperAdmin.', 'error');
                const msgs = consumeMessages(req);
                return res.render('usuarios/crear_usuarios', { request: req, messages: msgs, formErrors: null, formData: req.body });
            }
        }

        await nuevo.save();
        try {
            const actor = req.session.logueado ? req.session.logueado.nombre : 'sistema';
            await Auditoria.create({ usuario: actor, accion: `CREO USUARIO: ${nuevo.nombre}`, modulo: 'USUARIOS' });
        } catch(e){}
        pushMessage(req, `Usuario ${nuevo.nombre} creado correctamente.`, 'success');
        return res.redirect('/usuarios');
    } catch (error){
        console.error('Error creando usuario', error);
        let msg = error.message;
        if (error.code === 11000){
            msg = 'Documento, correo o teléfono duplicado.';
        }
        pushMessage(req, msg, 'error');
        const msgs = consumeMessages(req);
        return res.render('usuarios/crear_usuarios', { request: req, messages: msgs, formErrors: null, formData: req.body });
    }
};

// Editar usuario (GET muestra form, POST guarda)
exports.editar_usuarios = async (req, res) => {
    const id = req.params.id;
    try {
        const usuario = await Usuario.findById(id);
        if (!usuario){
            pushMessage(req, 'Usuario no encontrado', 'error');
            return res.redirect('/usuarios');
        }

        if (req.method === 'GET'){
            const msgs = consumeMessages(req);
            return res.render('usuarios/editar_usuarios', {
                usuario,
                form: usuario, // compatibilidad Django form.instance
                request: req,
                messages: msgs,
                formErrors: null
            });
        }

        // POST: actualizar
        const { nombre, documento, correo, contra, clave, telefono, cargo, fecha_inicio } = req.body;
        const pwd = contra || clave;

        // Preservar documento no editable (Django lo muestra como readonly)
        // Pero mantenemos el existente si intentan cambiar
        let nuevoCargo = cargo || usuario.cargo;
        const logueado = req.session.logueado || {};
        const esPropio = logueado.id === usuario._id.toString();
        const rolActual = logueado.rol || 'Empleado';

        // Reglas fieles simplificadas visual: Empleado solo puede editar su propio perfil, Admin no toca SuperAdmin, etc.
        // Para modo visual permitimos todo, pero si quieres fidelidad descomentar:
        // if (usuario.es_superadmin_principal && usuario._id.toString() !== logueado.id){ ... }

        // No permitir auto-escalar a SuperAdmin si no es SuperAdmin
        if (nuevoCargo === 'SuperAdmin' && usuario.cargo !== 'SuperAdmin' && rolActual !== 'SuperAdmin' && !esPropio){
            pushMessage(req, 'Un Administrador no puede asignar el rol de SuperAdmin.', 'error');
            const msgs = consumeMessages(req);
            return res.render('usuarios/editar_usuarios', { usuario, form: usuario, request: req, messages: msgs, formErrors: null });
        }

        // Si es propio usuario o Empleado, no puede cambiar cargo
        if (esPropio || rolActual === 'Empleado'){
            nuevoCargo = usuario.cargo;
        }
        // SuperAdmin principal siempre conserva rol y activo
        if (usuario.es_superadmin_principal){
            nuevoCargo = 'SuperAdmin';
        }

        usuario.nombre = nombre ? nombre.trim() : usuario.nombre;
        // documento readonly
        usuario.correo = correo ? correo.trim().toLowerCase() : usuario.correo;
        usuario.telefono = telefono ? telefono.trim() : usuario.telefono;
        usuario.cargo = nuevoCargo;
        if (fecha_inicio) usuario.fecha_inicio = fecha_inicio;
        // contra opcional
        if (pwd && pwd.trim() !== ''){
            usuario.contra = pwd;
        }
        // activo no se toca desde editar (solo via cambiar_estado)

        await usuario.save();

        // actualizar session nombre si es propio
        if (esPropio){
            req.session.logueado.nombre = usuario.nombre;
        }

        try {
            const actor = logueado.nombre || 'sistema';
            await Auditoria.create({ usuario: actor, accion: `ACTUALIZÓ PERFIL/USUARIO: ${usuario.nombre}`, modulo: 'USUARIOS' });
        } catch(e){}

        pushMessage(req, `El usuario ${usuario.nombre} fue actualizado correctamente.`, 'success');
        if (rolActual === 'Empleado') return res.redirect('/inicio');
        return res.redirect('/usuarios');
    } catch (error){
        console.error('Error editando usuario', error);
        pushMessage(req, 'Error al actualizar usuario: ' + error.message, 'error');
        return res.redirect('/usuarios');
    }
};

// Legacy POST /usuarios/editar con body.id (mantener compatibilidad)
exports.editar_usuarios_post = async (req, res) => {
    const id = req.body.id;
    if (!id) {
        pushMessage(req, 'ID de usuario no proporcionado', 'error');
        return res.redirect('/usuarios');
    }
    req.params.id = id;
    // Reusar lógica pero adaptada
    try {
        const usuario = await Usuario.findById(id);
        if (!usuario) {
            pushMessage(req, 'Usuario no encontrado', 'error');
            return res.redirect('/usuarios');
        }
        const { nombre, contra, clave, telefono, cargo, activo } = req.body;
        const pwd = contra || clave;
        usuario.nombre = nombre || usuario.nombre;
        usuario.telefono = telefono || usuario.telefono;
        if (cargo) usuario.cargo = cargo;
        if (pwd) usuario.contra = pwd;
        if (activo !== undefined) usuario.activo = activo === 'on' || activo === true || activo === 'true';
        await usuario.save();
        pushMessage(req, `Usuario ${usuario.nombre} actualizado.`, 'success');
        return res.redirect('/usuarios');
    } catch (err){
        pushMessage(req, 'Error al actualizar usuario: ' + err.message, 'error');
        return res.redirect('/usuarios');
    }
};

exports.cambiar_estado_usuario = async (req, res) => {
    const id = req.params.id;
    try {
        const usuario = await Usuario.findById(id);
        if (!usuario){
            pushMessage(req, 'Usuario no encontrado', 'error');
            return res.redirect('/usuarios');
        }
        const logueado = req.session.logueado;
        if (!logueado){
            pushMessage(req, 'Debe iniciar sesión.', 'error');
            return res.redirect('/login');
        }
        const actor = await Usuario.findById(logueado.id);
        if (!actor){
            pushMessage(req, 'Sesión inválida.', 'error');
            return res.redirect('/login');
        }
        const rolActual = actor.cargo;
        const idLogueado = actor._id.toString();

        if (usuario._id.toString() === idLogueado){
            pushMessage(req, 'No puedes desactivar tu propio usuario.', 'error');
            return res.redirect('/usuarios');
        }
        if (usuario.es_superadmin_principal || usuario.cargo === 'SuperAdmin'){
            pushMessage(req, 'El SuperAdmin no puede ser desactivado.', 'error');
            return res.redirect('/usuarios');
        }
        if (rolActual === 'Admin' && usuario.cargo === 'Admin'){
            pushMessage(req, 'Un Admin no puede desactivar a otro Admin.', 'error');
            return res.redirect('/usuarios');
        }
        if (rolActual === 'Empleado'){
            pushMessage(req, 'No tienes permiso para cambiar el estado de los usuarios.', 'error');
            return res.redirect('/usuarios');
        }

        usuario.activo = !usuario.activo;
        await usuario.save();
        const estado = usuario.activo ? 'ACTIVO' : 'INACTIVO';
        try {
            await Auditoria.create({ usuario: actor.nombre, accion: `CAMBIO ESTADO USUARIO: ${usuario.nombre} → ${estado}`, modulo: 'USUARIOS' });
        } catch(e){}
        if (usuario.activo){
            pushMessage(req, `El usuario ${usuario.nombre} ahora está activo.`, 'success');
        } else {
            pushMessage(req, `El usuario ${usuario.nombre} ahora está inactivo.`, 'error');
        }
        return res.redirect('/usuarios');
    } catch (error){
        console.error('Error cambiando estado', error);
        pushMessage(req, 'Error al cambiar estado: ' + error.message, 'error');
        return res.redirect('/usuarios');
    }
};

// ============ COMPATIBILIDAD CON CONTROLADOR ANTIGUO (Node viejo) ============
exports.home = async (req, res) => res.redirect('/inicio');
exports.find = exports.usuarios;
exports.findOne = async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.params.id);
        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
        if (req.accepts && req.accepts('html')) return res.render('usuarios/editar_usuarios', { usuario, form: usuario, request: req });
        res.status(200).json(usuario);
    } catch (error){
        res.status(500).json({ error: error.message });
    }
};
exports.insertOne = exports.crear_usuarios;
exports.findOneAndUpdate = exports.editar_usuarios_post;
exports.findOneAndDelete = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).send('ID de usuario no proporcionado');
        await Usuario.findByIdAndDelete(id);
        res.redirect('/usuarios');
    } catch (error){
        console.error("Error al eliminar usuario:", error);
        res.status(500).send("Ocurrió un error al intentar eliminar el usuario");
    }
};
exports.formulario = exports.vistaCrear;
