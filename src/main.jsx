import React from "react";
import ReactDOM from "react-dom/client";
import { initNative, hideSplash } from "./native.js";
import "./i18n";
import MansaRent from "./MansaRent.jsx";
import "./index.css";

initNative();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MansaRent />
  </React.StrictMode>
);

// L'écran de démarrage disparaît dès que la première page est peinte.
requestAnimationFrame(() => setTimeout(hideSplash, 120));
