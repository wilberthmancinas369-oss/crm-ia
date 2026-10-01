import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { getSession, logout, obtenerPerfil } from '../services/auth';

const AuthContext = createContext(null);

// Mantiene la sesión de Supabase y el perfil de la cuenta (empresa, rol, grupos y permisos).
// El perfil sale del backend (GET /api/auth/me), que es quien decide los permisos.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = todavía verificando
  const [perfil, setPerfil] = useState(null);
  const [errorPerfil, setErrorPerfil] = useState(null);
  const [intento, setIntento] = useState(0); // sube para volver a pedir el perfil

  useEffect(() => {
    getSession()
      .then(setSession)
      .catch(() => setSession(null));

    // Login, logout, registro y renovación del token. No llamar a Supabase dentro de este callback.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSession(nuevaSesion);
    });
    return () => subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;

  // Se pide el perfil solo cuando cambia la cuenta, no en cada renovación del token
  useEffect(() => {
    setPerfil(null);
    setErrorPerfil(null);
    if (!userId) return;

    let cancelado = false;
    obtenerPerfil()
      .then((datos) => { if (!cancelado) setPerfil(datos); })
      .catch((error) => {
        if (cancelado) return;
        setErrorPerfil(
          error.response?.data?.error ||
          'No pudimos cargar tu cuenta. Verifica que el servidor esté encendido e inténtalo de nuevo.'
        );
      });
    return () => { cancelado = true; };
  }, [userId, intento]);

  // Evita usar por un instante el perfil de la cuenta anterior al cambiar de usuario
  const perfilVigente = perfil?.usuario.id === userId ? perfil : null;

  const cerrarSesion = useCallback(async () => {
    await logout();
    setPerfil(null);
  }, []);

  const puede = useCallback((permiso) => Boolean(perfilVigente?.permisos?.[permiso]), [perfilVigente]);

  const value = {
    session,
    perfil: perfilVigente,
    errorPerfil,
    // Verificando la sesión, o con sesión pero sin perfil ni error todavía
    cargando: session === undefined || (Boolean(session) && !perfilVigente && !errorPerfil),
    puede,
    cerrarSesion,
    reintentarPerfil: () => setIntento((n) => n + 1)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
