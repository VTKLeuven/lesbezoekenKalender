import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { callWebApp } from "./fetch-main.js";
import { webAppUrl, apiKey } from "./sensitiveData.js";

async function initApp() {
  const [initEvents, organisationsColorMap] = await callWebApp(
    webAppUrl,
    apiKey
  );
  const root = ReactDOM.createRoot(document.getElementById("root"));
  const safeCopy = structuredClone(initEvents);
  const organisationsColorMapSC = structuredClone(organisationsColorMap);
  root.render(
    <React.StrictMode>
      <App initialEvents={safeCopy} organisationCM={organisationsColorMapSC} />
    </React.StrictMode>
  );
}

initApp();
