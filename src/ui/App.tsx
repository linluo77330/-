import { useState } from 'react';
import { CharacterSelectScreen } from './components/CharacterSelectScreen';
import { GameTable } from './components/GameTable';
import { MainMenuScreen } from './screens/MainMenuScreen';
import { OnlineLobbyScreen } from './screens/OnlineLobbyScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { useBotPlayers } from './hooks/useBotPlayers';
import { useMahjongGame } from './hooks/useMahjongGame';
import type { Character } from './data/characters';
import './App.css';

type AppScreen =
  | { name: 'main' }
  | { name: 'settings' }
  | { name: 'online' }
  | { name: 'offline-select' }
  | { name: 'offline-game'; character: Character };

function OfflineGameSession({
  character,
  onChangeCharacter,
}: {
  character: Character;
  onChangeCharacter: () => void;
}) {
  const gameApi = useMahjongGame();
  useBotPlayers(gameApi.game, gameApi.snapshot);

  return (
    <GameTable
      gameApi={gameApi}
      character={character}
      onChangeCharacter={onChangeCharacter}
    />
  );
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>({ name: 'main' });

  return (
    <div className="app">
      {screen.name === 'main' && (
        <MainMenuScreen
          onOffline={() => setScreen({ name: 'offline-select' })}
          onOnline={() => setScreen({ name: 'online' })}
          onSettings={() => setScreen({ name: 'settings' })}
        />
      )}

      {screen.name === 'settings' && (
        <SettingsScreen onBack={() => setScreen({ name: 'main' })} />
      )}

      {screen.name === 'online' && (
        <OnlineLobbyScreen onBack={() => setScreen({ name: 'main' })} />
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
          onChangeCharacter={() => setScreen({ name: 'offline-select' })}
        />
      )}
    </div>
  );
}
