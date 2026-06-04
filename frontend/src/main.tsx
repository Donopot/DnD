import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { ensureStorageVersion } from "./utils/storageVersion";

ensureStorageVersion();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
