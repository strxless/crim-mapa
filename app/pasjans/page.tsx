'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

// ============================================================================
// TYPES
// ============================================================================

type Suit = '♥' | '♦' | '♣' | '♠';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
  faceUp: boolean;
}

interface GameState {
  tableau: Card[][];
  foundation: Card[][];
  stock: Card[];
  waste: Card[];
}

interface HistoryEntry {
  state: GameState;
  move: string;
}

interface CardTheme {
  backPattern: 'stripes' | 'dots' | 'grid' | 'solid' | 'checkerboard' | 'waves';
  backColor: string;
  faceColor: string;
  redColor: string;
  blackColor: string;
  borderColor: string;
}

const DEFAULT_THEME: CardTheme = {
  backPattern: 'stripes',
  backColor: '#dc2626',
  faceColor: '#ffffff',
  redColor: '#dc2626',
  blackColor: '#1f2937',
  borderColor: '#e5e7eb',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Pasjans() {
  const router = useRouter();
  
  // State
  const [game, setGame] = useState<GameState | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedCard, setSelectedCard] = useState<{ pile: string; index: number } | null>(null);
  const [dragging, setDragging] = useState<{ pile: string; index: number; cards: Card[] } | null>(
    null
  );
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [won, setWon] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<CardTheme>(DEFAULT_THEME);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // GAME LOGIC
  // ============================================================================

  const createDeck = (): Card[] => {
    const suits: Suit[] = ['♥', '♦', '♣', '♠'];
    const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck: Card[] = [];

    suits.forEach((suit) => {
      ranks.forEach((rank) => {
        deck.push({
          suit,
          rank,
          id: `${suit}-${rank}`,
          faceUp: false,
        });
      });
    });

    return shuffleDeck(deck);
  };

  const shuffleDeck = (deck: Card[]): Card[] => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const initializeGame = useCallback(() => {
    const deck = createDeck();
    const tableau: Card[][] = [[], [], [], [], [], [], []];
    let deckIndex = 0;

    for (let i = 0; i < 7; i++) {
      for (let j = i; j < 7; j++) {
        const card = deck[deckIndex++];
        if (i === j) card.faceUp = true;
        tableau[j].push(card);
      }
    }

    const newGame: GameState = {
      tableau,
      foundation: [[], [], [], []],
      stock: deck.slice(deckIndex).map((c) => ({ ...c, faceUp: false })),
      waste: [],
    };

    setGame(newGame);
    setHistory([]);
    setMoves(0);
    setTime(0);
    setWon(false);
    setSelectedCard(null);
    setDragging(null);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
  }, []);

  const isRed = (suit: Suit) => suit === '♥' || suit === '♦';

  const getRankValue = (rank: Rank): number => {
    const values: { [key in Rank]: number } = {
      A: 1,
      '2': 2,
      '3': 3,
      '4': 4,
      '5': 5,
      '6': 6,
      '7': 7,
      '8': 8,
      '9': 9,
      '10': 10,
      J: 11,
      Q: 12,
      K: 13,
    };
    return values[rank];
  };

  const canPlaceOnTableau = (card: Card, pile: Card[]): boolean => {
    if (pile.length === 0) return getRankValue(card.rank) === 13;
    const topCard = pile[pile.length - 1];
    return (
      isRed(card.suit) !== isRed(topCard.suit) &&
      getRankValue(card.rank) === getRankValue(topCard.rank) - 1
    );
  };

  const canPlaceOnFoundation = (card: Card, pile: Card[]): boolean => {
    if (pile.length === 0) return getRankValue(card.rank) === 1;
    const topCard = pile[pile.length - 1];
    return card.suit === topCard.suit && getRankValue(card.rank) === getRankValue(topCard.rank) + 1;
  };

  const saveState = (newGame: GameState, moveDescription: string) => {
    if (game) {
      setHistory((prev) => [...prev, { state: game, move: moveDescription }]);
    }
    setGame(newGame);
    setMoves((m) => m + 1);
  };

  const undo = () => {
    if (history.length === 0) return;
    const lastEntry = history[history.length - 1];
    setGame(lastEntry.state);
    setHistory((prev) => prev.slice(0, -1));
    setMoves((m) => Math.max(0, m - 1));
  };

  const drawCard = () => {
    if (!game) return;

    if (game.stock.length === 0) {
      const newGame = {
        ...game,
        stock: game.waste.map((c) => ({ ...c, faceUp: false })).reverse(),
        waste: [],
      };
      saveState(newGame, 'Recycle stock');
    } else {
      const drawnCards = [game.stock[game.stock.length - 1]].map((c) => ({ ...c, faceUp: true }));
      const newGame = {
        ...game,
        stock: game.stock.slice(0, -1),
        waste: [...game.waste, ...drawnCards],
      };
      saveState(newGame, 'Draw card');
    }
  };

  const moveCards = useCallback(
    (fromPile: string, fromIndex: number, toPile: string): boolean => {
      if (!game) return false;

      const foundationMatch = toPile.match(/foundation-(\d+)/);
      const tableauMatch = toPile.match(/tableau-(\d+)/);

      if (foundationMatch) {
        const foundationIndex = parseInt(foundationMatch[1]);

        if (fromPile === 'waste' && game.waste.length > 0) {
          const card = game.waste[game.waste.length - 1];
          if (canPlaceOnFoundation(card, game.foundation[foundationIndex])) {
            const newFoundation = [...game.foundation];
            newFoundation[foundationIndex] = [...newFoundation[foundationIndex], card];
            saveState(
              { ...game, foundation: newFoundation, waste: game.waste.slice(0, -1) },
              'Move to foundation'
            );
            return true;
          }
        } else if (fromPile.startsWith('tableau')) {
          const tableauIndex = parseInt(fromPile.split('-')[1]);
          const cards = game.tableau[tableauIndex].slice(fromIndex);
          if (
            cards.length === 1 &&
            canPlaceOnFoundation(cards[0], game.foundation[foundationIndex])
          ) {
            const newTableau = [...game.tableau];
            newTableau[tableauIndex] = newTableau[tableauIndex].slice(0, fromIndex);
            if (newTableau[tableauIndex].length > 0) {
              newTableau[tableauIndex][newTableau[tableauIndex].length - 1].faceUp = true;
            }
            const newFoundation = [...game.foundation];
            newFoundation[foundationIndex] = [...newFoundation[foundationIndex], cards[0]];
            saveState(
              { ...game, tableau: newTableau, foundation: newFoundation },
              'Move to foundation'
            );
            return true;
          }
        }
      } else if (tableauMatch) {
        const tableauIndex = parseInt(tableauMatch[1]);

        if (fromPile === 'waste' && game.waste.length > 0) {
          const card = game.waste[game.waste.length - 1];
          if (canPlaceOnTableau(card, game.tableau[tableauIndex])) {
            const newTableau = [...game.tableau];
            newTableau[tableauIndex] = [...newTableau[tableauIndex], card];
            saveState(
              { ...game, tableau: newTableau, waste: game.waste.slice(0, -1) },
              'Move to tableau'
            );
            return true;
          }
        } else if (fromPile.startsWith('tableau')) {
          const fromTableauIndex = parseInt(fromPile.split('-')[1]);
          const cards = game.tableau[fromTableauIndex].slice(fromIndex);
          if (canPlaceOnTableau(cards[0], game.tableau[tableauIndex])) {
            const newTableau = [...game.tableau];
            newTableau[fromTableauIndex] = newTableau[fromTableauIndex].slice(0, fromIndex);
            if (newTableau[fromTableauIndex].length > 0) {
              newTableau[fromTableauIndex][newTableau[fromTableauIndex].length - 1].faceUp = true;
            }
            newTableau[tableauIndex] = [...newTableau[tableauIndex], ...cards];
            saveState({ ...game, tableau: newTableau }, 'Move cards');
            return true;
          }
        }
      }

      return false;
    },
    [game]
  );

  const tryAutoMoveToFoundation = useCallback(
    (pile: string, index: number) => {
      for (let i = 0; i < 4; i++) {
        if (moveCards(pile, index, `foundation-${i}`)) {
          return true;
        }
      }
      return false;
    },
    [moveCards]
  );

  // ============================================================================
  // DRAG & DROP HANDLERS
  // ============================================================================

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, pile: string, index: number) => {
    if (!game) return;

    e.preventDefault();
    e.stopPropagation();

    let cards: Card[] = [];
    if (pile === 'waste' && game.waste.length > 0) {
      cards = [game.waste[game.waste.length - 1]];
    } else if (pile.startsWith('tableau')) {
      const tableauIndex = parseInt(pile.split('-')[1]);
      const tableauCards = game.tableau[tableauIndex];
      if (index < tableauCards.length && tableauCards[index].faceUp) {
        cards = tableauCards.slice(index);
      }
    }

    if (cards.length > 0) {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setDragging({ pile, index, cards });
      setDragOffset({ x: clientX, y: clientY });
    }
  };

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!dragging) return;
      e.preventDefault();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setDragOffset({ x: clientX, y: clientY });
    },
    [dragging]
  );

  const handleDragEnd = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!dragging) return;
      e.preventDefault();
      const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
      const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;
      const element = document.elementFromPoint(clientX, clientY);
      const dropTarget = element?.closest('[data-pile]');

      if (dropTarget) {
        const targetPile = dropTarget.getAttribute('data-pile');
        if (targetPile) {
          moveCards(dragging.pile, dragging.index, targetPile);
        }
      }

      setDragging(null);
      setSelectedCard(null);
    },
    [dragging, moveCards]
  );

  useEffect(() => {
    if (dragging) {
      const handleMove = (e: MouseEvent | TouchEvent) => handleDragMove(e);
      const handleEnd = (e: MouseEvent | TouchEvent) => handleDragEnd(e);

      window.addEventListener('mousemove', handleMove, { passive: false });
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);

      return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleEnd);
      };
    }
  }, [dragging, handleDragMove, handleDragEnd]);

  // ============================================================================
  // CLICK HANDLERS
  // ============================================================================

  const handleCardClick = (pile: string, index: number) => {
    if (!game) return;

    if (selectedCard) {
      moveCards(selectedCard.pile, selectedCard.index, pile);
      setSelectedCard(null);
    } else {
      if (pile === 'waste' && game.waste.length > 0) {
        setSelectedCard({ pile: 'waste', index: game.waste.length - 1 });
      } else if (pile.startsWith('tableau')) {
        const tableauIndex = parseInt(pile.split('-')[1]);
        const card = game.tableau[tableauIndex][index];
        if (card && card.faceUp) {
          setSelectedCard({ pile, index });
        }
      }
    }
  };

  const handleDoubleClick = (pile: string, index: number) => {
    if (!game) return;
    tryAutoMoveToFoundation(pile, index);
    setSelectedCard(null);
  };

  const isCardSelected = (pile: string, index: number): boolean => {
    if (!selectedCard) return false;
    return selectedCard.pile === pile && selectedCard.index === index;
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    initializeGame();
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('pasjans-theme');
    if (savedTheme) {
      try {
        setTheme(JSON.parse(savedTheme));
      } catch (e) {
        console.error('Failed to load theme:', e);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [initializeGame]);

  // Save theme to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pasjans-theme', JSON.stringify(theme));
  }, [theme]);

  useEffect(() => {
    if (game && game.foundation.every((pile) => pile.length === 13)) {
      setWon(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [game]);

  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
      if (dragging) e.preventDefault();
    };
    document.body.addEventListener('touchmove', preventDefault, { passive: false });
    return () => {
      document.body.removeEventListener('touchmove', preventDefault);
    };
  }, [dragging]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCardBackPattern = (): string => {
    const color1 = theme.backColor;
    const color2 = adjustColor(theme.backColor, -20);
    const color3 = adjustColor(theme.backColor, 20);
    
    switch (theme.backPattern) {
      case 'stripes':
        return `repeating-linear-gradient(45deg, ${color1}, ${color1} 10px, ${color2} 10px, ${color2} 20px)`;
      case 'dots':
        return `radial-gradient(circle, ${color2} 15%, transparent 15%), radial-gradient(circle, ${color2} 15%, transparent 15%), ${color1}`;
      case 'grid':
        return `repeating-linear-gradient(0deg, ${color2} 0px, ${color2} 1px, transparent 1px, transparent 10px), repeating-linear-gradient(90deg, ${color2} 0px, ${color2} 1px, transparent 1px, transparent 10px), ${color1}`;
      case 'checkerboard':
        return `repeating-conic-gradient(${color1} 0% 25%, ${color2} 0% 50%) 50% / 20px 20px`;
      case 'waves':
        return `linear-gradient(135deg, ${color1} 25%, transparent 25%), linear-gradient(225deg, ${color1} 25%, transparent 25%), linear-gradient(45deg, ${color1} 25%, transparent 25%), linear-gradient(315deg, ${color1} 25%, ${color2} 25%)`;
      case 'solid':
        return color1;
    }
  };

  const adjustColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return `#${(0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
  };

  if (!game) return null;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="solitaire-game">
      <style jsx>{`
        .solitaire-game {
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          max-height: 100vh;
          max-height: 100dvh;
          background: linear-gradient(135deg, #0d4d2d 0%, #1a7a4a 50%, #0d4d2d 100%);
          color: white;
          padding: 4px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: fixed;
          top: 0;
          left: 0;
          /* Allow native scrolling in overflow containers (e.g. Settings modal).
           * Dragging cards is still protected via preventDefault() in drag handlers.
           */
          touch-action: pan-x pan-y;
          overscroll-behavior: none;
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
        }

        .game-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
          gap: 4px;
          flex-shrink: 0;
        }

        .game-title {
          font-size: 14px;
          font-weight: 700;
          margin: 0;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .game-title:active {
          opacity: 0.7;
        }

        .game-controls {
          display: flex;
          gap: 3px;
        }

        .game-btn {
          padding: 4px 8px;
          border: none;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.95);
          color: #1f2937;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          transition: transform 0.1s;
        }

        .game-btn:active {
          transform: scale(0.95);
        }

        .game-btn:disabled {
          opacity: 0.5;
        }

        .game-stats {
          display: flex;
          gap: 3px;
          margin-bottom: 4px;
          font-size: 9px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .game-stat {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          padding: 2px 5px;
          border-radius: 6px;
        }

        .game-board {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-height: 0;
        }

        .top-row {
          display: flex;
          gap: 2px;
          margin-bottom: 4px;
          flex-shrink: 0;
        }

        .stock-waste,
        .foundation-piles {
          display: flex;
          gap: 2px;
          flex: 1;
        }

        .pile {
          flex: 1;
          aspect-ratio: 2.5/3.5;
          background: rgba(255, 255, 255, 0.1);
          border: 1px dashed rgba(255, 255, 255, 0.3);
          border-radius: 4px;
          position: relative;
          min-width: 0;
          cursor: pointer;
          max-height: 65px;
        }

        .tableau-pile.pile {
          aspect-ratio: unset;
          height: 100%;
          min-height: 80px;
        }

        .pile:active {
          background: rgba(255, 255, 255, 0.15);
        }

        .card {
          width: 100%;
          height: 100%;
          background: ${theme.faceColor};
          border-radius: 4px;
          border: 1px solid ${theme.borderColor};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          cursor: grab;
          position: relative;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }

        .card:active {
          cursor: grabbing;
        }

        .card.selected {
          border-color: #fbbf24;
          box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.5);
          transform: translateY(-1px) scale(1.03);
          z-index: 100;
        }

        .card.red {
          color: ${theme.redColor};
        }

        .card.black {
          color: ${theme.blackColor};
        }

        .card-back {
          background: ${getCardBackPattern()};
          ${theme.backPattern === 'dots' ? 'background-size: 20px 20px; background-position: 0 0, 10px 10px;' : ''}
          ${theme.backPattern === 'waves' ? 'background-size: 20px 20px;' : ''}
          color: white;
        }

        .card-suit {
          font-size: 10px;
          line-height: 1;
        }

        .card-rank {
          font-size: 8px;
          line-height: 1;
        }

        .tableau {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          min-height: 0;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding-bottom: 2px;
        }

        .tableau::-webkit-scrollbar {
          display: none;
        }

        .tableau-pile {
          position: relative;
          min-height: 100%;
          height: fit-content;
        }

        .tableau-card {
          position: absolute;
          width: 100%;
          left: 0;
          cursor: grab;
        }

        .empty-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 11px;
          opacity: 0.4;
          pointer-events: none;
        }

        .drag-preview {
          position: fixed;
          pointer-events: none;
          z-index: 9999;
          left: 0;
          top: 0;
        }

        .drag-preview-inner {
          position: relative;
          width: 50px;
          transform: translate(-50%, -50%);
        }

        .drag-preview .card {
          width: 50px;
          aspect-ratio: 2.5/3.5;
          margin-bottom: 12px;
        }

        .win-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10001;
          padding: 20px;
        }

        .win-content {
          background: white;
          color: #1f2937;
          padding: 24px 18px;
          border-radius: 12px;
          text-align: center;
          max-width: 85%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .win-title {
          font-size: 32px;
          margin: 0 0 8px 0;
        }

        .win-text {
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 14px 0;
          font-weight: 500;
        }

        .win-stats {
          display: flex;
          justify-content: center;
          gap: 14px;
          margin-bottom: 14px;
          font-size: 11px;
        }

        .win-stat-value {
          font-size: 18px;
          font-weight: 700;
          color: #10b981;
        }

        .win-stat-label {
          color: #6b7280;
          margin-top: 2px;
        }

        .settings-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10001;
          padding: 20px;
        }

        .settings-content {
          background: white;
          color: #1f2937;
          padding: 16px;
          border-radius: 12px;
          max-width: 400px;
          width: 100%;
          /* iOS Safari can report a larger vh than the visible area when the URL bar is shown,
           * which makes the bottom of the modal unreachable.
           */
          max-height: 90vh;
          max-height: 90svh;
          max-height: 90dvh;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
          overscroll-behavior: contain;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        @media (min-width: 640px) {
          .settings-content {
            padding: 20px;
          }
        }

        .settings-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 14px 0;
          text-align: center;
          color: #000000;
        }

        @media (min-width: 640px) {
          .settings-title {
            font-size: 20px;
            margin: 0 0 16px 0;
          }
        }

        .settings-section {
          margin-bottom: 12px;
        }

        @media (min-width: 640px) {
          .settings-section {
            margin-bottom: 16px;
          }
        }

        .settings-label {
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 6px;
          display: block;
          text-transform: uppercase;
          color: #000000;
        }

        @media (min-width: 640px) {
          .settings-label {
            font-size: 12px;
          }
        }

        .color-input-wrapper {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .color-input {
          flex: 1;
          height: 40px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
        }

        .color-value {
          font-size: 10px;
          color: #000000;
          font-family: monospace;
          font-weight: 500;
        }

        @media (min-width: 640px) {
          .color-value {
            font-size: 11px;
          }
        }

        .pattern-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
        }

        @media (min-width: 640px) {
          .pattern-grid {
            gap: 8px;
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .pattern-btn {
          padding: 24px 8px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 10px;
          font-weight: 600;
          transition: all 0.2s;
          text-align: center;
          color: #000000;
        }

        @media (min-width: 640px) {
          .pattern-btn {
            padding: 32px 12px;
            font-size: 11px;
          }
        }

        .pattern-btn:hover {
          border-color: #3b82f6;
        }

        .pattern-btn.active {
          border-color: #3b82f6;
          background: #eff6ff;
          color: #3b82f6;
        }

        .settings-buttons {
          display: flex;
          gap: 8px;
          margin-top: 20px;
        }

        .settings-btn {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .settings-btn-primary {
          background: #3b82f6;
          color: white;
        }

        .settings-btn-primary:hover {
          background: #2563eb;
        }

        .settings-btn-secondary {
          background: #e5e7eb;
          color: #1f2937;
        }

        .settings-btn-secondary:hover {
          background: #d1d5db;
        }

        @media (min-width: 640px) {
          .solitaire-game {
            padding: 8px;
          }

          .game-header {
            margin-bottom: 6px;
          }

          .game-title {
            font-size: 18px;
          }

          .game-btn {
            padding: 6px 12px;
            font-size: 12px;
          }

          .game-stats {
            font-size: 11px;
            margin-bottom: 6px;
            gap: 4px;
          }

          .game-stat {
            padding: 3px 8px;
          }

          .top-row {
            gap: 4px;
            margin-bottom: 6px;
          }

          .stock-waste,
          .foundation-piles {
            gap: 4px;
          }

          .tableau {
            gap: 3px;
          }

          .pile {
            border-radius: 6px;
          }

          .card {
            border-radius: 6px;
          }

          .card-suit {
            font-size: 16px;
          }

          .card-rank {
            font-size: 11px;
          }

          .drag-preview-inner {
            width: 60px;
          }

          .drag-preview .card {
            width: 60px;
            margin-bottom: 14px;
          }
        }
      `}</style>

      {/* Header */}
      <div className="game-header">
        <h1 className="game-title" onClick={() => router.push('/')}>← 🎴 Pasjans</h1>
        <div className="game-controls">
          <button className="game-btn" onClick={undo} disabled={history.length === 0}>
            ↶
          </button>
          <button className="game-btn" onClick={initializeGame}>
            Nowa
          </button>
          <button className="game-btn" onClick={() => setShowSettings(true)}>
            ⚙
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="game-stats">
        <div className="game-stat">⏱ {formatTime(time)}</div>
        <div className="game-stat">🎯 {moves}</div>
        <div className="game-stat">
          🏆 {game.foundation.reduce((sum, pile) => sum + pile.length, 0)}/52
        </div>
      </div>

      {/* Game Board */}
      <div className="game-board">
        {/* Top Row */}
        <div className="top-row">
          <div className="stock-waste">
            {/* Stock */}
            <div className="pile" onClick={drawCard} data-pile="stock">
              {game.stock.length > 0 ? (
                <div className="card card-back">✦</div>
              ) : (
                <div className="empty-icon">↻</div>
              )}
            </div>

            {/* Waste */}
            <div
              className="pile"
              onClick={() => handleCardClick('waste', 0)}
              onDoubleClick={() => handleDoubleClick('waste', game.waste.length - 1)}
              data-pile="waste"
            >
              {game.waste.length > 0 &&
                (() => {
                  const card = game.waste[game.waste.length - 1];
                  return (
                    <div
                      className={`card ${isRed(card.suit) ? 'red' : 'black'} ${
                        isCardSelected('waste', game.waste.length - 1) ? 'selected' : ''
                      }`}
                      onMouseDown={(e) => handleDragStart(e, 'waste', game.waste.length - 1)}
                      onTouchStart={(e) => handleDragStart(e, 'waste', game.waste.length - 1)}
                    >
                      <div className="card-rank">{card.rank}</div>
                      <div className="card-suit">{card.suit}</div>
                    </div>
                  );
                })()}
            </div>
          </div>

          {/* Foundations */}
          <div className="foundation-piles">
            {game.foundation.map((pile, i) => {
              const suits = ['♥', '♦', '♣', '♠'];
              return (
                <div
                  key={i}
                  className="pile"
                  onClick={() => handleCardClick(`foundation-${i}`, 0)}
                  data-pile={`foundation-${i}`}
                >
                  {pile.length > 0 ? (
                    (() => {
                      const card = pile[pile.length - 1];
                      return (
                        <div className={`card ${isRed(card.suit) ? 'red' : 'black'}`}>
                          <div className="card-rank">{card.rank}</div>
                          <div className="card-suit">{card.suit}</div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="empty-icon">{suits[i]}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tableau */}
        <div className="tableau">
          {game.tableau.map((pile, pileIndex) => (
            <div
              key={pileIndex}
              className="pile tableau-pile"
              data-pile={`tableau-${pileIndex}`}
              onClick={() => handleCardClick(`tableau-${pileIndex}`, Math.max(0, pile.length - 1))}
            >
              {pile.length === 0 && <div className="empty-icon">K</div>}
              {pile.map((card, cardIndex) => {
                const cardOffset = 10;
                return (
                  <div
                    key={card.id}
                    className={`tableau-card ${card.faceUp ? `card ${isRed(card.suit) ? 'red' : 'black'}` : 'card card-back'} ${
                      isCardSelected(`tableau-${pileIndex}`, cardIndex) ? 'selected' : ''
                    }`}
                    style={{
                      top: `${cardIndex * cardOffset}px`,
                      zIndex: cardIndex,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(`tableau-${pileIndex}`, cardIndex);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleDoubleClick(`tableau-${pileIndex}`, cardIndex);
                    }}
                    onMouseDown={(e) =>
                      card.faceUp && handleDragStart(e, `tableau-${pileIndex}`, cardIndex)
                    }
                    onTouchStart={(e) =>
                      card.faceUp && handleDragStart(e, `tableau-${pileIndex}`, cardIndex)
                    }
                  >
                    {card.faceUp ? (
                      <>
                        <div className="card-rank">{card.rank}</div>
                        <div className="card-suit">{card.suit}</div>
                      </>
                    ) : (
                      <span>✦</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Drag Preview */}
      {dragging && (
        <div
          className="drag-preview"
          style={{
            transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
          }}
        >
          <div className="drag-preview-inner">
            {dragging.cards.map((card) => (
              <div key={card.id} className={`card ${isRed(card.suit) ? 'red' : 'black'}`}>
                <div className="card-rank">{card.rank}</div>
                <div className="card-suit">{card.suit}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Win Modal */}
      <AnimatePresence>
        {won && (
          <motion.div
            className="win-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="win-content"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <div className="win-title">🎉</div>
              <div className="win-text">Gratulacje! Wygrałeś!</div>
              <div className="win-stats">
                <div>
                  <div className="win-stat-value">{moves}</div>
                  <div className="win-stat-label">Ruchów</div>
                </div>
                <div>
                  <div className="win-stat-value">{formatTime(time)}</div>
                  <div className="win-stat-label">Czas</div>
                </div>
              </div>
              <button
                className="game-btn"
                onClick={initializeGame}
                style={{ width: '100%', padding: '8px' }}
              >
                Zagraj ponownie
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="settings-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              className="settings-content"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="settings-title">⚙️ Personalizacja kart</h2>

              <div className="settings-section">
                <label className="settings-label">Wzór rewersów</label>
                <div className="pattern-grid">
                  <button
                    className={`pattern-btn ${theme.backPattern === 'stripes' ? 'active' : ''}`}
                    onClick={() => setTheme({ ...theme, backPattern: 'stripes' })}
                  >
                    Paski
                  </button>
                  <button
                    className={`pattern-btn ${theme.backPattern === 'dots' ? 'active' : ''}`}
                    onClick={() => setTheme({ ...theme, backPattern: 'dots' })}
                  >
                    Kropki
                  </button>
                  <button
                    className={`pattern-btn ${theme.backPattern === 'grid' ? 'active' : ''}`}
                    onClick={() => setTheme({ ...theme, backPattern: 'grid' })}
                  >
                    Siatka
                  </button>
                  <button
                    className={`pattern-btn ${theme.backPattern === 'checkerboard' ? 'active' : ''}`}
                    onClick={() => setTheme({ ...theme, backPattern: 'checkerboard' })}
                  >
                    Szachownica
                  </button>
                  <button
                    className={`pattern-btn ${theme.backPattern === 'waves' ? 'active' : ''}`}
                    onClick={() => setTheme({ ...theme, backPattern: 'waves' })}
                  >
                    Fale
                  </button>
                  <button
                    className={`pattern-btn ${theme.backPattern === 'solid' ? 'active' : ''}`}
                    onClick={() => setTheme({ ...theme, backPattern: 'solid' })}
                  >
                    Jednolity
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <label className="settings-label">Kolor rewersu</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    className="color-input"
                    value={theme.backColor}
                    onChange={(e) => setTheme({ ...theme, backColor: e.target.value })}
                  />
                  <span className="color-value">{theme.backColor}</span>
                </div>
              </div>

              <div className="settings-section">
                <label className="settings-label">Kolor tła karty</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    className="color-input"
                    value={theme.faceColor}
                    onChange={(e) => setTheme({ ...theme, faceColor: e.target.value })}
                  />
                  <span className="color-value">{theme.faceColor}</span>
                </div>
              </div>

              <div className="settings-section">
                <label className="settings-label">Kolor czerwonych kart</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    className="color-input"
                    value={theme.redColor}
                    onChange={(e) => setTheme({ ...theme, redColor: e.target.value })}
                  />
                  <span className="color-value">{theme.redColor}</span>
                </div>
              </div>

              <div className="settings-section">
                <label className="settings-label">Kolor czarnych kart</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    className="color-input"
                    value={theme.blackColor}
                    onChange={(e) => setTheme({ ...theme, blackColor: e.target.value })}
                  />
                  <span className="color-value">{theme.blackColor}</span>
                </div>
              </div>

              <div className="settings-section">
                <label className="settings-label">Kolor obramowania</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    className="color-input"
                    value={theme.borderColor}
                    onChange={(e) => setTheme({ ...theme, borderColor: e.target.value })}
                  />
                  <span className="color-value">{theme.borderColor}</span>
                </div>
              </div>

              <div className="settings-buttons">
                <button
                  className="settings-btn settings-btn-secondary"
                  onClick={() => {
                    setTheme(DEFAULT_THEME);
                  }}
                >
                  Przywróć domyślne
                </button>
                <button
                  className="settings-btn settings-btn-primary"
                  onClick={() => setShowSettings(false)}
                >
                  Gotowe
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
