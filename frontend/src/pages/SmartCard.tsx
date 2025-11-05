import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, IndianRupee, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { cardService } from '../services/cardService';
import { useAuth } from '../context/AuthContext';
import type { CardBalance, RechargeHistory } from '../services/cardService';

const SmartCard: React.FC = () => {
  const [cardDetails, setCardDetails] = useState<CardBalance | null>(null);
  const [rechargeHistory, setRechargeHistory] = useState<RechargeHistory[]>([]);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const paymentMethods = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Wallet'];

  useEffect(() => {
    fetchCardDetails();
  }, []);

  const fetchCardDetails = async () => {
    setPageLoading(true);
    setError('');
    
    try {
      // Try to get card balance first (simpler endpoint)
      const balanceResponse = await cardService.getBalance();
      setCardDetails(balanceResponse.data);
      
      // Then try to get full details with recharge history
      try {
        const detailsResponse = await cardService.getCardDetails();
        setCardDetails(detailsResponse.data.card);
        setRechargeHistory(detailsResponse.data.recentRecharges);
      } catch (detailsErr) {
        // It's ok if detailed history fails, we have balance
        console.log('Using balance info only, history unavailable');
        setRechargeHistory([]);
      }
    } catch (err: any) {
      console.error('Error fetching card details:', err);
      if (err.response?.status === 404) {
        // User doesn't have a card yet
        setCardDetails(null);
      } else {
        setError('Failed to load card details. Please try again.');
      }
    } finally {
      setPageLoading(false);
    }
  };

  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    
    if (!amount || amount < 10 || amount > 10000) {
      setError('Amount must be between ₹10 and ₹10,000');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await cardService.rechargeCard({
        amount,
        paymentMethod: paymentMethod as any,
      });
      
      setSuccess(`Successfully recharged ₹${amount}. New balance: ₹${response.data.newBalance.toFixed(2)}`);
      setRechargeAmount('');
      
      // Refresh card details and user context
      await fetchCardDetails();
      await refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to recharge card');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterCard = async () => {
    setLoading(true);
    setError('');

    try {
      await cardService.registerCard(paymentMethod);
      setSuccess('Smart card registered successfully! Registration fee: ₹50');
      
      // Refresh card details and user context
      await fetchCardDetails();
      await refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register card');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading card details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Smart Card Management</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {!cardDetails ? (
          // Register Card Section
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <CreditCard className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">No Smart Card Found</h2>
              <p className="text-gray-600 mt-2">Register a new smart card to enjoy seamless travel</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Registration Fee:</strong> ₹50.00
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`px-4 py-3 rounded-lg border-2 transition ${
                      paymentMethod === method
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleRegisterCard}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Registering...' : 'Register Smart Card - ₹50'}
            </button>
          </div>
        ) : (
          // Card Details & Recharge Section
          <div className="space-y-6">
            {/* Card Balance */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Current Balance</p>
                  <h2 className="text-4xl font-bold flex items-center">
                    <IndianRupee className="w-8 h-8" />
                    {cardDetails.balance.toFixed(2)}
                  </h2>
                </div>
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <CreditCard className="w-8 h-8" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-blue-400">
                <div>
                  <p className="text-blue-100 text-xs mb-1">Card ID</p>
                  <p className="font-semibold">{cardDetails.cardId}</p>
                </div>
                <div>
                  <p className="text-blue-100 text-xs mb-1">Status</p>
                  <p className="font-semibold">{cardDetails.isActive ? 'Active' : 'Inactive'}</p>
                </div>
              </div>
            </div>

            {/* Recharge Section */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Recharge Card
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹10 - ₹10,000)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={rechargeAmount}
                      onChange={(e) => setRechargeAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Enter amount"
                      min="10"
                      max="10000"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[100, 200, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setRechargeAmount(amt.toString())}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {paymentMethods.map((method) => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`px-4 py-2 rounded-lg border-2 transition text-sm ${
                          paymentMethod === method
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleRecharge}
                  disabled={loading || !rechargeAmount}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Recharge Now'}
                </button>
              </div>
            </div>

            {/* Recharge History */}
            {rechargeHistory.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Recharges
                </h3>
                <div className="space-y-3">
                  {rechargeHistory.map((recharge) => (
                    <div key={recharge.rechargeId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-gray-900">₹{recharge.amount.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">{recharge.paymentMethod}</p>
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(recharge.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartCard;
