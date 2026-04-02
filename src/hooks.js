import { useEffect, useState } from "react";
import { callWebApp } from "./fetch-main";

export function UseCheckForUpdates({
  webAppUrl,
  apiKey,
  refreshFlag,
  updateFunc,
}) {
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
          const [newEvents] = await callWebApp(webAppUrl, apiKey);
          updateFunc(newEvents);
          return;
        } else if (sheetLastModified.lastModified === lastModified) {
          return;
        } else {
          throw new Error("SheetLastModified should not take this value");
        }
      } catch (error) {
        console.error("Error checking update:", error);
      }
    };

    checkLastModified();
  }, [lastModified, webAppUrl, apiKey, refreshFlag, updateFunc]);
}
