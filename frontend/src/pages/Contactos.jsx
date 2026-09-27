import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCRM } from '../context/CRMContext.jsx';
import {
  listarInteracciones,
  registrarInteraccion
} from '../services/interacciones.js';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function Contactos() {
  const { contactos, agregarContacto, borrarContacto, cargando } = useCRM();

  // Estados locales para el panel de interacciones
  const [contactoSeleccionado, setContactoSeleccionado] = useState(null);
  const [interacciones, setInteracciones] = useState([]);

  // Formulario para Crear Contacto (React Hook Form)
  const {
    register: registerContacto,
    handleSubmit: handleSubmitContacto,
    reset: resetContacto,
    formState: { errors: errorsContacto, isSubmitting: isSubmittingContacto }
  } = useForm({
    defaultValues: {
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      empresa_cliente: ''
    }
  });

  // Formulario para Registrar Interacción (React Hook Form)
  const {
    register: registerInteraccion,
    handleSubmit: handleSubmitInteraccion,
    reset: resetInteraccion,
    formState: { errors: errorsInteraccion }
  } = useForm({
    defaultValues: {
      tipo: 'Llamada',
      detalle: ''
    }
  });

  // Submit Handler: Nuevo Contacto
  const onCrearContacto = async (data) => {
    try {
      await agregarContacto(data);
      resetContacto();
    } catch (error) {
      alert('Error al crear el contacto');
    }
  };

  // Submit Handler: Nueva Interacción
  const onCrearInteraccion = async (data) => {
    if (!contactoSeleccionado) return;
    try {
      const nueva = await registrarInteraccion({
        ...data,
        contacto_id: contactoSeleccionado.id
      });
      setInteracciones((prev) => [nueva, ...prev]);
      resetInteraccion();
    } catch (error) {
      alert('Error al registrar la interacción');
    }
  };

  const handleEliminarContacto = async (id) => {
    if (!confirm('¿Deseas eliminar este contacto?')) return;
    try {
      await borrarContacto(id);
      if (contactoSeleccionado?.id === id) setContactoSeleccionado(null);
    } catch (error) {
      alert('Error al eliminar el contacto');
    }
  };

  const handleVerInteracciones = async (contacto) => {
    setContactoSeleccionado(contacto);
    try {
      const data = await listarInteracciones({ contactoId: contacto.id });
      setInteracciones(data);
    } catch (error) {
      console.error('Error al cargar interacciones:', error);
    }
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500 font-medium">
        Cargando contactos...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ENCABEZADO */}
      <div className="border-b pb-4 border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Contactos</h1>
      </div>

      {/* FORMULARIO DE CREACIÓN */}
      <section className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Nuevo Contacto</h2>
        <form onSubmit={handleSubmitContacto(onCrearContacto)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            
            {/* Campo: Nombre */}
            <div>
              <input
                type="text"
                placeholder="Nombre *"
                className={`w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 ${
                  errorsContacto.nombre ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
                }`}
                {...registerContacto('nombre', {
                  required: 'El nombre es obligatorio'
                })}
              />
              <ErrorMessage>{errorsContacto.nombre?.message}</ErrorMessage>
            </div>

            {/* Campo: Apellido */}
            <div>
              <input
                type="text"
                placeholder="Apellido"
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...registerContacto('apellido')}
              />
            </div>

            {/* Campo: Email */}
            <div>
              <input
                type="email"
                placeholder="Email"
                className={`w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 ${
                  errorsContacto.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
                }`}
                {...registerContacto('email', {
                  pattern: {
                    value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                    message: 'Formato de correo inválido'
                  }
                })}
              />
              <ErrorMessage>{errorsContacto.email?.message}</ErrorMessage>
            </div>

            {/* Campo: Teléfono */}
            <div>
              <input
                type="text"
                placeholder="Teléfono"
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...registerContacto('telefono')}
              />
            </div>

            {/* Campo: Empresa Cliente */}
            <div>
              <input
                type="text"
                placeholder="Empresa Cliente"
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...registerContacto('empresa_cliente')}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmittingContacto}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium text-sm rounded-md px-6 py-2 transition duration-150"
            >
              {isSubmittingContacto ? 'Guardando...' : 'Guardar Contacto'}
            </button>
          </div>
        </form>
      </section>

      {/* CONTENIDO PRINCIPAL: TABLA Y DETALLE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TABLA CONTACTOS */}
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${contactoSeleccionado ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-700">Lista de Contactos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs border-b">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contactos.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-gray-400">No hay contactos registrados.</td>
                  </tr>
                ) : (
                  contactos.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition duration-150">
                      <td className="px-4 py-3 font-medium text-gray-800">{c.nombre} {c.apellido}</td>
                      <td className="px-4 py-3">{c.email || '-'}</td>
                      <td className="px-4 py-3">{c.empresa_cliente || 'N/A'}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleVerInteracciones(c)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1 rounded-md text-xs font-semibold transition"
                        >
                          Historial
                        </button>
                        <button
                          onClick={() => handleEliminarContacto(c.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded-md text-xs font-semibold transition"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PANEL DE HISTORIAL E INTERACCIONES */}
        {contactoSeleccionado && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <div>
                  <h3 className="font-bold text-gray-800 text-base">Historial de Interacciones</h3>
                  <p className="text-xs text-gray-500">{contactoSeleccionado.nombre} {contactoSeleccionado.apellido}</p>
                </div>
                <button
                  onClick={() => setContactoSeleccionado(null)}
                  className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Formulario Agregar Interacción con RHF */}
              <form onSubmit={handleSubmitInteraccion(onCrearInteraccion)} className="space-y-3 mb-5">
                <div>
                  <div className="flex gap-2">
                    <select
                      className="border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      {...registerInteraccion('tipo')}
                    >
                      <option value="Llamada">Llamada</option>
                      <option value="Correo">Correo</option>
                      <option value="Reunión">Reunión</option>
                      <option value="Nota">Nota</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Detalle *"
                      className={`border rounded-md p-2 text-sm flex-1 focus:ring-2 focus:outline-none ${
                        errorsInteraccion.detalle ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      {...registerInteraccion('detalle', {
                        required: 'El detalle no puede estar vacío'
                      })}
                    />
                  </div>
                  <ErrorMessage>{errorsInteraccion.detalle?.message}</ErrorMessage>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-md transition"
                >
                  + Agregar Interacción
                </button>
              </form>

              {/* Lista de Interacciones */}
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {interacciones.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Sin interacciones registradas.</p>
                ) : (
                  interacciones.map((i) => (
                    <div key={i.id} className="p-3 bg-gray-50 rounded-md border border-gray-100 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                          i.tipo === 'Llamada' ? 'bg-blue-100 text-blue-700' :
                          i.tipo === 'Correo' ? 'bg-amber-100 text-amber-700' :
                          i.tipo === 'Reunión' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-200 text-gray-700'
                        }`}>
                          {i.tipo}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(i.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-700 font-medium">{i.detalle}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}