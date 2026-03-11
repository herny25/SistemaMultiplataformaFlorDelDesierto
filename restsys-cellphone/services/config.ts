import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_IP = '192.168.1.100';

export const getServerUrl = async (): Promise<string> => {
  const saved = await AsyncStorage.getItem('server_ip');
  return `http://${saved || DEFAULT_IP}`;
};

export const getWsUrl = async (): Promise<string> => {
  const saved = await AsyncStorage.getItem('server_ip');
  return `http://${saved || DEFAULT_IP}`;
};

export const saveServerIp = async (ip: string) =>
  AsyncStorage.setItem('server_ip', ip);

export const getSavedIp = async (): Promise<string> =>
  (await AsyncStorage.getItem('server_ip')) || DEFAULT_IP;