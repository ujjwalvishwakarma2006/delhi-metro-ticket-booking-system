import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Circle, User, Ticket, CreditCard, LogIn, LogOut, RefreshCw } from 'lucide-react';

interface LogEvent {
  event: string;
  timestamp: string;
  data: any;
}

const LiveLogs: React.FC = () => {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const navigate = useNavigate();
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const connectWebSocket = () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setError('Authentication token not found');
      setConnected(false);
      return;
    }

    // Auto-detect WebSocket URL based on where frontend is accessed from
    const hostname = window.location.hostname;
    const WS_BASE_URL = (hostname === 'localhost' || hostname === '127.0.0.1') 
      ? 'ws://localhost:3000' 
      : `ws://${hostname}:3000`;
    
    const wsUrl = `${WS_BASE_URL}/api/logs/subscribe?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
        setError('');
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const logEvent = JSON.parse(event.data);
          if (logEvent && logEvent.event && logEvent.timestamp) {
            setLogs((prev) => [...prev, logEvent]);
          }
        } catch (err) {
          console.error('Failed to parse log event:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('WebSocket connection error. The service may be unavailable.');
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
        console.log('WebSocket disconnected');
        // Don't set error on normal close
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('WebSocket initialization failed:', err);
      setError('Failed to initialize WebSocket connection');
      setConnected(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'NEW_USER':
        return <User className="w-5 h-5" />;
      case 'TICKET_BOOKED':
        return <Ticket className="w-5 h-5" />;
      case 'CARD_REGISTERED':
      case 'CARD_RECHARGED':
        return <CreditCard className="w-5 h-5" />;
      case 'JOURNEY_ENTRY':
        return <LogIn className="w-5 h-5" />;
      case 'JOURNEY_EXIT':
        return <LogOut className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'NEW_USER':
        return 'bg-purple-100 text-purple-700';
      case 'TICKET_BOOKED':
        return 'bg-blue-100 text-blue-700';
      case 'CARD_REGISTERED':
        return 'bg-green-100 text-green-700';
      case 'CARD_RECHARGED':
        return 'bg-emerald-100 text-emerald-700';
      case 'JOURNEY_ENTRY':
        return 'bg-orange-100 text-orange-700';
      case 'JOURNEY_EXIT':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatEventName = (eventType: string) => {
    return eventType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-7 h-7" />
                Live System Activity
              </h1>
              <p className="text-gray-600 text-sm mt-1">Real-time events from the Delhi Metro system</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Circle
                  className={`w-3 h-3 ${connected ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'}`}
                />
                <span className={`text-sm font-medium ${connected ? 'text-green-600' : 'text-red-600'}`}>
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {logs.length > 0 && (
                <button
                  onClick={clearLogs}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4 max-h-[600px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Waiting for events...</p>
                <p className="text-gray-500 text-sm mt-2">
                  {connected ? 'Connected. Events will appear here in real-time.' : 'Trying to connect...'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getEventColor(log.event)}`}>
                        {getEventIcon(log.event)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-900">{formatEventName(log.event)}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="bg-gray-50 rounded p-2 text-sm text-gray-700">
                          {Object.entries(log.data).map(([key, value]) => (
                            <div key={key} className="flex gap-2">
                              <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                              <span className="font-medium">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveLogs;
