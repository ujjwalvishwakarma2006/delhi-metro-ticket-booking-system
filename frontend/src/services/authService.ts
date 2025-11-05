import api from './api';

export interface SignupData {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      userId: number;
      name: string;
      email: string;
      phone: string;
      smartCard?: {
        cardId: number;
        balance: number;
        isActive: boolean;
      };
    };
  };
  message?: string;
}

export const authService = {
  async signup(data: SignupData): Promise<AuthResponse> {
    const response = await api.post('/auth/signup', data);
    return response.data;
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  async getProfile(): Promise<AuthResponse> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};
