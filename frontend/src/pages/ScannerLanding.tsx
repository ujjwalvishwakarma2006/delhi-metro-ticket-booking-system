import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, LogIn, LogOut, Train } from 'lucide-react';

const ScannerLanding: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-4">
            <Train className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Delhi Metro</h1>
          <p className="text-xl text-gray-600">Station Scanner Terminals</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Entry Scanner */}
          <button
            onClick={() => navigate('/scanner/entry')}
            className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all p-8 text-center group border-4 border-transparent hover:border-green-500"
          >
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-6 group-hover:scale-110 transition-transform">
              <LogIn className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Entry Gate</h2>
            <p className="text-gray-600 mb-4">Scan passenger QR code for station entry</p>
            <div className="flex items-center justify-center gap-2 text-green-600 font-semibold">
              <ScanLine className="w-5 h-5" />
              <span>Start Scanning</span>
            </div>
          </button>

          {/* Exit Scanner */}
          <button
            onClick={() => navigate('/scanner/exit')}
            className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all p-8 text-center group border-4 border-transparent hover:border-red-500"
          >
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-red-500 to-orange-600 rounded-full mb-6 group-hover:scale-110 transition-transform">
              <LogOut className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Exit Gate</h2>
            <p className="text-gray-600 mb-4">Scan passenger QR code for station exit</p>
            <div className="flex items-center justify-center gap-2 text-red-600 font-semibold">
              <ScanLine className="w-5 h-5" />
              <span>Start Scanning</span>
            </div>
          </button>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Passenger Login →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScannerLanding;
