import { useState } from 'react';
import { CharacterSelectScreen } from './components/CharacterSelectScreen';
import { GameTable } from './components/GameTable';
import { MainMenuScreen } from './screens/MainMenuScreen';
import { OnlineLobbyScreen } from './screens/OnlineLobbyScreen';
import { RulesScreen } from './screens/RulesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { useBotPlayers } from './hooks/useBotPlayers';
import { useMahjongGame } from './hooks/useMahjongGame';
import { useOnlineGame } from './hooks/useOnlineGame';
import type { Character } from './data/characters';
import './App.css';

type AppScreen =
  | { name: 'main' }
  | { name: 'rules' }
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

function OnlineGameLoading({ message = '正在同步联机对局…' }: { message?: string }) {
  return (
    <div className="game-layout game-layout--loading">
      <div className="game-layout__loading-panel">
        <p>{message}</p>
        <p className="game-layout__loading-sub">若长时间无响应，请返回房间重新连接</p>
      </div>
    </div>
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

  const handleDisconnect = () => {
    online.disconnect();
    onExit();
  };

  const showGameTable = online.view !== null && online.view.phase !== 'idle';

  const waitingForGameSync =
    online.connected &&
    online.roomState?.inGame === true &&
    (online.view === null || online.view.phase === 'idle');

  if (waitingForGameSync) {
    return <OnlineGameLoading />;
  }

  if (showGameTable) {
    return (
      <GameTable
        mode="online"
        online={online}
        character={character}
        onExit={online.leaveGame}
      />
    );
  }

  return (
    <OnlineLobbyScreen
      online={online}
      character={character}
      onBack={handleDisconnect}
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
          onOnline={() => setScreen({ name: 'online-select' })}
          onRules={() => setScreen({ name: 'rules' })}
          onSettings={() => setScreen({ name: 'settings' })}
        />
      )}

      {screen.name === 'rules' && (
        <RulesScreen onBack={() => setScreen({ name: 'main' })} />
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
