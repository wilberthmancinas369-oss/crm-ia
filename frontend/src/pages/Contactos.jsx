import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCRM } from '../context/CRMContext.jsx';
import { obtenerContactoPorId, listarContactos } from '../services/contactos.js';
import FiltrosListado from '../components/FiltrosListado.jsx';
import { useListadoFiltrado } from '../hooks/useListadoFiltrado.js';
import { registrarInteraccion } from '../services/interacciones.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import SelectorGrupo from '../components/SelectorGrupo.jsx';
import { useGruposPermitidos } from '../hooks/useGruposPermitidos.js';
import { REDES_SOCIALES, claseEtapa, formatoMonto } from '../constants/crm.js';

const claseInput = (conError) =>
  `w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 ${
    conError ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'
  }`;

const URL_REGEX = /^https?:\/\/\S+$/i;

const claseTipo = (tipo) =>
  tipo === 'Llamada' ? 'bg-blue-100 text-blue-700' :
  tipo === 'Correo' ? 'bg-amber-100 text-amber-700' :
  tipo === 'Reunión' ? 'bg-purple-100 text-purple-700' :
  'bg-gray-200 text-gray-700';

// El backend responde { error } o, si falla express-validator, { errors: [{ msg }] }
const mensajeDelServidor = (error, porDefecto) =>
  error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || porDefecto;

