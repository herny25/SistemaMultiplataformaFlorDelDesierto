import axios from 'axios';
import { getServerUrl } from './config';

const getApi = async () => {
  const baseURL = await getServerUrl();
  return axios.create({ baseURL: `${baseURL}/api`, timeout: 8000 });
};

export const productosApi = {
  getDisponibles: async () => (await (await getApi()).get('/productos/disponibles')).data,
  getCategorias: async () => (await (await getApi()).get('/productos/categorias/todas')).data,
};