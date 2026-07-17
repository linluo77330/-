import { GameTable } from './components/GameTable';
import { useBotPlayers } from './hooks/useBotPlayers';
import { useMahjongGame } from './hooks/useMahjongGame';
import './App.css';

export default function App() {
  const gameApi = useMahjongGame();
  useBotPlayers(gameApi.game, gameApi.snapshot);

  return (
    <div className="app">
      <GameTable gameApi={gameApi} />
    </div>
  );
}
