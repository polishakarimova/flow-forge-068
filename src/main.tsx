import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// GitHub Pages SPA fix
if (sessionStorage.redirect) {
  const redirect = sessionStorage.redirect;
  delete sessionStorage.redirect;
  history.replaceState(null, '', redirect);
}

createRoot(document.getElementById("root")!).render(<App />);