// Ficha del contacto: datos, redes, oportunidades e historial de interacciones (HU 4.1)
function FichaContacto({ ficha, onCerrar, onInteraccionCreada }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({ defaultValues: { tipo: 'Llamada', detalle: '' } });

  const onCrearInteraccion = async (datos) => {
    try {
      await registrarInteraccion({ ...datos, contacto_id: ficha.id });
      reset();
      onInteraccionCreada();
    } catch (error) {
      alert(mensajeDelServidor(error, 'Error al registrar la interacción'));
    }
  };

  const redes = REDES_SOCIALES.filter((r) => ficha.redes_sociales?.[r.clave]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 space-y-5">
      <div className="flex justify-between items-start border-b pb-3">
        <div>
          <h3 className="font-bold text-gray-800 text-base">{ficha.nombre} {ficha.apellido}</h3>
          <p className="text-xs text-gray-500">
            {[ficha.cargo, ficha.empresa_cliente].filter(Boolean).join(' · ') || 'Sin puesto ni empresa'}
          </p>
        </div>
        <button onClick={onCerrar} aria-label="Cerrar ficha" className="text-gray-400 hover:text-gray-600 text-sm font-bold">✕</button>
      </div>

      <dl className="text-sm space-y-1">
        <div className="flex gap-2"><dt className="text-gray-500 w-20">Correo</dt><dd className="text-gray-800">{ficha.email || '—'}</dd></div>
        <div className="flex gap-2"><dt className="text-gray-500 w-20">Teléfono</dt><dd className="text-gray-800">{ficha.telefono || '—'}</dd></div>
        <div className="flex gap-2">
          <dt className="text-gray-500 w-20">Redes</dt>
          <dd className="flex flex-wrap gap-2">
            {redes.length === 0 ? <span className="text-gray-800">—</span> : redes.map((r) => (
              <a key={r.clave} href={ficha.redes_sociales[r.clave]} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                {r.etiqueta}
              </a>
            ))}
          </dd>
        </div>
      </dl>

      <section>
        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Oportunidades</h4>
        {ficha.oportunidades.length === 0 ? (
          <p className="text-xs text-gray-400">Sin oportunidades. Créalas en la sección Oportunidades.</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {ficha.oportunidades.map((o) => (
              <li key={o.id} className="py-1.5 flex justify-between gap-2">
                <span className="text-gray-800">{o.nombre_oportunidad}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-gray-500">{formatoMonto(o.valor_estimado)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${claseEtapa(o.etapa)}`}>{o.etapa}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Historial de interacciones</h4>
        <form onSubmit={handleSubmit(onCrearInteraccion)} className="space-y-2 mb-3">
          <div className="flex gap-2">
            <select className="border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" {...register('tipo')}>
              <option value="Llamada">Llamada</option>
              <option value="Correo">Correo</option>
              <option value="Reunión">Reunión</option>
              <option value="Nota">Nota</option>
            </select>
            <input
              type="text"
              placeholder="Detalle *"
              className={`flex-1 ${claseInput(errors.detalle)}`}
              {...register('detalle', { required: 'El detalle no puede estar vacío' })}
            />
          </div>
          <ErrorMessage>{errors.detalle?.message}</ErrorMessage>
          <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold py-2 rounded-md transition">
            + Registrar interacción
          </button>
        </form>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {ficha.interacciones.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">Sin interacciones registradas.</p>
          ) : (
            ficha.interacciones.map((i) => (
              <div key={i.id} className="p-3 bg-gray-50 rounded-md border border-gray-100 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${claseTipo(i.tipo)}`}>{i.tipo}</span>
                  <span className="text-[10px] text-gray-400">{new Date(i.created_at).toLocaleDateString('es-MX')}</span>
                </div>
                <p className="text-gray-700 font-medium">{i.detalle}</p>
                {i.oportunidad_id && (
                  <p className="text-[10px] text-gray-400">
                    Sobre: {ficha.oportunidades.find((o) => o.id === i.oportunidad_id)?.nombre_oportunidad ?? 'una oportunidad'}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default function Contactos() {
  const { agregarContacto, borrarContacto } = useCRM();
  const { datos: contactos, filtros, setFiltros, cargando, error, recargar } = useListadoFiltrado(listarContactos);
  const gruposPermitidos = useGruposPermitidos('gestionarCRM');
  const [ficha, setFicha] = useState(null);
  const [mostrarRedes, setMostrarRedes] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      nombre: '', apellido: '', cargo: '', email: '', telefono: '', empresa_cliente: '',
      redes_sociales: Object.fromEntries(REDES_SOCIALES.map((r) => [r.clave, '']))
    }
  });

  const cargarFicha = async (id) => {
    try {
      setFicha(await obtenerContactoPorId(id));
    } catch (error) {
      console.error('Error al cargar el contacto:', error);
      alert('No se pudo cargar la ficha del contacto');
    }
  };

  const onCrearContacto = async (datos) => {
    try {
      await agregarContacto(datos);
      await recargar();
      reset();
      setMostrarRedes(false);
    } catch (error) {
      alert(mensajeDelServidor(error, 'Error al crear el contacto'));
    }
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Deseas eliminar este contacto?')) return;
    try {
      await borrarContacto(id);
      await recargar();
      if (ficha?.id === id) setFicha(null);
    } catch (error) {
      alert(mensajeDelServidor(error, 'Error al eliminar el contacto'));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="border-b pb-4 border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">Contactos</h1>
        <p className="text-sm text-gray-500">Las personas con las que tu equipo hace negocios.</p>
      </div>

      <section className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Nuevo contacto</h2>
        <form onSubmit={handleSubmit(onCrearContacto)} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <input type="text" placeholder="Nombre *" className={claseInput(errors.nombre)}
                {...register('nombre', { required: 'El nombre es obligatorio' })} />
              <ErrorMessage>{errors.nombre?.message}</ErrorMessage>
            </div>
            <input type="text" placeholder="Apellido" className={claseInput(false)} {...register('apellido')} />
            <input type="text" placeholder="Puesto (ej. Gerente de compras)" className={claseInput(false)} {...register('cargo')} />
            <input type="text" placeholder="Empresa del cliente" className={claseInput(false)} {...register('empresa_cliente')} />
            <div>
              <input type="email" placeholder="Correo" className={claseInput(errors.email)}
                {...register('email', { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Formato de correo inválido' } })} />
              <ErrorMessage>{errors.email?.message}</ErrorMessage>
            </div>
            <input type="text" placeholder="Teléfono" className={claseInput(false)} {...register('telefono')} />
            <SelectorGrupo grupos={gruposPermitidos} register={register} error={errors.grupo_id} />
          </div>

          <div>
            <button type="button" onClick={() => setMostrarRedes((v) => !v)} className="text-sm text-blue-600 hover:underline">
              {mostrarRedes ? '− Ocultar redes sociales' : '+ Agregar redes sociales'}
            </button>
            {/* Ocultas con CSS para que el formulario conserve los valores al plegarlas */}
            <div className={`grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-3 ${mostrarRedes ? '' : 'hidden'}`}>
              {REDES_SOCIALES.map((r) => (
                <div key={r.clave}>
                  <input type="url" placeholder={`${r.etiqueta} (https://...)`} className={claseInput(errors.redes_sociales?.[r.clave])}
                    {...register(`redes_sociales.${r.clave}`, {
                      validate: (v) => !v || URL_REGEX.test(v) || 'Usa la URL completa, con https://'
                    })} />
                  <ErrorMessage>{errors.redes_sociales?.[r.clave]?.message}</ErrorMessage>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium text-sm rounded-md px-6 py-2 transition">
              {isSubmitting ? 'Guardando...' : 'Guardar contacto'}
            </button>
          </div>
        </form>
      </section>

      <FiltrosListado cargando={cargando} onAplicar={(valores) => { setFicha(null); setFiltros(valores); }} campos={[
        { nombre: 'nombre', etiqueta: 'Nombre o apellido', placeholder: 'Buscar contacto' },
        { nombre: 'empresa', etiqueta: 'Empresa', placeholder: 'Empresa del contacto' },
        { nombre: 'estado', etiqueta: 'Estado', opciones: [
          { valor: '', etiqueta: 'Todos los estados' }, { valor: 'Activo', etiqueta: 'Activo' }, { valor: 'Inactivo', etiqueta: 'Inactivo' }
        ] }
      ]} />
      {error && <div role="alert" className="p-3 rounded-md text-sm bg-red-100 text-red-800">
        <p>{error}</p><button type="button" className="btn mt-2" onClick={recargar}>Reintentar</button>
      </div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${ficha ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs border-b">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Puesto</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Correo</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cargando ? (
                  <tr><td colSpan="5" className="text-center py-6 text-gray-500" role="status">Cargando contactos...</td></tr>
                ) : error ? null : contactos.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-6 text-gray-500"><p role="status">{Object.keys(filtros).length ? 'No se encontraron resultados con los filtros seleccionados.' : 'No hay contactos registrados.'}</p></td></tr>
                ) : (
                  contactos.map((c) => (
                    <tr key={c.id} className={`hover:bg-gray-50 transition ${ficha?.id === c.id ? 'bg-blue-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-800">{c.nombre} {c.apellido}</td>
                      <td className="px-4 py-3">{c.cargo || '—'}</td>
                      <td className="px-4 py-3">{c.empresa_cliente || '—'}</td>
                      <td className="px-4 py-3">{c.email || '—'}</td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <button onClick={() => cargarFicha(c.id)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1 rounded-md text-xs font-semibold transition">
                          Ficha
                        </button>
                        <button onClick={() => handleEliminar(c.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded-md text-xs font-semibold transition">
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

        {ficha && (
          <FichaContacto ficha={ficha} onCerrar={() => setFicha(null)} onInteraccionCreada={() => cargarFicha(ficha.id)} />
        )}
      </div>
    </div>
  );
}
