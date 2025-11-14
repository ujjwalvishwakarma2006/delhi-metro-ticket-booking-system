import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Ticket, CreditCard, History, User, LogOut, Wallet } from 'lucide-react';
import { cardService } from '../services/cardService';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    const fetchBalance = async () => {
      if (user?.smartCard) {
        try {
          const balanceResponse = await cardService.getBalance();
          setBalance(balanceResponse.data.balance);
        } catch (error) {
          console.error('Failed to fetch balance:', error);
        }
      }
    };
    fetchBalance();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const cards = [
    {
      title: 'Book Ticket',
      description: 'Book a QR ticket for your journey',
      icon: Ticket,
      color: 'bg-blue-500',
      path: '/book-ticket',
    },
    {
      title: 'Smart Card',
      description: 'Manage your metro smart card',
      icon: CreditCard,
      color: 'bg-green-500',
      path: '/smart-card',
    },
    {
      title: 'Journey History',
      description: 'View your travel history',
      icon: History,
      color: 'bg-purple-500',
      path: '/history',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Smart Card Balance */}
        {user?.smartCard && (
          <div className="mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 mb-1">Smart Card Balance</p>
                <h3 className="text-4xl font-bold">₹{balance.toFixed(2)}</h3>
                <p className="text-blue-100 mt-2 text-sm">Card ID: {user.smartCard.cardId || 'N/A'}</p>
              </div>
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Wallet className="w-8 h-8" />
              </div>
            </div>
          </div>
        )}

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card) => (
            <button
              key={card.title}
              onClick={() => navigate(card.path)}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 text-left group"
            >
              <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
              <p className="text-gray-600 text-sm">{card.description}</p>
            </button>
          ))}
        </div>

        {/* Welcome Section */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Welcome to Delhi Metro! 🚇</h3>
          <div className="space-y-3 text-gray-700">
            <p className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Book QR tickets for instant journeys or use your smart card for seamless travel</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Recharge your smart card anytime with multiple payment options</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Track all your journeys and transactions in real-time</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
