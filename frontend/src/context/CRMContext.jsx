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

  useEffect(() => {
    cargarContactos();
  }, []);

  const cargarContactos = async () => {
    try {
      const data = await listarContactos();
      setContactos(data);
    } catch (error) {
      console.error('Error al cargar contactos:', error);
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
    <CRMContext.Provider value={{ contactos, agregarContacto, borrarContacto, cargando }}>
      {children}
    </CRMContext.Provider>
  );
}

export const useCRM = () => useContext(CRMContext);