import React, { useEffect, useState } from "react";

export function UseCheckForUpdates({ webAppUrl, apiKey, refreshFlag }) {
  const [lastModified, setLastModified] = useState(0);
  useEffect(() => {
    const checkLastModified = async () => {
      try {
        const url = `${webAppUrl}?key=${apiKey}&action=checkUpdate`;
        const response = await fetch(url);
        const sheetLastModified = await response.json(); // or .json() depending on your backend
        if (sheetLastModified.lastModified > lastModified) {
          console.log("Sheet has been updated!");
          setLastModified(sheetLastModified.lastModified);
          return true;
        } else if (sheetLastModified.lastModified === lastModified) {
          console.log("No updates detected.");
          return false;
        } else {
          throw new Error("SheetLastModified should not take this value");
        }
      } catch (error) {
        console.error("Error checking update:", error);
      }
    };

    checkLastModified();
    // Eslint deed hier moeilijk, alleen refreshFlag zou moeten veranderen.
  }, [lastModified, webAppUrl, apiKey, refreshFlag]);
}
