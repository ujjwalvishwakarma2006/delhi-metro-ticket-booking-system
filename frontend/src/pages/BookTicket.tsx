import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, IndianRupee, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { stationService } from '../services/stationService';
import { ticketService } from '../services/ticketService';
import QRCodeDisplay from '../components/QRCodeDisplay';
import type { Station } from '../services/stationService';

const BookTicket: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [fromStation, setFromStation] = useState<number>(0);
  const [toStation, setToStation] = useState<number>(0);
  const [fare, setFare] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const navigate = useNavigate();

  const paymentMethods = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Wallet'];

  useEffect(() => {
    fetchStations();
  }, []);

  useEffect(() => {
    if (fromStation && toStation && fromStation !== toStation) {
      fetchFare();
    } else {
      setFare(null);
    }
  }, [fromStation, toStation]);

  const fetchStations = async () => {
    try {
      const response = await stationService.getStations();
      setStations(response.data.stations);
    } catch (err) {
      setError('Failed to load stations');
    }
  };

  const fetchFare = async () => {
    try {
      const response = await stationService.getFare(fromStation, toStation);
      setFare(response.data.fare);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to calculate fare');
    }
  };

  const handleBookTicket = async () => {
    if (!fromStation || !toStation || !fare) return;

    setLoading(true);
    setError('');

    try {
      const response = await ticketService.bookTicket({
        fromStationId: fromStation,
        toStationId: toStation,
        paymentMethod: paymentMethod as any,
      });
      
      setTicketData(response.data);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to book ticket');
    } finally {
      setLoading(false);
    }
  };

  if (success && ticketData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Ticket Booked Successfully!</h2>
              <p className="text-gray-600 mt-2">Your QR ticket is ready</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">From</p>
                  <p className="font-semibold text-gray-900">{ticketData.from.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">To</p>
                  <p className="font-semibold text-gray-900">{ticketData.to.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Ticket ID</p>
                  <p className="font-semibold text-gray-900">{ticketData.ticketId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fare</p>
                  <p className="font-semibold text-gray-900">₹{ticketData.fare.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
              <p className="text-center text-sm font-semibold text-gray-700 mb-4">
                Show this QR code at entry gate
              </p>
              <div className="flex justify-center">
                <QRCodeDisplay data={ticketData.qrCodeData} size={250} />
              </div>
              <p className="text-center text-xs text-gray-500 mt-4">
                Ticket ID: {ticketData.ticketId}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => {
                  setSuccess(false);
                  setTicketData(null);
                  setFromStation(0);
                  setToStation(0);
                  setFare(null);
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Book Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Book QR Ticket</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-6">
            {/* From Station */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                From Station
              </label>
              <select
                value={fromStation}
                onChange={(e) => setFromStation(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value={0}>Select departure station</option>
                {stations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name} ({station.code})
                  </option>
                ))}
              </select>
            </div>

            {/* To Station */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                To Station
              </label>
              <select
                value={toStation}
                onChange={(e) => setToStation(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value={0}>Select destination station</option>
                {stations.map((station) => (
                  <option key={station.id} value={station.id} disabled={station.id === fromStation}>
                    {station.name} ({station.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Fare Display */}
            {fare !== null && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">Total Fare</span>
                  <span className="text-2xl font-bold text-blue-600 flex items-center">
                    <IndianRupee className="w-6 h-6" />
                    {fare.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CreditCard className="w-4 h-4 inline mr-1" />
                Payment Method
              </label>
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

            {/* Book Button */}
            <button
              onClick={handleBookTicket}
              disabled={!fromStation || !toStation || !fare || loading}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed text-lg"
            >
              {loading ? 'Booking...' : `Book Ticket ${fare ? `- ₹${fare.toFixed(2)}` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookTicket;
