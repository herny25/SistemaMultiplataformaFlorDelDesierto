import axios from 'axios';
import { getServerUrl } from './config';
import type { Producto, Categoria } from '../types';
const getApi = async () => {
  const baseURL = await getServerUrl();
  return axios.create({ baseURL: `${baseURL}/api`, timeout: 8000 });
};
export const productosApi = {
  getDisponibles: async (): Promise<Producto[]> => {
    const api = await getApi();
    return (await api.get<Producto[]>('/productos/disponibles')).data;
  },
  getCategorias: async (): Promise<Categoria[]> => {
    const api = await getApi();
    return (await api.get<Categoria[]>('/productos/categorias/todas')).data;
  },
};
