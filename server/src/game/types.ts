export enum Suit {
  HEARTS = '♥',
  DIAMONDS = '♦',
  CLUBS = '♣',
  SPADES = '♠'
}

export enum Rank {
  SIX = '6',
  SEVEN = '7',
  EIGHT = '8',
  NINE = '9',
  TEN = '10',
  JACK = 'J',
  QUEEN = 'Q',
  KING = 'K',
  ACE = 'A'
}

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export interface Player {
  id: string;
  username: string;
  hand: Card[];
  isDefender: boolean;
  isAttacker: boolean;
  hasFinished: boolean;
  place: number | null;
}

export enum GamePhase {
  WAITING = 'WAITING',
  ATTACK = 'ATTACK',
  DEFENSE = 'DEFENSE',
  ADD_CARDS = 'ADD_CARDS',
  TAKE_CARDS = 'TAKE_CARDS',
  FINISHED = 'FINISHED'
}

export interface GameState {
  id: string;
  players: Player[];
  deck: Card[];
  trump: Card;
  tableCards: Array<{
    attack: Card;
    defense: Card | null;
    playerId: string;
  }>;
  currentPlayerIndex: number;
  defenderIndex: number;
  phase: GamePhase;
  discardPile: Card[];
  winner: string | null;
  isTransferable: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Room {
  id: string;
  name: string;
  players: Player[];
  gameState: GameState | null;
  settings: {
    maxPlayers: number;
    isPrivate: boolean;
    transferable: boolean;
    turnTimeout: number;
  };
  createdAt: number;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  coins: number;
  gamesPlayed: number;
  gamesWon: number;
}
