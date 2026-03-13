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

export const loginApi = async (nombre: string, contrasena: string) => {
  const url = await getServerUrl();
  const response = await axios.post(`${url}/api/usuarios/login`, { nombre, contrasena });
  return response.data;
};

export const empresasApi = {
  getAll: async () => {
    const url = await getServerUrl();
    const response = await axios.get(`${url}/api/pensionados/empresas`);
    return response.data;
  },
};