// Registra o service worker apenas em contexto seguro (https, ex.: Vercel).
// Em desenvolvimento local (http) o SW fica desativado para não atrapalhar.
if ("serviceWorker" in navigator && window.location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}