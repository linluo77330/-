import { useState } from 'react';
import { CharacterSelectScreen } from './components/CharacterSelectScreen';
import { GameTable } from './components/GameTable';
import { useBotPlayers } from './hooks/useBotPlayers';
import { useMahjongGame } from './hooks/useMahjongGame';
import type { Character } from './data/characters';
import './App.css';

function GameSession({
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
  const [character, setCharacter] = useState<Character | null>(null);

  if (!character) {
    return (
      <div className="app">
        <CharacterSelectScreen onConfirm={setCharacter} />
      </div>
    );
  }

  return (
    <div className="app">
      <GameSession character={character} onChangeCharacter={() => setCharacter(null)} />
    </div>
  );
}
