import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import BookTicket from './pages/BookTicket';
import SmartCard from './pages/SmartCard';
import History from './pages/History';
import LiveLogs from './pages/LiveLogs';
import EntryScanner from './pages/EntryScanner';
import ExitScanner from './pages/ExitScanner';
import ScannerLanding from './pages/ScannerLanding';
import './App.css';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return token ? <>{children}</> : <Navigate to="/login" />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return token ? <Navigate to="/dashboard" /> : <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <ErrorBoundary>
              <Dashboard />
            </ErrorBoundary>
          </PrivateRoute>
        }
      />
      <Route
        path="/book-ticket"
        element={
          <PrivateRoute>
            <ErrorBoundary>
              <BookTicket />
            </ErrorBoundary>
          </PrivateRoute>
        }
      />
      <Route
        path="/smart-card"
        element={
          <PrivateRoute>
            <ErrorBoundary>
              <SmartCard />
            </ErrorBoundary>
          </PrivateRoute>
        }
      />
      <Route
        path="/history"
        element={
          <PrivateRoute>
            <ErrorBoundary>
              <History />
            </ErrorBoundary>
          </PrivateRoute>
        }
      />
      <Route
        path="/live-logs"
        element={
          <PrivateRoute>
            <ErrorBoundary>
              <LiveLogs />
            </ErrorBoundary>
          </PrivateRoute>
        }
      />
      <Route
        path="/scanner/entry"
        element={
          <ErrorBoundary>
            <EntryScanner />
          </ErrorBoundary>
        }
      />
      <Route
        path="/scanner/exit"
        element={
          <ErrorBoundary>
            <ExitScanner />
          </ErrorBoundary>
        }
      />
      <Route
        path="/scanners"
        element={
          <ErrorBoundary>
            <ScannerLanding />
          </ErrorBoundary>
        }
      />
      <Route path="/" element={<ScannerLanding />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
