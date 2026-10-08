import { useState, useEffect, useCallback, useRef } from 'react';

// Types
type Position = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Difficulty = 'easy' | 'medium' | 'hard';
type GameState = 'idle' | 'playing' | 'paused' | 'gameover';

// Constants
const GRID_SIZE = 20;
const CELL_SIZE_DESKTOP = 24;
const DIFFICULTY_SPEEDS: Record<Difficulty, number> = {
  easy: 180,
  medium: 120,
  hard: 70,
};
const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
};
const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: 'bg-green-100 text-green-700 border-green-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  hard: 'bg-red-100 text-red-700 border-red-300',
};

const INITIAL_SNAKE: Position[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

function getRandomFood(snake: Position[]): Position {
  let food: Position;
  do {
    food = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some((seg) => seg.x === food.x && seg.y === food.y));
  return food;
}

function getHighScore(): number {
  try {
    return parseInt(localStorage.getItem('snake-high-score') || '0', 10);
  } catch {
    return 0;
  }
}

function setHighScore(score: number) {
  try {
    localStorage.setItem('snake-high-score', score.toString());
  } catch {
    // ignore
  }
}

export default function App() {
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Position>(() => getRandomFood(INITIAL_SNAKE));
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScoreState] = useState(getHighScore);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [showParticles, setShowParticles] = useState<{ x: number; y: number; id: number }[]>([]);

  const directionRef = useRef<Direction>('RIGHT');
  const gameStateRef = useRef<GameState>('idle');
  const snakeRef = useRef<Position[]>(INITIAL_SNAKE);
  const foodRef = useRef<Position>(food);
  const scoreRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const particleIdRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { foodRef.current = food; }, [food]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  const resetGame = useCallback(() => {
    const newSnake = [...INITIAL_SNAKE];
    setSnake(newSnake);
    setFood(getRandomFood(newSnake));
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    setScore(0);
    scoreRef.current = 0;
    setShowParticles([]);
  }, []);

  const startGame = useCallback(() => {
    resetGame();
    setGameState('playing');
  }, [resetGame]);

  const togglePause = useCallback(() => {
    if (gameStateRef.current === 'playing') {
      setGameState('paused');
    } else if (gameStateRef.current === 'paused') {
      setGameState('playing');
    }
  }, []);

  const changeDirection = useCallback((newDir: Direction) => {
    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT',
    };
    if (opposites[newDir] !== directionRef.current) {
      setDirection(newDir);
      directionRef.current = newDir;
    }
  }, []);

  // Add particle effect
  const addParticle = useCallback((x: number, y: number) => {
    const id = particleIdRef.current++;
    setShowParticles(prev => [...prev, { x, y, id }]);
    setTimeout(() => {
      setShowParticles(prev => prev.filter(p => p.id !== id));
    }, 600);
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      const currentSnake = snakeRef.current;
      const currentDirection = directionRef.current;
      const currentFood = foodRef.current;

      const head = currentSnake[0];
      let newHead: Position;

      switch (currentDirection) {
        case 'UP': newHead = { x: head.x, y: head.y - 1 }; break;
        case 'DOWN': newHead = { x: head.x, y: head.y + 1 }; break;
        case 'LEFT': newHead = { x: head.x - 1, y: head.y }; break;
        case 'RIGHT': newHead = { x: head.x + 1, y: head.y }; break;
      }

      // Wall collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameState('gameover');
        const currentScore = scoreRef.current;
        const hs = getHighScore();
        if (currentScore > hs) {
          setHighScore(currentScore);
          setHighScoreState(currentScore);
        }
        return;
      }

      // Self collision
      if (currentSnake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
        setGameState('gameover');
        const currentScore = scoreRef.current;
        const hs = getHighScore();
        if (currentScore > hs) {
          setHighScore(currentScore);
          setHighScoreState(currentScore);
        }
        return;
      }

      const newSnake = [newHead, ...currentSnake];
      let newFood = currentFood;

      // Food collision
      if (newHead.x === currentFood.x && newHead.y === currentFood.y) {
        const newScore = scoreRef.current + 10;
        setScore(newScore);
        scoreRef.current = newScore;
        newFood = getRandomFood(newSnake);
        setFood(newFood);
        foodRef.current = newFood;
        addParticle(currentFood.x, currentFood.y);
      } else {
        newSnake.pop();
      }

      setSnake(newSnake);
      snakeRef.current = newSnake;
    }, DIFFICULTY_SPEEDS[difficulty]);

    return () => clearInterval(interval);
  }, [gameState, difficulty, addParticle]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          if (gameStateRef.current === 'playing') changeDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          if (gameStateRef.current === 'playing') changeDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          if (gameStateRef.current === 'playing') changeDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          if (gameStateRef.current === 'playing') changeDirection('RIGHT');
          break;
        case ' ':
          e.preventDefault();
          if (gameStateRef.current === 'playing' || gameStateRef.current === 'paused') {
            togglePause();
          } else if (gameStateRef.current === 'idle' || gameStateRef.current === 'gameover') {
            startGame();
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (gameStateRef.current === 'playing') togglePause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, togglePause, startGame]);

  // Touch controls
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const minSwipe = 30;

    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

    if (gameStateRef.current !== 'playing') return;

    if (Math.abs(dx) > Math.abs(dy)) {
      changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      changeDirection(dy > 0 ? 'DOWN' : 'UP');
    }
    touchStartRef.current = null;
  }, [changeDirection]);

  // Calculate responsive cell size
  const [cellSize, setCellSize] = useState(CELL_SIZE_DESKTOP);
  useEffect(() => {
    const updateSize = () => {
      const maxWidth = Math.min(window.innerWidth - 32, 560);
      const maxHeight = window.innerHeight - 320;
      const size = Math.floor(Math.min(maxWidth, maxHeight) / GRID_SIZE);
      setCellSize(Math.max(14, Math.min(size, CELL_SIZE_DESKTOP)));
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const boardSize = GRID_SIZE * cellSize;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-4 select-none">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-1">
          🐍 Snake Game
        </h1>
        <p className="text-slate-500 text-sm">Jogo da Cobrinha</p>
      </div>

      {/* Score Board */}
      <div className="flex gap-4 md:gap-8 mb-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-2 text-center min-w-[100px]">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Pontos</div>
          <div className="text-2xl font-bold text-slate-800">{score}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-2 text-center min-w-[100px]">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Recorde</div>
          <div className="text-2xl font-bold text-amber-600">🏆 {highScore}</div>
        </div>
      </div>

      {/* Difficulty Selector */}
      <div className="flex gap-2 mb-4">
        {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
          <button
            key={d}
            onClick={() => {
              if (gameState !== 'playing') setDifficulty(d);
            }}
            disabled={gameState === 'playing'}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
              difficulty === d
                ? `${DIFFICULTY_COLORS[d]} shadow-sm scale-105`
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
            } ${gameState === 'playing' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {DIFFICULTY_LABELS[d]}
          </button>
        ))}
      </div>

      {/* Game Board */}
      <div
        className="relative bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
        style={{ width: boardSize, height: boardSize }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)`,
            backgroundSize: `${cellSize}px ${cellSize}px`,
          }}
        />

        {/* Food */}
        <div
          className="absolute rounded-full transition-all duration-200 animate-pulse"
          style={{
            width: cellSize - 4,
            height: cellSize - 4,
            left: food.x * cellSize + 2,
            top: food.y * cellSize + 2,
            background: 'radial-gradient(circle, #ef4444, #dc2626)',
            boxShadow: '0 0 8px rgba(239, 68, 68, 0.4)',
          }}
        />

        {/* Particles */}
        {showParticles.map((p) => (
          <div
            key={p.id}
            className="absolute pointer-events-none"
            style={{
              left: p.x * cellSize + cellSize / 2,
              top: p.y * cellSize + cellSize / 2,
            }}
          >
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-amber-400"
                style={{
                  animation: `particle-fly 0.6s ease-out forwards`,
                  animationDelay: `${i * 50}ms`,
                  transform: `rotate(${i * 60}deg) translateY(0)`,
                }}
              />
            ))}
          </div>
        ))}

        {/* Snake */}
        {snake.map((segment, index) => {
          const isHead = index === 0;
          const progress = index / snake.length;
          return (
            <div
              key={`${segment.x}-${segment.y}-${index}`}
              className="absolute rounded-md transition-all duration-75"
              style={{
                width: cellSize - 2,
                height: cellSize - 2,
                left: segment.x * cellSize + 1,
                top: segment.y * cellSize + 1,
                background: isHead
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                  : `linear-gradient(135deg, hsl(${142 - progress * 20}, ${70 - progress * 15}%, ${45 + progress * 10}%), hsl(${142 - progress * 20}, ${65 - progress * 15}%, ${40 + progress * 10}%))`,
                boxShadow: isHead ? '0 2px 8px rgba(34, 197, 94, 0.4)' : 'none',
                borderRadius: isHead ? '6px' : '4px',
                zIndex: snake.length - index,
              }}
            >
              {isHead && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Overlays */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            <div className="text-5xl mb-4 animate-bounce">🐍</div>
            <h2 className="text-xl font-bold text-slate-700 mb-2">Pronto para jogar?</h2>
            <p className="text-slate-500 text-sm mb-4 text-center px-4">
              Use as setas ou WASD para mover<br />
              Deslize na tela para controlar no mobile
            </p>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
            >
              ▶ Iniciar Jogo
            </button>
            <p className="text-xs text-slate-400 mt-3">ou pressione Espaço</p>
          </div>
        )}

        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            <div className="text-4xl mb-3">⏸️</div>
            <h2 className="text-xl font-bold text-slate-700 mb-4">Pausado</h2>
            <button
              onClick={togglePause}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
            >
              ▶ Continuar
            </button>
            <p className="text-xs text-slate-400 mt-3">ou pressione Espaço</p>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            <div className="text-4xl mb-3">💀</div>
            <h2 className="text-xl font-bold text-slate-700 mb-1">Fim de Jogo!</h2>
            <p className="text-3xl font-bold text-green-600 mb-1">{score} pts</p>
            {score >= highScore && score > 0 && (
              <p className="text-amber-600 font-semibold text-sm mb-2 animate-pulse">🎉 Novo Recorde!</p>
            )}
            <p className="text-slate-500 text-sm mb-4">Recorde: {highScore} pts</p>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
            >
              🔄 Jogar Novamente
            </button>
            <p className="text-xs text-slate-400 mt-3">ou pressione Espaço</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3 mt-4">
        {gameState === 'playing' && (
          <button
            onClick={togglePause}
            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium rounded-lg border border-blue-200 transition-all duration-200 active:scale-95"
          >
            ⏸ Pausar
          </button>
        )}
        {gameState === 'paused' && (
          <button
            onClick={togglePause}
            className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 font-medium rounded-lg border border-green-200 transition-all duration-200 active:scale-95"
          >
            ▶ Continuar
          </button>
        )}
        {(gameState === 'playing' || gameState === 'paused') && (
          <button
            onClick={startGame}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg border border-slate-200 transition-all duration-200 active:scale-95"
          >
            🔄 Reiniciar
          </button>
        )}
      </div>

      {/* Mobile D-Pad */}
      <div className="mt-4 md:hidden">
        <div className="grid grid-cols-3 gap-1 w-36 mx-auto">
          <div />
          <button
            onTouchStart={(e) => { e.preventDefault(); if (gameState === 'playing') changeDirection('UP'); }}
            className="w-12 h-12 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-center text-xl active:bg-slate-100 active:scale-95 transition-all"
          >
            ↑
          </button>
          <div />
          <button
            onTouchStart={(e) => { e.preventDefault(); if (gameState === 'playing') changeDirection('LEFT'); }}
            className="w-12 h-12 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-center text-xl active:bg-slate-100 active:scale-95 transition-all"
          >
            ←
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); if (gameState === 'playing') changeDirection('DOWN'); }}
            className="w-12 h-12 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-center text-xl active:bg-slate-100 active:scale-95 transition-all"
          >
            ↓
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); if (gameState === 'playing') changeDirection('RIGHT'); }}
            className="w-12 h-12 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-center text-xl active:bg-slate-100 active:scale-95 transition-all"
          >
            →
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 text-center text-xs text-slate-400 hidden md:block">
        <p>⌨️ Setas/WASD para mover • Espaço para pausar • Esc para pausar</p>
      </div>
    </div>
  );
}
