import api from './api';

export interface RechargeData {
  amount: number;
  paymentMethod: 'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking' | 'Wallet';
}

export interface CardBalance {
  cardId: number;
  balance: number;
  isActive: boolean;
  issuedAt: string;
  lastUsedAt?: string;
}

export interface RechargeHistory {
  rechargeId: number;
  amount: number;
  timestamp: string;
  paymentMethod: string;
}

export const cardService = {
  async registerCard(paymentMethod: string): Promise<{ success: boolean; data: { card: CardBalance } }> {
    const response = await api.post('/cards/register', { paymentMethod });
    return response.data;
  },

  async rechargeCard(data: RechargeData): Promise<{
    success: boolean;
    data: {
      newBalance: number;
      previousBalance: number;
      amountAdded: number;
      transactionId: string;
      rechargeId: number;
    };
  }> {
    const response = await api.post('/cards/recharge', data);
    return response.data;
  },

  async getBalance(): Promise<{ success: boolean; data: CardBalance }> {
    const response = await api.get('/cards/balance');
    return response.data;
  },

  async getCardDetails(): Promise<{
    success: boolean;
    data: {
      card: CardBalance;
      recentRecharges: RechargeHistory[];
    };
  }> {
    const response = await api.get('/cards');
    return response.data;
  },
};
