"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const GRID = 20;
const CELL = 20;
const INITIAL_SPEED = 120;
const SPEED_INCREMENT = 2;
const MIN_SPEED = 50;

type Point = { x: number; y: number };
type Dir = { x: number; y: number };

const DIRS: Record<string, Dir> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

function randomFood(snake: Point[]): Point {
  let p: Point;
  do {
    p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (snake.some((s) => s.x === p.x && s.y === p.y));
  return p;
}

export default function Home() {
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 15, y: 10 });
  const [dir, setDir] = useState<Dir>({ x: 1, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const dirRef = useRef(dir);
  const dirQueueRef = useRef<Dir[]>([]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("snakeHighScore");
    if (stored) setHighScore(parseInt(stored));
  }, []);

  const restart = useCallback(() => {
    const s = [{ x: 10, y: 10 }];
    setSnake(s);
    setFood(randomFood(s));
    const d = { x: 1, y: 0 };
    setDir(d);
    dirRef.current = d;
    dirQueueRef.current = [];
    setGameOver(false);
    setStarted(true);
    setScore(0);
    setSpeed(INITIAL_SPEED);
  }, []);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (DIRS[e.key]) {
        e.preventDefault();
        if (!started && !gameOver) {
          restart();
          return;
        }
        const newDir = DIRS[e.key];
        const last = dirQueueRef.current.length > 0 ? dirQueueRef.current[dirQueueRef.current.length - 1] : dirRef.current;
        if (newDir.x + last.x !== 0 || newDir.y + last.y !== 0) {
          dirQueueRef.current.push(newDir);
        }
      }
      if (e.key === " " && gameOver) restart();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [started, gameOver, restart]);

  // Touch
  useEffect(() => {
    const start = (e: TouchEvent) => {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const end = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      const dy = e.changedTouches[0].clientY - touchStart.current.y;
      if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
      let newDir: Dir;
      if (Math.abs(dx) > Math.abs(dy)) {
        newDir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
      } else {
        newDir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
      }
      if (!started && !gameOver) {
        restart();
        return;
      }
      const last = dirQueueRef.current.length > 0 ? dirQueueRef.current[dirQueueRef.current.length - 1] : dirRef.current;
      if (newDir.x + last.x !== 0 || newDir.y + last.y !== 0) {
        dirQueueRef.current.push(newDir);
      }
      touchStart.current = null;
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchend", end, { passive: true });
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchend", end);
    };
  }, [started, gameOver, restart]);

  // Game loop
  useEffect(() => {
    if (!started || gameOver) return;
    const interval = setInterval(() => {
      setSnake((prev) => {
        if (dirQueueRef.current.length > 0) {
          const next = dirQueueRef.current.shift()!;
          dirRef.current = next;
          setDir(next);
        }
        const d = dirRef.current;
        const head = { x: prev[0].x + d.x, y: prev[0].y + d.y };

        if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID || prev.some((s) => s.x === head.x && s.y === head.y)) {
          setGameOver(true);
          setScore((sc) => {
            const stored = parseInt(localStorage.getItem("snakeHighScore") || "0");
            if (sc > stored) {
              localStorage.setItem("snakeHighScore", sc.toString());
              setHighScore(sc);
            }
            return sc;
          });
          return prev;
        }

        const newSnake = [head, ...prev];
        if (head.x === food.x && head.y === food.y) {
          setScore((s) => s + 10);
          setFood(randomFood(newSnake));
          setSpeed((sp) => Math.max(MIN_SPEED, sp - SPEED_INCREMENT));
        } else {
          newSnake.pop();
        }
        return newSnake;
      });
    }, speed);
    return () => clearInterval(interval);
  }, [started, gameOver, speed, food]);

  const size = GRID * CELL;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 select-none">
      {/* Header */}
      <div className="mb-4 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent mb-2">
          🐍 SNAKE
        </h1>
        <div className="flex gap-8 justify-center text-sm">
          <div className="text-gray-400">
            SCORE <span className="text-white font-bold text-lg ml-1">{score}</span>
          </div>
          <div className="text-gray-400">
            BEST <span className="text-yellow-400 font-bold text-lg ml-1">{highScore}</span>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div
        className="relative rounded-xl border-2 border-gray-800 shadow-2xl shadow-green-900/20"
        style={{ width: size, height: size, background: "#0a0a0a" }}
      >
        {/* Grid dots */}
        {Array.from({ length: GRID * GRID }).map((_, i) => {
          const x = i % GRID;
          const y = Math.floor(i / GRID);
          return (
            <div
              key={i}
              className="absolute rounded-full bg-gray-900"
              style={{ left: x * CELL + CELL / 2 - 1, top: y * CELL + CELL / 2 - 1, width: 2, height: 2 }}
            />
          );
        })}

        {/* Food */}
        <div
          className="absolute rounded-full animate-pulse"
          style={{
            left: food.x * CELL + 2,
            top: food.y * CELL + 2,
            width: CELL - 4,
            height: CELL - 4,
            background: "radial-gradient(circle, #ef4444, #dc2626)",
            boxShadow: "0 0 12px #ef4444aa",
          }}
        />

        {/* Snake */}
        {snake.map((s, i) => {
          const isHead = i === 0;
          const brightness = 1 - (i / snake.length) * 0.5;
          return (
            <div
              key={i}
              className="absolute transition-all duration-75"
              style={{
                left: s.x * CELL + 1,
                top: s.y * CELL + 1,
                width: CELL - 2,
                height: CELL - 2,
                borderRadius: isHead ? 6 : 4,
                background: isHead
                  ? "linear-gradient(135deg, #4ade80, #22c55e)"
                  : `rgba(74, 222, 128, ${brightness})`,
                boxShadow: isHead ? "0 0 8px #4ade80aa" : undefined,
              }}
            />
          );
        })}

        {/* Overlays */}
        {!started && !gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-xl">
            <p className="text-green-400 text-xl font-bold mb-2">Press any arrow key</p>
            <p className="text-gray-500 text-sm">or swipe to start</p>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl backdrop-blur-sm">
            <p className="text-red-400 text-3xl font-bold mb-1">GAME OVER</p>
            <p className="text-white text-xl mb-4">Score: {score}</p>
            <button
              onClick={restart}
              className="px-6 py-2 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg transition-colors"
            >
              Play Again
            </button>
            <p className="text-gray-600 text-xs mt-2">or press Space</p>
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div className="mt-6 grid grid-cols-3 gap-2 md:hidden" style={{ width: 180 }}>
        <div />
        <button onClick={() => { if (!started) restart(); const last = dirQueueRef.current.length > 0 ? dirQueueRef.current[dirQueueRef.current.length-1] : dirRef.current; if (last.y !== 1) dirQueueRef.current.push({x:0,y:-1}); }} className="bg-gray-800 active:bg-gray-700 rounded-lg p-3 text-xl text-center">▲</button>
        <div />
        <button onClick={() => { if (!started) restart(); const last = dirQueueRef.current.length > 0 ? dirQueueRef.current[dirQueueRef.current.length-1] : dirRef.current; if (last.x !== 1) dirQueueRef.current.push({x:-1,y:0}); }} className="bg-gray-800 active:bg-gray-700 rounded-lg p-3 text-xl text-center">◀</button>
        <button onClick={() => { if (!started) restart(); const last = dirQueueRef.current.length > 0 ? dirQueueRef.current[dirQueueRef.current.length-1] : dirRef.current; if (last.y !== -1) dirQueueRef.current.push({x:0,y:1}); }} className="bg-gray-800 active:bg-gray-700 rounded-lg p-3 text-xl text-center">▼</button>
        <button onClick={() => { if (!started) restart(); const last = dirQueueRef.current.length > 0 ? dirQueueRef.current[dirQueueRef.current.length-1] : dirRef.current; if (last.x !== -1) dirQueueRef.current.push({x:1,y:0}); }} className="bg-gray-800 active:bg-gray-700 rounded-lg p-3 text-xl text-center">▶</button>
      </div>

      <p className="text-gray-700 text-xs mt-4">Arrow keys to move • Space to restart</p>
    </div>
  );
}
