import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));

// Faint full-screen background image on the body (paints behind all content),
// so it is only visible in empty background areas, not over zones/cards.
// Set at runtime to avoid webpack trying to bundle the public asset URL.
document.body.style.background =
  "linear-gradient(rgba(10,21,38,0.94), rgba(10,21,38,0.94)), url('/bg-piston.jpg')";
document.body.style.backgroundSize = "cover";
document.body.style.backgroundPosition = "center";
document.body.style.backgroundAttachment = "fixed";
document.body.style.backgroundRepeat = "no-repeat";

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);

// PWA: register service worker for installability and offline app shell.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  });
}
