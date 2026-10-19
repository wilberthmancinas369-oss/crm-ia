import { api } from './api';

export const reportesService = {
  async getResumenJefe(grupoId) {
    const { data } = await api.get('/reportes/jefe', { params: { grupo_id: grupoId } });
    return data;
  },
  async getReporteGeneral() {
    const { data } = await api.get('/reportes/general');
    return data;
  }
};
