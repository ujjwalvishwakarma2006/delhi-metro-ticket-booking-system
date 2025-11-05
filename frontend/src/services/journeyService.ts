import api from './api';

export interface JourneyEntryData {
  mediaType: 'Ticket' | 'Card';
  mediaId: number;
  stationId: number;
}

export interface JourneyExitData {
  mediaType: 'Ticket' | 'Card';
  mediaId: number;
  stationId: number;
}

export const journeyService = {
  async entry(data: JourneyEntryData): Promise<{
    success: boolean;
    message: string;
    data: {
      journeyId: number;
      mediaType: string;
      station: string;
    };
  }> {
    const response = await api.post('/journey/entry', data);
    return response.data;
  },

  async exit(data: JourneyExitData): Promise<{
    success: boolean;
    message: string;
    data: {
      fareCharged: number;
      newBalance?: number;
    };
  }> {
    const response = await api.post('/journey/exit', data);
    return response.data;
  },
};
