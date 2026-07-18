import { useState } from 'react';
import { CharacterSelectScreen } from './components/CharacterSelectScreen';
import { GameTable } from './components/GameTable';
import { MainMenuScreen } from './screens/MainMenuScreen';
import { OnlineLobbyScreen } from './screens/OnlineLobbyScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { useBotPlayers } from './hooks/useBotPlayers';
import { useMahjongGame } from './hooks/useMahjongGame';
import { useOnlineGame } from './hooks/useOnlineGame';
import type { Character } from './data/characters';
import './App.css';

type AppScreen =
  | { name: 'main' }
  | { name: 'settings' }
  | { name: 'online-select' }
  | { name: 'online'; character: Character }
  | { name: 'offline-select' }
  | { name: 'offline-game'; character: Character };

function OfflineGameSession({
  character,
  onExit,
}: {
  character: Character;
  onExit: () => void;
}) {
  const gameApi = useMahjongGame();
  useBotPlayers(gameApi.game, gameApi.snapshot);

  return (
    <GameTable
      mode="offline"
      gameApi={gameApi}
      character={character}
      onExit={onExit}
    />
  );
}

function OnlineSession({
  character,
  onExit,
}: {
  character: Character;
  onExit: () => void;
}) {
  const online = useOnlineGame();

  const handleExit = () => {
    online.disconnect();
    onExit();
  };

  if (online.inGame && online.view) {
    return (
      <GameTable mode="online" online={online} character={character} onExit={handleExit} />
    );
  }

  return (
    <OnlineLobbyScreen online={online} character={character} onBack={handleExit} />
  );
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>({ name: 'main' });

  return (
    <div className="app">
      {screen.name === 'main' && (
        <MainMenuScreen
          onOffline={() => setScreen({ name: 'offline-select' })}
          onOnline={() => setScreen({ name: 'online-select' })}
          onSettings={() => setScreen({ name: 'settings' })}
        />
      )}

      {screen.name === 'settings' && (
        <SettingsScreen onBack={() => setScreen({ name: 'main' })} />
      )}

      {screen.name === 'online-select' && (
        <CharacterSelectScreen
          mode="online"
          onConfirm={(character) => setScreen({ name: 'online', character })}
          onBack={() => setScreen({ name: 'main' })}
        />
      )}

      {screen.name === 'online' && (
        <OnlineSession
          character={screen.character}
          onExit={() => setScreen({ name: 'main' })}
        />
      )}

      {screen.name === 'offline-select' && (
        <CharacterSelectScreen
          onConfirm={(character) => setScreen({ name: 'offline-game', character })}
          onBack={() => setScreen({ name: 'main' })}
        />
      )}

      {screen.name === 'offline-game' && (
        <OfflineGameSession
          character={screen.character}
          onExit={() => setScreen({ name: 'main' })}
        />
      )}
    </div>
  );
}
