import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, History as HistoryIcon, Ticket, CreditCard, MapPin, IndianRupee, Calendar } from 'lucide-react';
import { ticketService } from '../services/ticketService';
import type { HistoryItem } from '../services/ticketService';

const History: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await ticketService.getHistory();
      const rawHistory = response.data.history || [];
      
      // Transform backend response to match frontend expectations
      const transformedHistory = rawHistory.map((item: any) => ({
        type: item.type,
        from: item.fromStation || item.from || 'Unknown',
        to: item.toStation || item.to || 'Unknown',
        fare: item.fare,
        date: item.date,
        status: item.journeyStatus || item.status,
      }));
      
      setHistory(transformedHistory);
    } catch (err: any) {
      console.error('Error fetching history:', err);
      setError(err.response?.data?.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

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

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <HistoryIcon className="w-7 h-7" />
            Journey History
          </h1>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
              <p className="text-gray-600 mt-4">Loading history...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <HistoryIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No journey history yet</p>
              <p className="text-gray-500 text-sm mt-2">Your completed journeys will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {item.type === 'TICKET' ? (
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Ticket className="w-5 h-5 text-blue-600" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-green-600" />
                        </div>
                      )}
                      <div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                          item.type === 'TICKET' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {item.type === 'TICKET' ? 'QR Ticket' : 'Smart Card'}
                        </span>
                        {item.status && (
                          <span className="text-xs ml-2 px-2 py-1 rounded bg-gray-100 text-gray-700">
                            {item.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-gray-600 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>{item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.date ? new Date(item.date).toLocaleTimeString() : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-gray-700">
                        <MapPin className="w-4 h-4 text-green-600" />
                        <span className="font-semibold">{item.from || 'Unknown'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <div className="h-px bg-gray-300 w-8"></div>
                      <span className="text-xs">→</span>
                      <div className="h-px bg-gray-300 w-8"></div>
                    </div>
                    <div className="flex-1 text-right">
                      <div className="flex items-center gap-2 justify-end text-gray-700">
                        <span className="font-semibold">{item.to || 'Unknown'}</span>
                        <MapPin className="w-4 h-4 text-red-600" />
                      </div>
                    </div>
                  </div>

                  {item.fare !== null && item.fare !== undefined && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Fare Paid</span>
                        <span className="font-semibold text-gray-900 flex items-center">
                          <IndianRupee className="w-4 h-4" />
                          {Number(item.fare).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
