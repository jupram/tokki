import { TokkiCharacter } from "./components/tokki/TokkiCharacter";

function App(): JSX.Element {
  return (
    <main className="app-shell">
      <section className="panel">
        <h1>Tokki</h1>
        <p>
          Phase 1 character runtime: autonomous animation loop and interaction
          reactions.
        </p>
      </section>
      <TokkiCharacter />
    </main>
  );
}

export default App;
