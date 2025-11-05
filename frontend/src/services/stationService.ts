import api from './api';

export interface Station {
  id: number;
  name: string;
  code: string;
  location: string;
  isOperational: boolean;
}

export interface FareResponse {
  success: boolean;
  data: {
    from: Station;
    to: Station;
    fare: number;
  };
}

export const stationService = {
  async getStations(): Promise<{ success: boolean; data: { stations: Station[] } }> {
    const response = await api.get('/stations');
    return response.data;
  },

  async getFare(fromStationId: number, toStationId: number): Promise<FareResponse> {
    const response = await api.get('/stations/fares', {
      params: { fromStationId, toStationId },
    });
    return response.data;
  },
};
