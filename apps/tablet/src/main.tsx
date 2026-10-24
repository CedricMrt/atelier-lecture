import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { seedDemoData } from "./db/demoData";

seedDemoData().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
