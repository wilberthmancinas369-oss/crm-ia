import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listarGrupos, listarAsignables } from '../services/grupos';

// Reutiliza los catálogos existentes, que el backend restringe por empresa y grupo.
export function useResponsablesFiltro() {
  const { perfil } = useAuth();
  const [responsables, setResponsables] = useState([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError('');
    listarGrupos()
      .then((grupos) => Promise.all(grupos.map((grupo) => listarAsignables(grupo.id))))
      .then((listas) => {
        if (cancelado) return;
        const unicos = new Map(listas.flat().map((usuario) => [usuario.id, usuario]));
        setResponsables([...unicos.values()].sort((a, b) => (a.nombre || a.email || '').localeCompare(b.nombre || b.email || '')));
      })
      .catch(() => { if (!cancelado) setError('No se pudieron cargar las opciones de responsables. Recarga la página para reintentar.'); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [perfil.usuario.id]);

  return { responsables, error, cargando };
}
