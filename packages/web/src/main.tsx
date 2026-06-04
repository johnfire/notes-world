import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { reportClientError } from "./api";
import "./i18n";
import "./index.css";

// Catch errors that escape React's render tree (event handlers, async code).
window.addEventListener("error", (event) => {
  reportClientError({
    message: event.message || String(event.error),
    stack: event.error?.stack,
    context: "window.onerror",
  });
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason as
    | { message?: string; stack?: string }
    | undefined;
  reportClientError({
    message: reason?.message ?? String(event.reason),
    stack: reason?.stack,
    context: "unhandledrejection",
  });
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
