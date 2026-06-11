import { Suit, Rank } from './types';
import { Card } from './Card';

export class Deck {
  private cards: Card[];

  constructor() {
    this.cards = this.createDeck();
    this.shuffle();
  }

  private createDeck(): Card[] {
    const suits = Object.values(Suit);
    const ranks = Object.values(Rank);
    const deck: Card[] = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push(new Card(suit, rank));
      }
    }

    return deck;
  }

  shuffle(): void {
    // Алгоритм Фишера-Йетса для перемешивания
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  drawCard(): Card | null {
    return this.cards.pop() || null;
  }

  drawCards(count: number): Card[] {
    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
      const card = this.drawCard();
      if (card) {
        cards.push(card);
      } else {
        break;
      }
    }
    return cards;
  }

  getTrumpCard(): Card {
    // Козырь определяется последней картой в колоде (нижней)
    if (this.cards.length > 0) {
      const trumpCard = this.cards[0]; // Берем нижнюю карту как козырь
      // В реальной игре козырь показывается игрокам, но остается в колоде
      return trumpCard;
    }
    throw new Error('Deck is empty');
  }

  get remainingCards(): number {
    return this.cards.length;
  }

  isEmpty(): boolean {
    return this.cards.length === 0;
  }
}
