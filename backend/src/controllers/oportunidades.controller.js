import { oportunidadesService } from '../services/oportunidades.service.js';
import { ambitoDe, buscarContactoVisible, esAsignableEnGrupo } from '../services/alcance.service.js';
import { puedeEnGrupo } from '../config/permisos.js';

// La empresa y los grupos permitidos salen de la sesión (middleware autorizar), nunca del body ni del query.
// Una oportunidad fuera del alcance responde 404, igual que una inexistente (HU-11).
// Reglas de HU 4.1 (docs/HU4.1-contactos-oportunidades.md):
// - Toda oportunidad tiene contacto y toma el grupo de ese contacto.
// - Responsable: por defecto quien la crea. Asignarla o reasignarla a otra persona requiere
//   el permiso asignarResponsable (Jefe de Área en su grupo, o Administrador).
// - El responsable y los colaboradores deben ser miembros del grupo o administradores.

const CAMPOS_EDITABLES = [
  'nombre_oportunidad', 'contacto_id', 'valor_estimado', 'etapa', 'probabilidad', 'fecha_cierre_prevista', 'responsable_id'
];

// Toma solo las columnas de la tabla oportunidades; un valor vacío del formulario se guarda como null
const camposOportunidad = (body) => {
  const campos = {};
  for (const clave of CAMPOS_EDITABLES) {
    if (body[clave] !== undefined) campos[clave] = body[clave] === '' ? null : body[clave];
  }
  return campos;
};

// Valida un responsable nuevo. Devuelve null si es válido, o { status, error }.
async function validarResponsable(req, grupoId, responsableId, responsableActual) {
  if (responsableId === responsableActual) return null;
  if (!responsableId) return { status: 400, error: 'La oportunidad necesita un responsable' };

  const esElMismo = responsableId === req.perfil.usuario.id && responsableActual === undefined;
  if (!esElMismo && !puedeEnGrupo(req.perfil, 'asignarResponsable', grupoId)) {
    return { status: 403, error: 'Solo el Jefe de Área o el Administrador pueden asignar el responsable a otra persona' };
  }

  if (!(await esAsignableEnGrupo(responsableId, grupoId, req.company_id))) {
    return { status: 400, error: 'El responsable debe pertenecer al grupo de la oportunidad' };
  }
  return null;
}

// El responsable de la oportunidad, o el Jefe/Admin de su grupo, administra los colaboradores
const puedeGestionarColaboradores = (req, oportunidad) =>
  oportunidad.responsable_id === req.perfil.usuario.id ||
  puedeEnGrupo(req.perfil, 'asignarResponsable', oportunidad.group_id);

