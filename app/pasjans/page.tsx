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
    name: 'Czerwony klasyczny',
    style: 'repeating-linear-gradient(45deg, #dc2626, #dc2626 10px, #b91c1c 10px, #b91c1c 20px)',
  },
  {
    name: 'Niebieski klasyczny',
    style: 'repeating-linear-gradient(45deg, #3b82f6, #3b82f6 10px, #2563eb 10px, #2563eb 20px)',
  },
  {
    name: 'Zielony klasyczny',
    style: 'repeating-linear-gradient(45deg, #22c55e, #22c55e 10px, #16a34a 10px, #16a34a 20px)',
  },
  {
    name: 'Fioletowy klasyczny',
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
    name: 'Geometryczny niebieski',
    style:
      'radial-gradient(circle at 25% 25%, #6366f1 0%, #6366f1 25%, #4f46e5 25%, #4f46e5 50%, #6366f1 50%, #6366f1 75%, #4f46e5 75%)',
  },
  {
    name: 'Geometryczny czerwony',
    style:
      'radial-gradient(circle at 25% 25%, #dc2626 0%, #dc2626 25%, #b91c1c 25%, #b91c1c 50%, #dc2626 50%, #dc2626 75%, #b91c1c 75%)',
  },
  {
    name: 'Kratkowany czarny',
    style: 'repeating-conic-gradient(#1f2937 0% 25%, #374151 0% 50%) 50% / 20px 20px',
  },
  {
    name: 'Kratkowany biały',
    style: 'repeating-conic-gradient(#f3f4f6 0% 25%, #e5e7eb 0% 50%) 50% / 20px 20px',
  },
  {
    name: 'Diamentowy',
    style:
      'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px), linear-gradient(135deg, #6366f1, #8b5cf6)',
  },
  {
    name: 'Gradient tęczowy',
    style: 'linear-gradient(135deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)',
  },
  { name: 'Gradient ocean', style: 'linear-gradient(135deg, #0077be, #00a8e8, #00d4ff)' },
  { name: 'Gradient zachód', style: 'linear-gradient(135deg, #ff6b6b, #ee5a6f, #c44569, #f38181)' },
  { name: 'Gradient las', style: 'linear-gradient(135deg, #134e4a, #16a34a, #22c55e)' },
  { name: 'Czarny matowy', style: '#1f2937' },
  { name: 'Biały matowy', style: '#f3f4f6' },
  { name: 'Złoty', style: 'linear-gradient(135deg, #d4af37, #ffd700, #ffed4e)' },
  { name: 'Srebrny', style: 'linear-gradient(135deg, #94a3b8, #cbd5e1, #e2e8f0)' },
  { name: 'Miedziany', style: 'linear-gradient(135deg, #b87333, #cd7f32, #d4af37)' },
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
    name: 'Neon jasny',
    heartColor: '#ff006e',
    diamondColor: '#ff006e',
    clubColor: '#8338ec',
    spadeColor: '#3a86ff',
    bgColor: '#ffffff',
    borderColor: '#00f5ff',
  },
  {
    name: 'Neon ciemny',
    heartColor: '#ff006e',
    diamondColor: '#ff006e',
    clubColor: '#8338ec',
    spadeColor: '#3a86ff',
    bgColor: '#000000',
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
    name: 'Srebrny',
    heartColor: '#94a3b8',
    diamondColor: '#cbd5e1',
    clubColor: '#475569',
    spadeColor: '#334155',
    bgColor: '#f8fafc',
    borderColor: '#94a3b8',
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
    name: 'Odwrócony',
    heartColor: '#ffffff',
    diamondColor: '#ffffff',
    clubColor: '#ffffff',
    spadeColor: '#ffffff',
    bgColor: '#1f2937',
    borderColor: '#ffffff',
  },
  {
    name: 'Kolorowy',
    heartColor: '#ef4444',
    diamondColor: '#f59e0b',
    clubColor: '#10b981',
    spadeColor: '#3b82f6',
    bgColor: '#ffffff',
    borderColor: '#6366f1',
  },
  {
    name: 'Ciemny luksus',
    heartColor: '#b91c1c',
    diamondColor: '#b91c1c',
    clubColor: '#d4af37',
    spadeColor: '#d4af37',
    bgColor: '#0f0f0f',
    borderColor: '#d4af37',
  },
  {
    name: 'Wiosenny',
    heartColor: '#ff6b9d',
    diamondColor: '#feca57',
    clubColor: '#48dbfb',
    spadeColor: '#1dd1a1',
    bgColor: '#f8f9fa',
    borderColor: '#ff6b9d',
  },
  {
    name: 'Jesienny',
    heartColor: '#e67e22',
    diamondColor: '#f39c12',
    clubColor: '#d35400',
    spadeColor: '#8b4513',
    bgColor: '#fef5e7',
    borderColor: '#e67e22',
  },
  {
    name: 'Zimowy',
    heartColor: '#3498db',
    diamondColor: '#5dade2',
    clubColor: '#1f618d',
    spadeColor: '#154360',
    bgColor: '#ebf5fb',
    borderColor: '#3498db',
  },
  {
    name: 'Wysoki kontrast',
    heartColor: '#ff0000',
    diamondColor: '#ff0000',
    clubColor: '#0000ff',
    spadeColor: '#0000ff',
    bgColor: '#ffffff',
    borderColor: '#000000',
  },
];

