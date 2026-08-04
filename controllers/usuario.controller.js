const Usuario = require('../models/usuario.model');


exports.home = async (req, res) => {
  res.render('pages/index');
};


exports.find = async (req, res) => {
  try {
    const usuarios = await Usuario.find();
    if (req.accepts && req.accepts('html')) {
      return res.render('pages/listadousuarios', { usuarios });
    }
    return res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.findOne = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.status(200).json(usuario);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.insertOne = async (req, res) => {
  try {
    const nuevoUsuario = new Usuario(req.body);
    await nuevoUsuario.save();
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


exports.findOneAndUpdate = async (req, res) => {
  try {
    const { id, nombre, contra, telefono, cargo, activo } = req.body;
    
    await Usuario.findByIdAndUpdate(id, { 
        nombre, 
        contra, 
        telefono: telefono || null,
        cargo,
        activo
    });
    res.redirect('/listadousuarios');
  } catch (error) {
    res.status(500).send("Error al actualizar usuario: " + error.message);
  }
};



exports.findOneAndDelete = async (req, res) => {
  try {
    const { id } = req.body; 

    if (!id) {
      return res.status(400).send("ID de usuario no proporcionado");
    }
    await Usuario.findByIdAndDelete(id);
    res.redirect('/listadousuarios');
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).send("Ocurrió un error al intentar eliminar el usuario");
  }
};


exports.formulario = async (req, res) => {
  res.render('pages/registrarusuario');
};