export const reasignarOportunidad = async (req, res) => {
  try {
    const ambito = ambitoDe(req);
    const { responsable_id: nuevoResponsableId } = req.body;
    const oportunidadId = req.params.id;

    // 1. Validar existencia y visibilidad (404)
    const actual = await oportunidadesService.getById(oportunidadId, ambito);
    if (!actual) {
      return res.status(404).json({ message: 'Oportunidad no encontrada' });
    }

    const grupoId = actual.group_id;
    const companyId = actual.company_id;

    // 2. Validar permiso de asignarResponsable en el grupo de la oportunidad (403)
    if (!puedeEnGrupo(req.perfil, 'asignarResponsable', grupoId)) {
      return res.status(403).json({ error: 'No tienes permisos para reasignar oportunidades en este grupo' });
    }

    // 3. Validar que el destino sea válido (esté en el grupo/empresa) usando la lógica del proyecto
    const invalido = await validarResponsable(req, grupoId, nuevoResponsableId, actual.responsable_id);
    if (invalido) {
      return res.status(invalido.status).json({ error: invalido.error });
    }

    // 4. Validar que el destino sea distinto al actual (400)
    // (Nota: validarResponsable ya hace esto en la línea 28, pero lo reforzamos aquí por claridad de la HU)
    if (nuevoResponsableId === actual.responsable_id) {
      return res.status(400).json({ error: 'El agente destino ya es el responsable actual de la oportunidad' });
    }

    // Ejecutar reasignación
    await oportunidadesService.reasignar(oportunidadId, companyId, nuevoResponsableId);

    // Devolver la oportunidad actualizada con el nuevo responsable
    const actualizada = await oportunidadesService.getById(oportunidadId, ambito);
    res.json(actualizada);

  } catch (error) {
    console.error('Error en reasignarOportunidad:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getOportunidades = async (req, res) => {
  try {
    const oportunidades = await oportunidadesService.getAll(ambitoDe(req));
    res.json(oportunidades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getOportunidadById = async (req, res) => {
  try {
    const oportunidad = await oportunidadesService.getById(req.params.id, ambitoDe(req));
    if (!oportunidad) {
      return res.status(404).json({ message: 'Oportunidad no encontrada' });
    }
    res.json(oportunidad);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createOportunidad = async (req, res) => {
  try {
    const campos = camposOportunidad(req.body);

    // El contacto es obligatorio (lo exige la ruta) y define el grupo de la oportunidad
    const contacto = await buscarContactoVisible(campos.contacto_id, ambitoDe(req));
    if (!contacto) return res.status(404).json({ error: 'Contacto no encontrado' });

    campos.responsable_id = campos.responsable_id ?? req.perfil.usuario.id;
    const invalido = await validarResponsable(req, contacto.group_id, campos.responsable_id, undefined);
    if (invalido) return res.status(invalido.status).json({ error: invalido.error });

    const nuevaOportunidad = await oportunidadesService.create(campos, ambitoDe(req), contacto.group_id);
    res.status(201).json(nuevaOportunidad);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateOportunidad = async (req, res) => {
  try {
    const ambito = ambitoDe(req);
    const actual = await oportunidadesService.getById(req.params.id, ambito);
    if (!actual) return res.status(404).json({ message: 'Oportunidad no encontrada' });

    const campos = camposOportunidad(req.body);

    if ('contacto_id' in campos) {
      // Cambiar de grupo una oportunidad es reasignarla (otra HU); el contacto nuevo debe ser del mismo grupo
      if (!campos.contacto_id) return res.status(400).json({ error: 'La oportunidad debe tener un contacto' });
      const contacto = await buscarContactoVisible(campos.contacto_id, ambito);
      if (!contacto) return res.status(404).json({ error: 'Contacto no encontrado' });
      if (contacto.group_id !== actual.group_id) {
        return res.status(400).json({ error: 'El contacto debe pertenecer al mismo grupo que la oportunidad' });
      }
    }

    if ('responsable_id' in campos) {
      const invalido = await validarResponsable(req, actual.group_id, campos.responsable_id, actual.responsable_id);
      if (invalido) return res.status(invalido.status).json({ error: invalido.error });
    }

    const actualizada = await oportunidadesService.update(req.params.id, ambito, campos);
    res.json(actualizada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteOportunidad = async (req, res) => {
  try {
    const eliminada = await oportunidadesService.delete(req.params.id, ambitoDe(req));
    if (!eliminada) {
      return res.status(404).json({ message: 'Oportunidad no encontrada' });
    }
    res.json({ message: 'Oportunidad eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ---------- Colaboradores ----------

export const getColaboradores = async (req, res) => {
  try {
    const ambito = ambitoDe(req);
    if (!(await oportunidadesService.getById(req.params.id, ambito))) {
      return res.status(404).json({ message: 'Oportunidad no encontrada' });
    }
    res.json(await oportunidadesService.listarColaboradores(req.params.id, ambito));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addColaborador = async (req, res) => {
  try {
    const ambito = ambitoDe(req);
    const oportunidad = await oportunidadesService.getById(req.params.id, ambito);
    if (!oportunidad) return res.status(404).json({ message: 'Oportunidad no encontrada' });

    if (!puedeGestionarColaboradores(req, oportunidad)) {
      return res.status(403).json({ error: 'Solo el responsable o el Jefe de Área pueden agregar colaboradores' });
    }

    const { user_id } = req.body;
    if (user_id === oportunidad.responsable_id) {
      return res.status(400).json({ error: 'Esa persona ya es la responsable de la oportunidad' });
    }
    if (!(await esAsignableEnGrupo(user_id, oportunidad.group_id, req.company_id))) {
      return res.status(400).json({ error: 'El colaborador debe pertenecer al grupo de la oportunidad' });
    }

    const agregado = await oportunidadesService.agregarColaborador(req.params.id, user_id, ambito, req.perfil.usuario.id);
    if (!agregado) return res.status(409).json({ error: 'Esa persona ya es colaboradora' });

    res.status(201).json(await oportunidadesService.listarColaboradores(req.params.id, ambito));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const removeColaborador = async (req, res) => {
  try {
    const ambito = ambitoDe(req);
    const oportunidad = await oportunidadesService.getById(req.params.id, ambito);
    if (!oportunidad) return res.status(404).json({ message: 'Oportunidad no encontrada' });

    // Un colaborador puede salirse por su cuenta
    const esElMismo = req.params.userId === req.perfil.usuario.id;
    if (!esElMismo && !puedeGestionarColaboradores(req, oportunidad)) {
      return res.status(403).json({ error: 'Solo el responsable o el Jefe de Área pueden quitar colaboradores' });
    }

    const quitado = await oportunidadesService.quitarColaborador(req.params.id, req.params.userId, ambito);
    if (!quitado) return res.status(404).json({ message: 'Esa persona no es colaboradora' });

    res.json(await oportunidadesService.listarColaboradores(req.params.id, ambito));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
