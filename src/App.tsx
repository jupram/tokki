import { SettingsView } from "./components/settings/SettingsView";
import { TokkiCharacter } from "./components/tokki/TokkiCharacter";

function App(): JSX.Element {
  const currentView =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("view") === "settings"
      ? "settings"
      : "main";

  if (currentView === "settings") {
    return <SettingsView />;
  }

  return (
    <main className="app-shell">
      <TokkiCharacter />
    </main>
  );
}

export default App;
