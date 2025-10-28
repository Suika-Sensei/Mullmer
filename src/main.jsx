// Application entry point for the React frontend.
// Mounts the root React component into the #root DOM node using React 18's createRoot API.
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// Global styles
import "./App.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
