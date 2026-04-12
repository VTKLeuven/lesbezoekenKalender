import { useEffect, useState } from "react";
import { callWebApp } from "./fetchData";

function getAuthHeader() {
  const token = sessionStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function UseCheckForUpdates({ refreshFlag, updateFunc }) {
  const [lastModified, setLastModified] = useState(0);

  useEffect(() => {
    const checkLastModified = async () => {
      try {
        const response = await fetch('/api/check-update', { headers: getAuthHeader() });
        const sheetLastModified = await response.json();
        if (sheetLastModified.lastModified > lastModified) {
          console.log("Sheet has been updated!");
          setLastModified(sheetLastModified.lastModified);
          const [newEvents] = await callWebApp();
          updateFunc(newEvents);
        } else if (sheetLastModified.lastModified !== lastModified) {
          throw new Error("SheetLastModified should not take this value");
        }
      } catch (error) {
        console.error("Error checking update:", error);
      }
    };

    checkLastModified();
  }, [lastModified, refreshFlag, updateFunc]);
}
