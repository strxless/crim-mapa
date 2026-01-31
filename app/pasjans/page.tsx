'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

// ============================================================================
// CONFIGURATION
// ============================================================================

const BACKGROUNDS = [
  {
    name: 'Klasyczny zielony',
    bg: 'linear-gradient(135deg, #0d4d2d 0%, #1a7a4a 50%, #0d4d2d 100%)',
    text: '#fff',
  },
  {
    name: 'Granatowy',
    bg: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1e3a8a 100%)',
    text: '#fff',
  },
  {
    name: 'Bordowy',
    bg: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #7f1d1d 100%)',
    text: '#fff',
  },
  {
    name: 'Ciemny',
    bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    text: '#fff',
  },
  {
    name: 'Jasny',
    bg: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 50%, #f8fafc 100%)',
    text: '#000',
  },
  {
    name: 'Fioletowy',
    bg: 'linear-gradient(135deg, #581c87 0%, #a855f7 50%, #581c87 100%)',
    text: '#fff',
  },
  {
    name: 'Pomarańczowy',
    bg: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #7c2d12 100%)',
    text: '#fff',
  },
  {
    name: 'Turkusowy',
    bg: 'linear-gradient(135deg, #134e4a 0%, #14b8a6 50%, #134e4a 100%)',
    text: '#fff',
  },
  {
    name: 'Różowy',
    bg: 'linear-gradient(135deg, #831843 0%, #db2777 50%, #831843 100%)',
    text: '#fff',
  },
  {
    name: 'Czarny',
    bg: 'linear-gradient(135deg, #000000 0%, #18181b 50%, #000000 100%)',
    text: '#fff',
  },
];

const CARD_BACKS = [
  {
    name: 'Czerwony',
    style: 'repeating-linear-gradient(45deg, #dc2626, #dc2626 10px, #b91c1c 10px, #b91c1c 20px)',
  },
  {
    name: 'Niebieski',
    style: 'repeating-linear-gradient(45deg, #3b82f6, #3b82f6 10px, #2563eb 10px, #2563eb 20px)',
  },
  {
    name: 'Zielony',
    style: 'repeating-linear-gradient(45deg, #22c55e, #22c55e 10px, #16a34a 10px, #16a34a 20px)',
  },
  {
    name: 'Fioletowy',
    style: 'repeating-linear-gradient(45deg, #a855f7, #a855f7 10px, #9333ea 10px, #9333ea 20px)',
  },
  {
    name: 'Pomarańczowy',
    style: 'repeating-linear-gradient(45deg, #f97316, #f97316 10px, #ea580c 10px, #ea580c 20px)',
  },
  {
    name: 'Różowy',
    style: 'repeating-linear-gradient(45deg, #ec4899, #ec4899 10px, #db2777 10px, #db2777 20px)',
  },
  {
    name: 'Gradient ocean',
    style: 'linear-gradient(135deg, #0077be, #00a8e8, #00d4ff)',
  },
  {
    name: 'Gradient zachód',
    style: 'linear-gradient(135deg, #ff6b6b, #ee5a6f, #c44569, #f38181)',
  },
  {
    name: 'Gradient las',
    style: 'linear-gradient(135deg, #134e4a, #16a34a, #22c55e)',
  },
  {
    name: 'Czarny',
    style: '#1f2937',
  },
  {
    name: 'Biały',
    style: '#f3f4f6',
  },
  {
    name: 'Złoty',
    style: 'linear-gradient(135deg, #d4af37, #ffd700, #ffed4e)',
  },
];

