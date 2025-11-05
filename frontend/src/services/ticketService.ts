import api from './api';

export interface BookTicketData {
  fromStationId: number;
  toStationId: number;
  paymentMethod: 'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking' | 'Wallet';
}

export interface Ticket {
  ticketId: number;
  qrCodeData: string;
  from: {
    id: number;
    name: string;
    code: string;
  };
  to: {
    id: number;
    name: string;
    code: string;
  };
  fare: number;
  status: string;
  validFrom: string;
  validUntil: string;
}

export interface HistoryItem {
  type: 'TICKET' | 'CARD_JOURNEY';
  from: string;
  to: string;
  fare?: number;
  date: string;
  status?: string;
}

export const ticketService = {
  async bookTicket(data: BookTicketData): Promise<{ success: boolean; data: Ticket }> {
    const response = await api.post('/tickets/book', data);
    return response.data;
  },

  async getHistory(): Promise<{ success: boolean; data: { history: HistoryItem[] } }> {
    const response = await api.get('/tickets/history');
    return response.data;
  },
};