const CARD_CORNERS = [
  { name: 'Ostre', radius: '4px' },
  { name: 'Zaokrąglone', radius: '8px' },
  { name: 'Bardzo zaokrąglone', radius: '16px' },
  { name: 'Kapsułka', radius: '24px' },
];

const CARD_BORDERS = [
  { name: 'Cienka', width: '1px' },
  { name: 'Normalna', width: '2px' },
  { name: 'Gruba', width: '3px' },
  { name: 'Bardzo gruba', width: '4px' },
];

const CARD_SHADOWS = [
  { name: 'Brak', shadow: 'none' },
  { name: 'Subtelny', shadow: '0 1px 3px rgba(0, 0, 0, 0.1)' },
  { name: 'Normalny', shadow: '0 2px 6px rgba(0, 0, 0, 0.15)' },
  { name: 'Mocny', shadow: '0 4px 12px rgba(0, 0, 0, 0.25)' },
  { name: 'Neon', shadow: '0 0 20px currentColor' },
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
  const [cardBorderIndex, setCardBorderIndex] = useState(1);
  const [cardShadowIndex, setCardShadowIndex] = useState(2);
  const [animations, setAnimations] = useState(true);
  const [cardSize, setCardSize] = useState(1); // 0.8, 1, 1.2

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

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragging) return;

    e.preventDefault();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setDragOffset({ x: clientX, y: clientY });
  }, [dragging]);

  const handleDragEnd = useCallback((e: MouseEvent | TouchEvent) => {
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
  }, [dragging, moveCards]);

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
    const border = CARD_BORDERS[cardBorderIndex];
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
      borderWidth: border.width,
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

        html,
        body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          overscroll-behavior: none;
          position: fixed;
          width: 100%;
          height: 100%;
        }

        .game-container {
          min-height: 100vh;
          min-height: 100dvh;
          height: 100vh;
          height: 100dvh;
          width: 100vw;
          max-width: 100vw;
          padding: 8px;
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
          margin-bottom: 8px;
          gap: 8px;
          flex-shrink: 0;
        }

        .title {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .controls {
          display: flex;
          gap: 6px;
        }

        .btn {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
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
          padding: 6px 10px;
          font-size: 16px;
        }

        .stats {
          display: flex;
          gap: 6px;
          margin-bottom: 8px;
          font-size: 11px;
          font-weight: 600;
          flex-shrink: 0;
          flex-wrap: wrap;
        }

        .stat {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          padding: 4px 8px;
          border-radius: 10px;
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
          gap: 4px;
          margin-bottom: 8px;
          flex-shrink: 0;
        }

        .stock-waste {
          display: flex;
          gap: 4px;
          flex: 1;
        }

        .foundation-piles {
          display: flex;
          gap: 4px;
          flex: 1;
        }

        .pile {
          flex: 1;
          aspect-ratio: 2.5/3.5;
          background: rgba(255, 255, 255, 0.1);
          border: 2px dashed rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          position: relative;
          min-width: 0;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pile:active {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .pile.drag-over {
          background: rgba(255, 255, 255, 0.25);
          border-color: rgba(255, 255, 255, 0.7);
          transform: scale(1.02);
        }

        .card {
          width: 100%;
          height: 100%;
          background: white;
          border-radius: 6px;
          border: 2px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: clamp(14px, 3.5vw, 20px);
          font-weight: 700;
          cursor: grab;
          position: relative;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          transition: all 0.15s;
          transform-origin: center;
        }

        .card.size-small {
          transform: scale(0.85);
        }

        .card.size-large {
          transform: scale(1.15);
        }

        .card:active {
          cursor: grabbing;
        }

        .card.selected {
          border-color: #fbbf24;
          box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.5);
          transform: translateY(-2px) scale(1.05);
          z-index: 100;
        }

        .card.selected.size-small {
          transform: translateY(-2px) scale(0.9);
        }

        .card.selected.size-large {
          transform: translateY(-2px) scale(1.2);
        }

        .card-back {
          background: #dc2626;
          color: white;
          cursor: pointer;
        }

        .card-suit {
          font-size: clamp(18px, 4.5vw, 28px);
          line-height: 1;
        }

        .card-rank {
          font-size: clamp(12px, 3vw, 18px);
          line-height: 1;
        }

        .tableau {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 3px;
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          min-height: 0;
          padding-bottom: 8px;
        }

        .tableau-pile {
          position: relative;
          min-height: 100px;
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
          font-size: clamp(16px, 3.5vw, 24px);
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
          width: 60px;
          transform: translate(-50%, -50%);
        }

        .drag-preview .card {
          margin-bottom: 15px;
          width: 60px;
          aspect-ratio: 2.5/3.5;
        }

        .settings-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 10000;
          padding: 0;
          touch-action: none;
        }

        .settings-content {
          background: white;
          color: #1f2937;
          padding: 20px;
          border-radius: 20px 20px 0 0;
          width: 100%;
          max-width: 500px;
          max-height: 85vh;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .settings-title {
          font-size: 22px;
          font-weight: 700;
          margin: 0 0 16px 0;
          text-align: center;
        }

        .setting-group {
          margin-bottom: 20px;
        }

        .setting-label {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 8px;
          display: block;
          color: #374151;
        }

        .toggle {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f3f4f6;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .toggle:active {
          background: #e5e7eb;
        }

        .toggle-switch {
          width: 48px;
          height: 28px;
          background: #d1d5db;
          border-radius: 14px;
          position: relative;
          transition: background 0.3s;
          flex-shrink: 0;
        }

        .toggle-switch.active {
          background: #10b981;
        }

        .toggle-knob {
          width: 24px;
          height: 24px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform 0.3s;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle-switch.active .toggle-knob {
          transform: translateX(20px);
        }

        .option-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .option-grid.three-cols {
          grid-template-columns: repeat(3, 1fr);
        }

        .option {
          padding: 10px;
          border-radius: 8px;
          cursor: pointer;
          border: 2px solid #e5e7eb;
          font-weight: 600;
          text-align: center;
          transition: all 0.2s;
          font-size: 12px;
        }

        .option:active {
          border-color: #d1d5db;
          transform: scale(0.98);
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
          padding: 32px 24px;
          border-radius: 20px;
          text-align: center;
          max-width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .win-title {
          font-size: 40px;
          margin: 0 0 12px 0;
        }

        .win-text {
          font-size: 16px;
          color: #6b7280;
          margin: 0 0 20px 0;
          font-weight: 500;
        }

        .win-stats {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-bottom: 20px;
          font-size: 13px;
        }

        .win-stat {
          text-align: center;
        }

        .win-stat-value {
          font-size: 22px;
          font-weight: 700;
          color: #10b981;
        }

        .win-stat-label {
          color: #6b7280;
          margin-top: 4px;
        }

        @media (min-width: 640px) {
          .game-container {
            padding: 16px;
          }

          .header {
            margin-bottom: 12px;
          }

          .title {
            font-size: 24px;
          }

          .btn {
            padding: 8px 16px;
            font-size: 14px;
          }

          .stats {
            font-size: 13px;
            margin-bottom: 12px;
            gap: 8px;
          }

          .stat {
            padding: 5px 12px;
          }

          .top-row {
            gap: 6px;
            margin-bottom: 12px;
          }

          .stock-waste {
            gap: 6px;
          }

          .foundation-piles {
            gap: 6px;
          }

          .tableau {
            gap: 5px;
          }

          .pile {
            border-radius: 8px;
          }

          .card {
            border-radius: 8px;
            font-size: clamp(16px, 4vw, 20px);
          }

          .card-suit {
            font-size: clamp(20px, 5vw, 28px);
          }

          .card-rank {
            font-size: clamp(14px, 3.5vw, 18px);
          }

          .drag-preview-inner {
            width: 80px;
          }

          .drag-preview .card {
            width: 80px;
            margin-bottom: 20px;
          }

          .settings-overlay {
            align-items: center;
          }

          .settings-content {
            border-radius: 20px;
            padding: 24px;
          }

          .settings-title {
            font-size: 24px;
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
            Nowa gra
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
                      className={`card ${isCardSelected('waste', game.waste.length - 1) ? 'selected' : ''} ${
                        cardSize === 0.8 ? 'size-small' : cardSize === 1.2 ? 'size-large' : ''
                      }`}
                      style={{
                        background: cardStyle.bg,
                        borderColor: cardStyle.border,
                        borderWidth: cardStyle.borderWidth,
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
                          className={`card ${cardSize === 0.8 ? 'size-small' : cardSize === 1.2 ? 'size-large' : ''}`}
                          style={{
                            background: cardStyle.bg,
                            borderColor: cardStyle.border,
                            borderWidth: cardStyle.borderWidth,
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
                const cardOffset = isMobile ? 15 : 20;
                
                return (
                  <div
                    key={card.id}
                    className={`tableau-card ${
                      card.faceUp ? `card` : 'card card-back'
                    } ${isCardSelected(`tableau-${pileIndex}`, cardIndex) ? 'selected' : ''} ${
                      cardSize === 0.8 ? 'size-small' : cardSize === 1.2 ? 'size-large' : ''
                    }`}
                    style={{
                      top: `${cardIndex * cardOffset}px`,
                      zIndex: cardIndex,
                      background: !card.faceUp ? CARD_BACKS[cardBackIndex].style : cardStyle?.bg,
                      borderColor: card.faceUp ? cardStyle?.border : undefined,
                      borderWidth: card.faceUp ? cardStyle?.borderWidth : undefined,
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
            {dragging.cards.map((card, i) => {
              const cardStyle = getCardStyle(card.suit);
              return (
                <div
                  key={card.id}
                  className={`card ${cardSize === 0.8 ? 'size-small' : cardSize === 1.2 ? 'size-large' : ''}`}
                  style={{
                    background: cardStyle.bg,
                    borderColor: cardStyle.border,
                    borderWidth: cardStyle.borderWidth,
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
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="settings-title">⚙️ Ustawienia</h2>

              {/* Draw Mode */}
              <div className="setting-group">
                <label className="setting-label">Tryb dobierania</label>
                <div className="toggle" onClick={() => setDrawThree(!drawThree)}>
                  <div className={`toggle-switch ${drawThree ? 'active' : ''}`}>
                    <div className="toggle-knob" />
                  </div>
                  <span>Dobieraj po 3 karty</span>
                </div>
              </div>

              {/* Animations */}
              <div className="setting-group">
                <label className="setting-label">Animacje</label>
                <div className="toggle" onClick={() => setAnimations(!animations)}>
                  <div className={`toggle-switch ${animations ? 'active' : ''}`}>
                    <div className="toggle-knob" />
                  </div>
                  <span>Włącz animacje</span>
                </div>
              </div>

              {/* Card Size */}
              <div className="setting-group">
                <label className="setting-label">Rozmiar kart</label>
                <div className="option-grid three-cols">
                  <div
                    className={`option ${cardSize === 0.8 ? 'active' : ''}`}
                    onClick={() => setCardSize(0.8)}
                  >
                    Małe
                  </div>
                  <div
                    className={`option ${cardSize === 1 ? 'active' : ''}`}
                    onClick={() => setCardSize(1)}
                  >
                    Normalne
                  </div>
                  <div
                    className={`option ${cardSize === 1.2 ? 'active' : ''}`}
                    onClick={() => setCardSize(1.2)}
                  >
                    Duże
                  </div>
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
                <div className="option-grid">
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

              {/* Card Borders */}
              <div className="setting-group">
                <label className="setting-label">Grubość obramowania</label>
                <div className="option-grid">
                  {CARD_BORDERS.map((border, i) => (
                    <div
                      key={i}
                      className={`option ${cardBorderIndex === i ? 'active' : ''}`}
                      onClick={() => setCardBorderIndex(i)}
                    >
                      {border.name}
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
                style={{ width: '100%', marginTop: '12px' }}
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
              <button className="btn" onClick={initializeGame} style={{ width: '100%' }}>
                Zagraj ponownie
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
