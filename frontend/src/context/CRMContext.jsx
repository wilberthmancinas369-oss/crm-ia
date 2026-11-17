import { createContext, useContext, useState, useEffect } from 'react';
import {
  listarContactos,
  crearContacto,
  eliminarContacto
} from '../services/contactos.js';

const CRMContext = createContext();

export function CRMProvider({ children }) {
  const [contactos, setContactos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorContactos, setErrorContactos] = useState('');

  useEffect(() => {
    cargarContactos();
  }, []);

  const cargarContactos = async () => {
    setCargando(true);
    setErrorContactos('');
    try {
      const data = await listarContactos();
      setContactos(data);
    } catch (error) {
      setErrorContactos(error.response?.data?.error || 'No se pudieron cargar los contactos.');
    } finally {
      setCargando(false);
    }
  };

  const agregarContacto = async (datos) => {
    const nuevo = await crearContacto(datos);
    // Inserta el nuevo contacto en el estado global
    setContactos((prev) => [nuevo, ...prev]);
    return nuevo;
  };

  const borrarContacto = async (id) => {
    await eliminarContacto(id);
    // Remueve el contacto del estado global
    setContactos((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <CRMContext.Provider value={{ contactos, agregarContacto, borrarContacto, cargando, errorContactos, cargarContactos }}>
      {children}
    </CRMContext.Provider>
  );
}

export const useCRM = () => useContext(CRMContext);
