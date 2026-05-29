import React from "react";
import ReactDOM from "react-dom/client";
import { Shield, Server, Database, Boxes } from "lucide-react";
import "./styles.css";

const checks = [
  {
    icon: Shield,
    title: "Compartimente",
    body: "Depot, services, secrets, volumes et sauvegardes separes du SaaS documentaire.",
  },
  {
    icon: Server,
    title: "Pret pour Caddy",
    body: "Frontend et backend exposes en loopback pour le routage HTTPS par sous-domaine.",
  },
  {
    icon: Database,
    title: "Donnees dediees",
    body: "PostgreSQL, MinIO et Redis appartiennent uniquement au SaaS D&D.",
  },
  {
    icon: Boxes,
    title: "Base MVP",
    body: "Socle pret pour auth, campagnes, cartes, tokens, fiches et temps reel.",
  },
];

function App() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">DnD SaaS</p>
        <h1>Socle isole pour le VTT D&D</h1>
        <p className="lede">
          La phase 1 pose une application separee, deployable sur le HP Mini,
          avec son propre backend, frontend, stockage, base et reseau Docker.
        </p>
      </section>

      <section className="grid" aria-label="Etat du socle technique">
        {checks.map((item) => {
          const Icon = item.icon;
          return (
            <article className="card" key={item.title}>
              <Icon aria-hidden="true" />
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

