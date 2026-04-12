import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import App from './App';
import LoginPage from './LoginPage';
import { callWebApp } from './fetch-main';
import { AlertTriangle } from 'lucide-react';

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #e0e7ff 50%, #f1f5f9 100%)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
        </div>
        <p className="text-slate-500 text-sm font-medium">Loading calendar…</p>
      </div>
    </div>
  );
}

export default function Root() {
  const { user, loading: authLoading } = useAuth();
  const [appData, setAppData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState(null);

  useEffect(() => {
    if (!user) {
      setAppData(null);
      setDataError(null);
      return;
    }
    setDataLoading(true);
    setDataError(null);
    callWebApp()
      .then(([events, colorMap]) => {
        setAppData({
          events: structuredClone(events),
          colorMap: structuredClone(colorMap),
        });
      })
      .catch(err => setDataError(err.message))
      .finally(() => setDataLoading(false));
  }, [user]);

  if (authLoading || dataLoading) return <Spinner />;

  if (!user) return <LoginPage />;

  if (dataError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #e0e7ff 50%, #f1f5f9 100%)' }}>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center"
          style={{ boxShadow: '0 20px 60px -10px rgba(0,0,0,0.15)' }}>
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Failed to load calendar</h2>
          <p className="text-slate-500 text-sm mb-6">{dataError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #4338ca, #3b82f6)', boxShadow: '0 4px 12px rgba(67,56,202,0.3)' }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <App
      initialEvents={appData?.events ?? []}
      organisationCM={appData?.colorMap ?? new Map()}
    />
  );
}
