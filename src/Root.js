import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import App from './App';
import LoginPage from './LoginPage';
import { callWebApp } from './fetch-main';

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

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }

  if (!user) return <LoginPage />;

  if (dataError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-red-600 font-medium">Failed to load calendar data</p>
          <p className="text-gray-500 text-sm mt-1">{dataError}</p>
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
