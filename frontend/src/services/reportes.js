import {api} from './api.js'; // instancia de axios configurada en tu frontend

export const obtenerReporteGeneralEmpresa = async (empresaId) => {
  const { data } = await api.get(`/reportes/general?empresa_id=${empresaId}`);
  return data;
};