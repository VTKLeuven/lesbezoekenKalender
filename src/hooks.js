import React, { useEffect, useState } from "react";

export function useCheckForUpdates(webAppUrl, apiKey, refreshFlag) {
  const [lastModified, setLastModified] = useState(0);
  useEffect(() => {
    const checkLastModified = async () => {
      try {
        const response = await fetch(webAppUrl + "?action=checkUpdate");
        const sheetLastModified = await response.text(); // or .json() depending on your backend
        if (sheetLastModified > lastModified) {
          console.log("Sheet has been updated!");
          setLastModified(sheetLastModified);
          return true;
        } else if (sheetLastModified === lastModified) {
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
  }, [lastModified, webAppUrl, refreshFlag]);
}
