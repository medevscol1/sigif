const Usuario = require('../models/usuario.model'); // Importa el modelo de Usuario para operaciones en la base de datos

// Muestra la página principal del sistema
exports.home = async (req, res) => {
  res.render('pages/index');
};

// Lista todos los usuarios y responde con HTML o JSON según la petición
exports.find = async (req, res) => {
  try {
    const usuarios = await Usuario.find(); // Busca todos los usuarios en MongoDB
    if (req.accepts && req.accepts('html')) {
      return res.render('pages/listadousuarios', { usuarios }); // Renderiza la vista HTML si se acepta
    }
    return res.json(usuarios); // Responde con JSON si la petición no es HTML
  } catch (error) {
    res.status(500).json({ error: error.message }); // Maneja errores del servidor
  }
};

// Busca un usuario por su ID y devuelve sus datos o un error 404
exports.findOne = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id); // Busca por ID usando el parámetro de ruta
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' }); // Usuario no existe
    }
    res.status(200).json(usuario); // Devuelve el usuario encontrado
  } catch (error) {
    res.status(500).json({ error: error.message }); // Error de servidor
  }
};

// Inserta un nuevo usuario en la base de datos
exports.insertOne = async (req, res) => {
  try {
    const nuevoUsuario = new Usuario(req.body); // Crea un nuevo documento de Usuario con los datos del cuerpo
    await nuevoUsuario.save(); // Guarda el usuario en MongoDB
    res.status(201).json(nuevoUsuario); // Devuelve el usuario creado
  } catch (error) {
    res.status(400).json({ error: error.message }); // Error en los datos enviados
  }
};

// Actualiza un usuario existente por su ID y redirige al listado
exports.findOneAndUpdate = async (req, res) => {
  try {
    const { id, nombre, contra, telefono, cargo, activo } = req.body; // Toma los datos del formulario

    await Usuario.findByIdAndUpdate(id, {
        nombre,
        contra,
        telefono: telefono || null, // Usa null si no se envía teléfono
        cargo,
        activo
    });
    res.redirect('/listadousuarios'); // Redirige a la lista de usuarios
  } catch (error) {
    res.status(500).send("Error al actualizar usuario: " + error.message); // Maneja errores de actualización
  }
};

// Elimina un usuario por su ID recibido en el cuerpo de la petición
exports.findOneAndDelete = async (req, res) => {
  try {
    const { id } = req.body; // Lee el ID del cuerpo

    if (!id) {
      return res.status(400).send("ID de usuario no proporcionado"); // Valida que se envíe el ID
    }
    await Usuario.findByIdAndDelete(id); // Elimina el usuario de la base de datos
    res.redirect('/listadousuarios'); // Redirige al listado
  } catch (error) {
    console.error("Error al eliminar usuario:", error); // Log del error
    res.status(500).send("Ocurrió un error al intentar eliminar el usuario"); // Responde con error 500
  }
};

// Muestra el formulario para registrar un usuario nuevo
exports.formulario = async (req, res) => {
  res.render('pages/registrarusuario');
};