const CARD_STYLES = [
  {
    name: 'Klasyczny',
    heartColor: '#dc2626',
    diamondColor: '#dc2626',
    clubColor: '#1f2937',
    spadeColor: '#1f2937',
    bgColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  {
    name: 'Neon',
    heartColor: '#ff006e',
    diamondColor: '#ff006e',
    clubColor: '#8338ec',
    spadeColor: '#3a86ff',
    bgColor: '#ffffff',
    borderColor: '#00f5ff',
  },
  {
    name: 'Pastel',
    heartColor: '#ff7096',
    diamondColor: '#ffa6c1',
    clubColor: '#89c9b8',
    spadeColor: '#a8d8ea',
    bgColor: '#fff5f7',
    borderColor: '#ffd4e5',
  },
  {
    name: 'Cyberpunk',
    heartColor: '#ff2a6d',
    diamondColor: '#ff2a6d',
    clubColor: '#05d9e8',
    spadeColor: '#d1f7ff',
    bgColor: '#1a1a2e',
    borderColor: '#ff2a6d',
  },
  {
    name: 'Złoty',
    heartColor: '#d4af37',
    diamondColor: '#ffd700',
    clubColor: '#8b6914',
    spadeColor: '#6b5400',
    bgColor: '#fffef0',
    borderColor: '#d4af37',
  },
  {
    name: 'Retro',
    heartColor: '#c92a2a',
    diamondColor: '#c92a2a',
    clubColor: '#2f9e44',
    spadeColor: '#2f9e44',
    bgColor: '#f8f0e3',
    borderColor: '#8b4513',
  },
  {
    name: 'Minimalistyczny',
    heartColor: '#000000',
    diamondColor: '#000000',
    clubColor: '#000000',
    spadeColor: '#000000',
    bgColor: '#ffffff',
    borderColor: '#000000',
  },
  {
    name: 'Ciemny',
    heartColor: '#ffffff',
    diamondColor: '#ffffff',
    clubColor: '#ffffff',
    spadeColor: '#ffffff',
    bgColor: '#1f2937',
    borderColor: '#ffffff',
  },
];

const CARD_CORNERS = [
  { name: 'Ostre', radius: '4px' },
  { name: 'Zaokrąglone', radius: '8px' },
  { name: 'Bardzo zaokrąglone', radius: '16px' },
];

const CARD_SHADOWS = [
  { name: 'Brak', shadow: 'none' },
  { name: 'Subtelny', shadow: '0 1px 3px rgba(0, 0, 0, 0.1)' },
  { name: 'Normalny', shadow: '0 2px 6px rgba(0, 0, 0, 0.15)' },
  { name: 'Mocny', shadow: '0 4px 12px rgba(0, 0, 0, 0.25)' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Pasjans() {
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

  // Settings
  const [drawThree, setDrawThree] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const [cardBackIndex, setCardBackIndex] = useState(0);
  const [cardStyleIndex, setCardStyleIndex] = useState(0);
  const [cardCornerIndex, setCardCornerIndex] = useState(1);
  const [cardShadowIndex, setCardShadowIndex] = useState(2);
  const [animations, setAnimations] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      const cardsToDraw = Math.min(drawThree ? 3 : 1, game.stock.length);
      const drawnCards = game.stock.slice(-cardsToDraw).map((c) => ({ ...c, faceUp: true }));

      const newGame = {
        ...game,
        stock: game.stock.slice(0, -cardsToDraw),
        waste: [...game.waste, ...drawnCards],
      };
      saveState(newGame, `Draw ${cardsToDraw} card(s)`);
    }
  };

  const moveCards = useCallback(
    (fromPile: string, fromIndex: number, toPile: string): boolean => {
      if (!game) return false;

      const foundationMatch = toPile.match(/foundation-(\d+)/);
      const tableauMatch = toPile.match(/tableau-(\d+)/);

      // To Foundation
      if (foundationMatch) {
        const foundationIndex = parseInt(foundationMatch[1]);

        if (fromPile === 'waste' && game.waste.length > 0) {
          const card = game.waste[game.waste.length - 1];
          if (canPlaceOnFoundation(card, game.foundation[foundationIndex])) {
            const newFoundation = [...game.foundation];
            newFoundation[foundationIndex] = [...newFoundation[foundationIndex], card];
            saveState(
              {
                ...game,
                foundation: newFoundation,
                waste: game.waste.slice(0, -1),
              },
              `Move ${card.rank}${card.suit} to foundation`
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
              {
                ...game,
                tableau: newTableau,
                foundation: newFoundation,
              },
              `Move ${cards[0].rank}${cards[0].suit} to foundation`
            );
            return true;
          }
        }
      }

      // To Tableau
      else if (tableauMatch) {
        const tableauIndex = parseInt(tableauMatch[1]);

        if (fromPile === 'waste' && game.waste.length > 0) {
          const card = game.waste[game.waste.length - 1];
          if (canPlaceOnTableau(card, game.tableau[tableauIndex])) {
            const newTableau = [...game.tableau];
            newTableau[tableauIndex] = [...newTableau[tableauIndex], card];
            saveState(
              {
                ...game,
                tableau: newTableau,
                waste: game.waste.slice(0, -1),
              },
              `Move ${card.rank}${card.suit} to tableau`
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
            saveState(
              {
                ...game,
                tableau: newTableau,
              },
              `Move cards to tableau`
            );
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
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [initializeGame]);

  useEffect(() => {
    if (game && game.foundation.every((pile) => pile.length === 13)) {
      setWon(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [game]);

  // Prevent scroll on touch devices when dragging
  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
      if (dragging) {
        e.preventDefault();
      }
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

  const getCardStyle = (suit: Suit) => {
    const style = CARD_STYLES[cardStyleIndex];
    const corner = CARD_CORNERS[cardCornerIndex];
    const shadow = CARD_SHADOWS[cardShadowIndex];

    let color = style.heartColor;
    if (suit === '♦') color = style.diamondColor;
    if (suit === '♣') color = style.clubColor;
    if (suit === '♠') color = style.spadeColor;

    return {
      color,
      bg: style.bgColor,
      border: style.borderColor,
      borderRadius: corner.radius,
      boxShadow: shadow.shadow,
    };
  };

  if (!game) return null;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div
      ref={containerRef}
      className="game-container"
      style={{
        background: BACKGROUNDS[bgIndex].bg,
        color: BACKGROUNDS[bgIndex].text,
      }}
    >
      <style jsx>{`
        * {
          -webkit-tap-highlight-color: transparent;
          box-sizing: border-box;
        }

        .game-container {
          /* Fixed height accounting for navbar - uses CSS calc with dvh */
          height: calc(100dvh - 57px); /* 57px is approximate navbar height on mobile */
          width: 100vw;
          max-width: 100vw;
          padding: 6px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          position: relative;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          gap: 6px;
          flex-shrink: 0;
        }

        .title {
          font-size: 16px;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .controls {
          display: flex;
          gap: 4px;
        }

        .btn {
          padding: 5px 10px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.95);
          color: #1f2937;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          transition: all 0.15s;
          white-space: nowrap;
        }

        .btn:active {
          transform: scale(0.96);
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-icon {
          padding: 5px 8px;
          font-size: 14px;
        }

        .stats {
          display: flex;
          gap: 4px;
          margin-bottom: 6px;
          font-size: 10px;
          font-weight: 600;
          flex-shrink: 0;
          flex-wrap: wrap;
        }

        .stat {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          padding: 3px 6px;
          border-radius: 8px;
          white-space: nowrap;
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
          gap: 3px;
          margin-bottom: 6px;
          flex-shrink: 0;
        }

        .stock-waste {
          display: flex;
          gap: 3px;
          flex: 1;
        }

        .foundation-piles {
          display: flex;
          gap: 3px;
          flex: 1;
        }

        .pile {
          flex: 1;
          aspect-ratio: 2.5/3.5;
          background: rgba(255, 255, 255, 0.1);
          border: 1.5px dashed rgba(255, 255, 255, 0.3);
          border-radius: 5px;
          position: relative;
          min-width: 0;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pile:active {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .card {
          width: 100%;
          height: 100%;
          background: white;
          border-radius: 5px;
          border: 1.5px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: clamp(11px, 3vw, 16px);
          font-weight: 700;
          cursor: grab;
          position: relative;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
          transition: all 0.15s;
          transform-origin: center;
        }

        .card:active {
          cursor: grabbing;
        }

        .card.selected {
          border-color: #fbbf24;
          box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.5);
          transform: translateY(-2px) scale(1.05);
          z-index: 100;
        }

        .card-back {
          background: #dc2626;
          color: white;
          cursor: pointer;
        }

        .card-suit {
          font-size: clamp(14px, 4vw, 22px);
          line-height: 1;
        }

        .card-rank {
          font-size: clamp(10px, 2.5vw, 14px);
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
          padding-bottom: 6px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }

        .tableau::-webkit-scrollbar {
          display: none;
        }

        .tableau-pile {
          position: relative;
          min-height: 80px;
        }

        .tableau-card {
          position: absolute;
          width: 100%;
          left: 0;
          cursor: grab;
        }

        .tableau-card:active {
          cursor: grabbing;
        }

        .empty-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: clamp(12px, 3vw, 18px);
          opacity: 0.4;
          pointer-events: none;
        }

        .drag-preview {
          position: fixed;
          pointer-events: none;
          z-index: 9999;
          left: 0;
          top: 0;
          will-change: transform;
        }

        .drag-preview-inner {
          position: relative;
          width: 50px;
          transform: translate(-50%, -50%);
        }

        .drag-preview .card {
          margin-bottom: 12px;
          width: 50px;
          aspect-ratio: 2.5/3.5;
        }

        .settings-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 10000;
          padding: 0;
        }

        .settings-content {
          background: linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%);
          color: #1f2937;
          padding: 16px;
          border-radius: 16px 16px 0 0;
          width: 100%;
          max-width: 100vw;
          max-height: 80vh;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }

        .settings-content::-webkit-scrollbar {
          width: 6px;
        }

        .settings-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .settings-content::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .settings-handle {
          width: 36px;
          height: 4px;
          background: #cbd5e1;
          border-radius: 2px;
          margin: 0 auto 12px;
        }

        .settings-title {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 14px 0;
          text-align: center;
        }

        .setting-group {
          margin-bottom: 16px;
        }

        .setting-label {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 6px;
          display: block;
          color: #374151;
        }

        .toggle {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toggle:active {
          background: #f3f4f6;
          transform: scale(0.98);
        }

        .toggle-switch {
          width: 44px;
          height: 24px;
          background: #d1d5db;
          border-radius: 12px;
          position: relative;
          transition: background 0.3s;
          flex-shrink: 0;
        }

        .toggle-switch.active {
          background: #10b981;
        }

        .toggle-knob {
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform 0.3s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .toggle-switch.active .toggle-knob {
          transform: translateX(20px);
        }

        .toggle-text {
          font-size: 13px;
          font-weight: 500;
        }

        .option-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
        }

        .option-grid.three-cols {
          grid-template-columns: repeat(3, 1fr);
        }

        .option {
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          border: 1.5px solid #e5e7eb;
          background: white;
          font-weight: 600;
          text-align: center;
          transition: all 0.2s;
          font-size: 11px;
        }

        .option:active {
          transform: scale(0.96);
        }

        .option.active {
          border-color: #10b981;
          background: #d1fae5;
          color: #065f46;
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
          padding: 28px 20px;
          border-radius: 16px;
          text-align: center;
          max-width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .win-title {
          font-size: 36px;
          margin: 0 0 10px 0;
        }

        .win-text {
          font-size: 15px;
          color: #6b7280;
          margin: 0 0 16px 0;
          font-weight: 500;
        }

        .win-stats {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-bottom: 16px;
          font-size: 12px;
        }

        .win-stat {
          text-align: center;
        }

        .win-stat-value {
          font-size: 20px;
          font-weight: 700;
          color: #10b981;
        }

        .win-stat-label {
          color: #6b7280;
          margin-top: 2px;
        }

        /* Desktop adjustments - navbar is taller on desktop */
        @media (min-width: 640px) {
          .game-container {
            padding: 12px;
            /* Navbar is ~61px on desktop due to larger padding */
            height: calc(100dvh - 61px);
          }

          .header {
            margin-bottom: 10px;
          }

          .title {
            font-size: 22px;
          }

          .btn {
            padding: 7px 14px;
            font-size: 13px;
          }

          .stats {
            font-size: 12px;
            margin-bottom: 10px;
            gap: 6px;
          }

          .stat {
            padding: 4px 10px;
          }

          .top-row {
            gap: 5px;
            margin-bottom: 10px;
          }

          .stock-waste {
            gap: 5px;
          }

          .foundation-piles {
            gap: 5px;
          }

          .tableau {
            gap: 4px;
          }

          .pile {
            border-radius: 7px;
            border-width: 2px;
          }

          .card {
            border-radius: 7px;
            font-size: clamp(14px, 3.5vw, 18px);
            border-width: 2px;
          }

          .card-suit {
            font-size: clamp(18px, 4.5vw, 26px);
          }

          .card-rank {
            font-size: clamp(12px, 3vw, 16px);
          }

          .drag-preview-inner {
            width: 70px;
          }

          .drag-preview .card {
            width: 70px;
            margin-bottom: 16px;
          }

          .settings-overlay {
            align-items: center;
          }

          .settings-content {
            border-radius: 16px;
            padding: 20px;
            max-width: 480px;
          }

          .settings-handle {
            display: none;
          }

          .settings-title {
            font-size: 22px;
          }

          .option {
            font-size: 12px;
            padding: 10px;
          }
        }
      `}</style>

      {/* Header */}
      <div className="header">
        <h1 className="title">🎴 Pasjans</h1>
        <div className="controls">
          <button
            className="btn btn-icon"
            onClick={undo}
            disabled={history.length === 0}
            title="Cofnij"
          >
            ↶
          </button>
          <button className="btn btn-icon" onClick={() => setShowSettings(true)} title="Ustawienia">
            ⚙
          </button>
          <button className="btn" onClick={initializeGame}>
            Nowa
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats">
        <div className="stat">⏱ {formatTime(time)}</div>
        <div className="stat">🎯 {moves}</div>
        <div className="stat">
          🏆 {game.foundation.reduce((sum, pile) => sum + pile.length, 0)}/52
        </div>
      </div>

      {/* Game Board */}
      <div className="game-board">
        {/* Top Row: Stock, Waste, Foundations */}
        <div className="top-row">
          <div className="stock-waste">
            {/* Stock */}
            <div className="pile" onClick={drawCard} data-pile="stock">
              {game.stock.length > 0 ? (
                <div
                  className="card card-back"
                  style={{
                    background: CARD_BACKS[cardBackIndex].style,
                    borderRadius: CARD_CORNERS[cardCornerIndex].radius,
                    boxShadow: CARD_SHADOWS[cardShadowIndex].shadow,
                  }}
                >
                  ✦
                </div>
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
                  const cardStyle = getCardStyle(card.suit);
                  return (
                    <div
                      className={`card ${isCardSelected('waste', game.waste.length - 1) ? 'selected' : ''}`}
                      style={{
                        background: cardStyle.bg,
                        borderColor: cardStyle.border,
                        borderRadius: cardStyle.borderRadius,
                        boxShadow: cardStyle.boxShadow,
                        color: cardStyle.color,
                      }}
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
                      const cardStyle = getCardStyle(card.suit);
                      return (
                        <div
                          className="card"
                          style={{
                            background: cardStyle.bg,
                            borderColor: cardStyle.border,
                            borderRadius: cardStyle.borderRadius,
                            boxShadow: cardStyle.boxShadow,
                            color: cardStyle.color,
                          }}
                        >
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
            <div key={pileIndex} className="pile tableau-pile" data-pile={`tableau-${pileIndex}`}>
              {pile.length === 0 && <div className="empty-icon">K</div>}
              {pile.map((card, cardIndex) => {
                const cardStyle = card.faceUp ? getCardStyle(card.suit) : null;
                const isMobile = window.innerWidth < 640;
                const cardOffset = isMobile ? 12 : 18;

                return (
                  <div
                    key={card.id}
                    className={`tableau-card ${
                      card.faceUp ? `card` : 'card card-back'
                    } ${isCardSelected(`tableau-${pileIndex}`, cardIndex) ? 'selected' : ''}`}
                    style={{
                      top: `${cardIndex * cardOffset}px`,
                      zIndex: cardIndex,
                      background: !card.faceUp ? CARD_BACKS[cardBackIndex].style : cardStyle?.bg,
                      borderColor: card.faceUp ? cardStyle?.border : undefined,
                      borderRadius: card.faceUp
                        ? cardStyle?.borderRadius
                        : CARD_CORNERS[cardCornerIndex].radius,
                      boxShadow: card.faceUp
                        ? cardStyle?.boxShadow
                        : CARD_SHADOWS[cardShadowIndex].shadow,
                      color: card.faceUp ? cardStyle?.color : undefined,
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
            {dragging.cards.map((card) => {
              const cardStyle = getCardStyle(card.suit);
              return (
                <div
                  key={card.id}
                  className="card"
                  style={{
                    background: cardStyle.bg,
                    borderColor: cardStyle.border,
                    borderRadius: cardStyle.borderRadius,
                    boxShadow: cardStyle.boxShadow,
                    color: cardStyle.color,
                  }}
                >
                  <div className="card-rank">{card.rank}</div>
                  <div className="card-suit">{card.suit}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="settings-handle" />
              <h2 className="settings-title">⚙️ Ustawienia</h2>

              {/* Draw Mode */}
              <div className="setting-group">
                <label className="setting-label">Tryb dobierania</label>
                <div className="toggle" onClick={() => setDrawThree(!drawThree)}>
                  <div className={`toggle-switch ${drawThree ? 'active' : ''}`}>
                    <div className="toggle-knob" />
                  </div>
                  <span className="toggle-text">Dobieraj po 3 karty</span>
                </div>
              </div>

              {/* Animations */}
              <div className="setting-group">
                <label className="setting-label">Animacje</label>
                <div className="toggle" onClick={() => setAnimations(!animations)}>
                  <div className={`toggle-switch ${animations ? 'active' : ''}`}>
                    <div className="toggle-knob" />
                  </div>
                  <span className="toggle-text">Włącz animacje</span>
                </div>
              </div>

              {/* Background */}
              <div className="setting-group">
                <label className="setting-label">Tło stołu</label>
                <div className="option-grid">
                  {BACKGROUNDS.map((bg, i) => (
                    <div
                      key={i}
                      className={`option ${bgIndex === i ? 'active' : ''}`}
                      onClick={() => setBgIndex(i)}
                    >
                      {bg.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Style */}
              <div className="setting-group">
                <label className="setting-label">Styl kart</label>
                <div className="option-grid">
                  {CARD_STYLES.map((style, i) => (
                    <div
                      key={i}
                      className={`option ${cardStyleIndex === i ? 'active' : ''}`}
                      onClick={() => setCardStyleIndex(i)}
                    >
                      {style.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Back */}
              <div className="setting-group">
                <label className="setting-label">Rewers kart</label>
                <div className="option-grid">
                  {CARD_BACKS.map((back, i) => (
                    <div
                      key={i}
                      className={`option ${cardBackIndex === i ? 'active' : ''}`}
                      onClick={() => setCardBackIndex(i)}
                    >
                      {back.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Corners */}
              <div className="setting-group">
                <label className="setting-label">Zaokrąglenie rogów</label>
                <div className="option-grid three-cols">
                  {CARD_CORNERS.map((corner, i) => (
                    <div
                      key={i}
                      className={`option ${cardCornerIndex === i ? 'active' : ''}`}
                      onClick={() => setCardCornerIndex(i)}
                    >
                      {corner.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Shadows */}
              <div className="setting-group">
                <label className="setting-label">Cień kart</label>
                <div className="option-grid">
                  {CARD_SHADOWS.map((shadow, i) => (
                    <div
                      key={i}
                      className={`option ${cardShadowIndex === i ? 'active' : ''}`}
                      onClick={() => setCardShadowIndex(i)}
                    >
                      {shadow.name}
                    </div>
                  ))}
                </div>
              </div>

              <button
                className="btn"
                style={{ width: '100%', marginTop: '10px', padding: '10px' }}
                onClick={() => setShowSettings(false)}
              >
                Zamknij
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <div className="win-stat">
                  <div className="win-stat-value">{moves}</div>
                  <div className="win-stat-label">Ruchów</div>
                </div>
                <div className="win-stat">
                  <div className="win-stat-value">{formatTime(time)}</div>
                  <div className="win-stat-label">Czas</div>
                </div>
              </div>
              <button
                className="btn"
                onClick={initializeGame}
                style={{ width: '100%', padding: '10px' }}
              >
                Zagraj ponownie
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
