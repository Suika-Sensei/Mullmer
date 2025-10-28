// Root application component. Keeps the app shell minimal and delegates
// the main UI and logic to the `Home` page component.
import React from "react";
import Home from "./Home";

export default function App() {
  // Render the Home screen which contains camera preview, actions and results.
  return <Home />;
}
