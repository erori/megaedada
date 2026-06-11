import { Card as CardType, Suit, Rank } from './types';
import { v4 as uuidv4 } from 'uuid';

export class Card implements CardType {
  public readonly suit: Suit;
  public readonly rank: Rank;
  public readonly id: string;

  constructor(suit: Suit, rank: Rank) {
    this.suit = suit;
    this.rank = rank;
    this.id = uuidv4();
  }

  get rankValue(): number {
    const rankOrder: Record<Rank, number> = {
      [Rank.SIX]: 6,
      [Rank.SEVEN]: 7,
      [Rank.EIGHT]: 8,
      [Rank.NINE]: 9,
      [Rank.TEN]: 10,
      [Rank.JACK]: 11,
      [Rank.QUEEN]: 12,
      [Rank.KING]: 13,
      [Rank.ACE]: 14
    };
    return rankOrder[this.rank];
  }

  isTrump(trumpSuit: Suit): boolean {
    return this.suit === trumpSuit;
  }

  canBeat(otherCard: Card, trumpSuit: Suit): boolean {
    // Если карты одной масти и эта карта старше
    if (this.suit === otherCard.suit) {
      return this.rankValue > otherCard.rankValue;
    }
    // Если эта карта козырная, а другая - нет
    return this.suit === trumpSuit && otherCard.suit !== trumpSuit;
  }

  toString(): string {
    return `${this.rank}${this.suit}`;
  }

  toJSON(): CardType {
    return {
      suit: this.suit,
      rank: this.rank,
      id: this.id
    };
  }
}
