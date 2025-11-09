import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ScanLine, LogOut, MapPin, AlertCircle, CheckCircle, Loader, Keyboard, IndianRupee } from 'lucide-react';
import { journeyService } from '../services/journeyService';
import { stationService } from '../services/stationService';
import type { Station } from '../services/stationService';

const ExitScanner: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<number>(0);
  const [scanning, setScanning] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStations();
  }, []);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (scanning && selectedStation && !manualMode) {
      scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          handleScan(decodedText);
          scanner?.clear();
        },
        () => {
          // Ignore scanning errors, they're too noisy
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [scanning, selectedStation, manualMode]);

  const fetchStations = async () => {
    try {
      const response = await stationService.getStations();
      setStations(response.data.stations);
    } catch (err) {
      setError('Failed to load stations');
    }
  };

  const handleScan = async (qrData: string) => {
    setScanning(false);
    setProcessing(true);
    setError('');
    setResult(null);

    try {
      // Parse QR code data
      let mediaType: 'Ticket' | 'Card';
      let mediaId: number;

      if (qrData.startsWith('QR-')) {
        // Ticket format: QR-{ticketId}-{timestamp}
        mediaType = 'Ticket';
        const parts = qrData.split('-');
        mediaId = parseInt(parts[1]);
      } else if (qrData.startsWith('CARD-')) {
        // Card format: CARD-{cardId}
        mediaType = 'Card';
        mediaId = parseInt(qrData.split('-')[1]);
      } else {
        throw new Error('Invalid QR code format');
      }

      if (isNaN(mediaId)) {
        throw new Error('Invalid ID in QR code');
      }

      // Process exit
      const response = await journeyService.exit({
        mediaType,
        mediaId,
        stationId: selectedStation,
      });

      setResult(response);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to process exit');
    } finally {
      setProcessing(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualInput.trim()) {
      setError('Please enter a QR code or ID');
      return;
    }
    handleScan(manualInput.trim());
  };

  const handleReset = () => {
    setResult(null);
    setError('');
    setManualInput('');
    setScanning(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Exit Gate Scanner</h1>
                <p className="text-red-100 text-sm">Scan QR code for journey exit</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Station Selection */}
            {!result && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Select Exit Station
                </label>
                <select
                  value={selectedStation}
                  onChange={(e) => {
                    setSelectedStation(Number(e.target.value));
                    setScanning(false);
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none text-lg"
                >
                  <option value={0}>Select station...</option>
                  {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name} ({station.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Mode Toggle */}
            {!result && selectedStation > 0 && !scanning && (
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => {
                    setManualMode(false);
                    setScanning(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-4 rounded-lg font-semibold hover:bg-red-700 transition"
                >
                  <ScanLine className="w-5 h-5" />
                  Scan QR Code
                </button>
                <button
                  onClick={() => {
                    setManualMode(true);
                    setScanning(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-600 text-white py-4 rounded-lg font-semibold hover:bg-gray-700 transition"
                >
                  <Keyboard className="w-5 h-5" />
                  Manual Entry
                </button>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {/* Processing */}
            {processing && (
              <div className="text-center py-12">
                <Loader className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Processing exit...</p>
              </div>
            )}

            {/* QR Scanner */}
            {scanning && !manualMode && selectedStation > 0 && !processing && !result && (
              <div className="mb-6">
                <div id="qr-reader" className="rounded-lg overflow-hidden"></div>
                <button
                  onClick={() => setScanning(false)}
                  className="mt-4 w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Cancel Scanning
                </button>
              </div>
            )}

            {/* Manual Input */}
            {manualMode && !processing && !result && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter QR Code Data or ID
                </label>
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                  placeholder="QR-12-1234567890 or CARD-5"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none text-lg font-mono"
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleManualSubmit}
                    className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
                  >
                    Submit
                  </button>
                  <button
                    onClick={() => {
                      setManualMode(false);
                      setManualInput('');
                    }}
                    className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Success Result */}
            {result && result.success && (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Exit Permitted!</h2>
                <p className="text-gray-600 mb-6">{result.message}</p>
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div>
                      <p className="text-sm text-gray-600">Journey ID</p>
                      <p className="font-semibold text-gray-900">{result.data.journeyId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Media Type</p>
                      <p className="font-semibold text-gray-900">{result.data.mediaType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Exit Station</p>
                      <p className="font-semibold text-gray-900">{result.data.exitStationName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Fare Charged</p>
                      <p className="font-semibold text-green-700 flex items-center">
                        <IndianRupee className="w-4 h-4" />
                        {result.data.fareCharged.toFixed(2)}
                      </p>
                    </div>
                    {result.data.newBalance !== undefined && (
                      <>
                        <div>
                          <p className="text-sm text-gray-600">Previous Balance</p>
                          <p className="font-semibold text-gray-900">₹{result.data.previousBalance.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">New Balance</p>
                          <p className="font-semibold text-green-700">₹{result.data.newBalance.toFixed(2)}</p>
                        </div>
                      </>
                    )}
                  </div>
                  {result.data.warning && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">{result.data.warning}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleReset}
                  className="w-full bg-red-600 text-white py-4 rounded-lg font-semibold hover:bg-red-700 transition text-lg"
                >
                  Scan Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExitScanner;
