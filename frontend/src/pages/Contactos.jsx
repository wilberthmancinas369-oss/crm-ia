import { useRef, useState } from 'react';
import { Cargando, ErrorCarga } from '../components/EstadoVista.jsx';
import { useForm } from 'react-hook-form';
import { useCRM } from '../context/CRMContext.jsx';
import { obtenerContactoPorId, listarContactos } from '../services/contactos.js';
import FiltrosListado from '../components/FiltrosListado.jsx';
import { useListadoFiltrado } from '../hooks/useListadoFiltrado.js';
import { registrarInteraccion } from '../services/interacciones.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import SelectorGrupo from '../components/SelectorGrupo.jsx';
import { useGruposPermitidos } from '../hooks/useGruposPermitidos.js';
import { REDES_SOCIALES, formatoMonto } from '../constants/crm.js';
import { tonoEtapa, claseTipoInteraccion } from '../constants/estilos.js';

const claseInput = (conError) => `input${conError ? ' input-error' : ''}`;

const URL_REGEX = /^https?:\/\/\S+$/i;

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
    <div className="card space-y-5 entrada-crm">
      <div className="panel-cabecera">
        <div className="min-w-0">
          <h3 className="card-titulo break-words">{ficha.nombre} {ficha.apellido}</h3>
          <p className="subtitulo text-sm">
            {[ficha.cargo, ficha.empresa_cliente].filter(Boolean).join(' · ') || 'Sin puesto ni empresa'}
          </p>
        </div>
        <button onClick={onCerrar} aria-label="Cerrar ficha" className="btn-cerrar">✕</button>
      </div>

      <dl className="text-sm space-y-1">
        <div className="flex gap-2"><dt className="texto-suave w-20 shrink-0">Correo</dt><dd className="break-all">{ficha.email || '—'}</dd></div>
        <div className="flex gap-2"><dt className="texto-suave w-20 shrink-0">Teléfono</dt><dd>{ficha.telefono || '—'}</dd></div>
        <div className="flex gap-2">
          <dt className="texto-suave w-20 shrink-0">Redes</dt>
          <dd className="flex flex-wrap gap-2">
            {redes.length === 0 ? <span>—</span> : redes.map((r) => (
              <a key={r.clave} href={ficha.redes_sociales[r.clave]} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">
                {r.etiqueta}
              </a>
            ))}
          </dd>
        </div>
      </dl>

      <section>
        <h4 className="seccion-titulo">Oportunidades</h4>
        {ficha.oportunidades.length === 0 ? (
          <p className="campo-ayuda">Sin oportunidades. Créalas en la sección Oportunidades.</p>
        ) : (
          <ul className="lista-divisores text-sm">
            {ficha.oportunidades.map((o) => (
              <li key={o.id} className="py-1.5 flex justify-between gap-2">
                <span>{o.nombre_oportunidad}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="cifra">{formatoMonto(o.valor_estimado)}</span>
                  <span className={`badge badge-etapa ${tonoEtapa(o.etapa)}`}>{o.etapa}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h4 className="seccion-titulo">Historial de interacciones</h4>
        <form onSubmit={handleSubmit(onCrearInteraccion)} className="space-y-2 mb-3">
          <div className="flex gap-2">
            <select aria-label="Tipo de interacción" className="input input-auto" {...register('tipo')}>
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
          <button type="submit" disabled={isSubmitting} className="btn btn-secondary btn-sm w-full">
            Registrar interacción
          </button>
        </form>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {ficha.interacciones.length === 0 ? (
            <p className="vacio">Sin interacciones registradas.</p>
          ) : (
            ficha.interacciones.map((i) => (
              <div key={i.id} className="item-suave space-y-1">
                <div className="flex justify-between items-center">
                  <span className={claseTipoInteraccion(i.tipo)}>{i.tipo}</span>
                  <span className="text-xs texto-suave">{new Date(i.created_at).toLocaleDateString('es-MX')}</span>
                </div>
                <p className="font-medium">{i.detalle}</p>
                {i.oportunidad_id && (
                  <p className="text-xs texto-suave">
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
  const [detalle, setDetalle] = useState(null);
  const solicitudFicha = useRef(0);
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
    const solicitud = ++solicitudFicha.current;
    setDetalle({ id, cargando: true });
    try {
      const contacto = await obtenerContactoPorId(id);
      if (solicitud !== solicitudFicha.current) return;
      setFicha(contacto);
      setDetalle({ id });
    } catch (error) {
      if (solicitud === solicitudFicha.current) {
        setDetalle({ id, error: mensajeDelServidor(error, 'No se pudo cargar la ficha del contacto.') });
      }
    }
  };

  const cerrarFicha = () => {
    solicitudFicha.current++;
    setDetalle(null);
    setFicha(null);
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
      if (detalle?.id === id) cerrarFicha();
    } catch (error) {
      alert(mensajeDelServidor(error, 'Error al eliminar el contacto'));
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <h1>Contactos</h1>
          <p className="subtitulo">Las personas con las que tu equipo hace negocios.</p>
        </div>
      </div>

      <section className="card">
        <h2 className="card-titulo mb-4">Nuevo contacto</h2>
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
            <button type="button" onClick={() => setMostrarRedes((v) => !v)} className="btn-texto" aria-expanded={mostrarRedes}>
              {mostrarRedes ? 'Ocultar redes sociales' : 'Agregar redes sociales'}
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
            <button type="submit" disabled={isSubmitting} className="btn">
              {isSubmitting ? 'Guardando...' : 'Guardar contacto'}
            </button>
          </div>
        </form>
      </section>

      <FiltrosListado cargando={cargando} onAplicar={(valores) => { cerrarFicha(); setFiltros(valores); }} campos={[
        { nombre: 'nombre', etiqueta: 'Nombre o apellido', placeholder: 'Buscar contacto' },
        { nombre: 'empresa', etiqueta: 'Empresa', placeholder: 'Empresa del contacto' },
        { nombre: 'estado', etiqueta: 'Estado', opciones: [
          { valor: '', etiqueta: 'Todos los estados' }, { valor: 'Activo', etiqueta: 'Activo' }, { valor: 'Inactivo', etiqueta: 'Inactivo' }
        ] }
      ]} />
      {error && <div role="alert" className="alerta alerta-error">
        <p>{error}</p><button type="button" className="btn btn-sm mt-2" onClick={recargar}>Reintentar</button>
      </div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className={`card-plana ${detalle ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="overflow-x-auto">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Puesto</th>
                  <th>Empresa</th>
                  <th>Correo</th>
                  <th className="num">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan="5" className="vacio"><Cargando>Cargando contactos…</Cargando></td></tr>
                ) : error ? null : contactos.length === 0 ? (
                  <tr><td colSpan="5" className="vacio"><p role="status">{Object.keys(filtros).length ? 'No se encontraron resultados con los filtros seleccionados.' : 'No hay contactos registrados.'}</p></td></tr>
                ) : (
                  contactos.map((c) => (
                    <tr key={c.id} className={detalle?.id === c.id ? 'fila-activa' : ''}>
                      <td className="font-semibold">{c.nombre} {c.apellido}</td>
                      <td>{c.cargo || '—'}</td>
                      <td>{c.empresa_cliente || '—'}</td>
                      <td>{c.email || '—'}</td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => cargarFicha(c.id)} className="btn btn-sm btn-suave">Ficha</button>
                          <button onClick={() => handleEliminar(c.id)} className="btn btn-sm btn-peligro-suave">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {detalle?.cargando ? <div className="card"><Cargando>Cargando ficha…</Cargando></div> : detalle?.error ? (
          <ErrorCarga onReintentar={() => cargarFicha(detalle.id)} onCerrar={cerrarFicha}>{detalle.error}</ErrorCarga>
        ) : ficha && <FichaContacto key={ficha.id} ficha={ficha} onCerrar={cerrarFicha} onInteraccionCreada={() => cargarFicha(ficha.id)} />}
      </div>
    </div>
  );
}
