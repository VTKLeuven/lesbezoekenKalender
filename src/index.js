import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
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
  console.log(safeCopy);
  root.render(
    <React.StrictMode>
      <App initialEvents={safeCopy} organisationCM={organisationsColorMapSC} />
    </React.StrictMode>
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
initApp();
