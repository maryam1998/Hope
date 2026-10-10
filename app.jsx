import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App.jsx";

// ---------------------------------------------------------------------------
// Mount point — added so this file can run standalone in a browser (no
// bundler) via an import-map + Babel-standalone setup. See index.html.
// ---------------------------------------------------------------------------
const rootEl = document.getElementById("root");
ReactDOM.createRoot(rootEl).render(<App />);
