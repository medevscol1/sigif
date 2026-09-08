const Usuario = require('../modelos/usuario.model'); // Importa el modelo de Usuario para operaciones en la base de datos

// exports.home: muestra la página principal del sistema SIGIF
exports.home = async (req, res) => {
  res.render('dashboard_index');
};

// exports.find: lista todos los usuarios y devuelve el resultado en HTML o JSON según el tipo de petición
exports.find = async (req, res) => {
  try {
    const usuarios = await Usuario.find(); // Busca todos los usuarios en MongoDB
    if (req.accepts && req.accepts('html')) {
      return res.render('usuarios/usuarios', { usuarios, request: req });
    }
    return res.json(usuarios); // Devuelve la lista como JSON para peticiones API
  } catch (error) {
    res.status(500).json({ error: error.message }); // Devuelve error 500 si falla la consulta
  }
};

// exports.findOne: busca un usuario por su ID recibido en la ruta y devuelve sus datos
exports.findOne = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id); // Busca por ID usando el parámetro de ruta
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' }); // Devuelve 404 si el usuario no existe
    }
    // Render edit page if HTML requested
    if (req.accepts && req.accepts('html')) {
      return res.render('usuarios/editar_usuarios', { usuario, request: req });
    }
    res.status(200).json(usuario); // Devuelve el usuario encontrado
  } catch (error) {
    res.status(500).json({ error: error.message }); // Devuelve error 500 si ocurre un fallo
  }
};

// exports.insertOne: crea y guarda un nuevo usuario con los datos enviados en el cuerpo de la petición
exports.insertOne = async (req, res) => {
  try {
    const nuevoUsuario = new Usuario({
      nombre: req.body.nombre,
      contra: req.body.contra,
      telefono: req.body.telefono,
      activo: req.body.activo === 'on' || req.body.activo === true,
      cargo: req.body.cargo || 'Empleado'
    });
    await nuevoUsuario.save();
    // if HTML form submit, redirect
    if (req.accepts && req.accepts('html')) return res.redirect('/usuarios');
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    res.status(400).json({ error: error.message }); // Devuelve error 400 si los datos son inválidos
  }
};

// exports.findOneAndUpdate: actualiza un usuario existente según el ID enviado en el cuerpo y redirige a la lista
exports.findOneAndUpdate = async (req, res) => {
  try {
    const { id, nombre, contra, telefono, cargo, activo } = req.body; // Lee los datos del formulario
    await Usuario.findByIdAndUpdate(id, {
      nombre,
      contra,
      telefono: telefono || null,
      cargo,
      activo: activo === 'on' || activo === true
    });
    res.redirect('/usuarios');
  } catch (error) {
    res.status(500).send("Error al actualizar usuario: " + error.message); // Devuelve error 500 si falla la actualización
  }
};

// exports.findOneAndDelete: elimina un usuario por su ID recibido en el cuerpo y redirige al listado
exports.findOneAndDelete = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).send('ID de usuario no proporcionado');
    await Usuario.findByIdAndDelete(id);
    res.redirect('/usuarios');
  } catch (error) {
    console.error("Error al eliminar usuario:", error); // Registra el error en consola
    res.status(500).send("Ocurrió un error al intentar eliminar el usuario"); // Devuelve error 500 si hay falla
  }
};

// exports.formulario: muestra el formulario para registrar un nuevo usuario
exports.formulario = async (req, res) => {
  res.render('usuarios/crear_usuarios');
};