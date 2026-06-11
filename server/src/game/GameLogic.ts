import { Card } from './Card';
import { Deck } from './Deck';
import { GameState, Player, GamePhase, Card as CardType } from './types';

export class GameLogic {
  private state: GameState;

  constructor(players: Player[], roomId: string, isTransferable: boolean = false) {
    const deck = new Deck();
    const trumpCard = deck.getTrumpCard();

    this.state = {
      id: roomId,
      players,
      deck: deck['cards'].map(c => c.toJSON()), // Сохраняем колоду для отправки клиенту
      trump: trumpCard.toJSON(),
      tableCards: [],
      currentPlayerIndex: 0,
      defenderIndex: 0,
      phase: GamePhase.ATTACK,
      discardPile: [],
      winner: null,
      isTransferable,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  dealCards(): void {
    const minCardsInHand = 6;
    
    for (const player of this.state.players) {
      const cardsToDeal = minCardsInHand - player.hand.length;
      if (cardsToDeal > 0) {
        const newCards = this.drawCardsFromDeck(cardsToDeal);
        player.hand.push(...newCards);
      }
    }
    
    this.state.updatedAt = Date.now();
  }

  private drawCardsFromDeck(count: number): CardType[] {
    const cards: CardType[] = [];
    const deck = this.state.deck;
    
    for (let i = 0; i < count; i++) {
      if (deck.length === 0) break;
      const card = deck.pop()!;
      cards.push(card);
    }
    
    return cards;
  }

  validateAttack(playerId: string, cardId: string): { valid: boolean; message?: string } {
    if (this.state.phase !== GamePhase.ATTACK) {
      return { valid: false, message: 'Сейчас не фаза атаки' };
    }

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      return { valid: false, message: 'Не ваша очередь ходить' };
    }

    const playerIndex = this.state.players.findIndex(p => p.id === playerId);
    const player = this.state.players[playerIndex];
    const card = player.hand.find(c => c.id === cardId);

    if (!card) {
      return { valid: false, message: 'Карта не найдена в руке' };
    }

    // Если это первый ход
    if (this.state.tableCards.length === 0) {
      return { valid: true };
    }

    // Проверяем, можно ли подкинуть карту (должна совпадать с картами на столе)
    const tableRanks = this.state.tableCards
      .flatMap(tc => [tc.attack.rank, tc.defense?.rank].filter(Boolean));
    
    if (!tableRanks.includes(card.rank)) {
      return { valid: false, message: 'Нет карты такого же достоинства на столе' };
    }

    // Проверяем лимит подкидываемых карт (не больше карт у защищающегося)
    const defender = this.state.players[this.state.defenderIndex];
    if (this.state.tableCards.length >= defender.hand.length) {
      return { valid: false, message: 'Нельзя подкинуть больше карт, чем у защищающегося' };
    }

    return { valid: true };
  }

  validateDefense(playerId: string, defenseCardId: string, attackCardId: string): { valid: boolean; message?: string } {
    if (this.state.phase !== GamePhase.DEFENSE) {
      return { valid: false, message: 'Сейчас не фаза защиты' };
    }

    const defender = this.state.players[this.state.defenderIndex];
    if (defender.id !== playerId) {
      return { valid: false, message: 'Не ваша очередь защищаться' };
    }

    const attackPair = this.state.tableCards.find(tc => tc.attack.id === attackCardId);
    if (!attackPair) {
      return { valid: false, message: 'Атакующая карта не найдена на столе' };
    }

    if (attackPair.defense) {
      return { valid: false, message: 'Эта карта уже побита' };
    }

    const defenseCard = defender.hand.find(c => c.id === defenseCardId);
    if (!defenseCard) {
      return { valid: false, message: 'Карта не найдена в руке' };
    }

    const attackCard = new Card(attackPair.attack.suit, attackPair.attack.rank);
    const defenseCardObj = new Card(defenseCard.suit, defenseCard.rank);
    const trumpSuit = this.state.trump.suit;

    if (!defenseCardObj.canBeat(attackCard, trumpSuit)) {
      return { valid: false, message: 'Эта карта не может побить атакующую' };
    }

    return { valid: true };
  }

  performAttack(playerId: string, cardId: string): { success: boolean; message?: string } {
    const validation = this.validateAttack(playerId, cardId);
    if (!validation.valid) {
      return validation;
    }

    const player = this.state.players.find(p => p.id === playerId)!;
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    const card = player.hand.splice(cardIndex, 1)[0];

    this.state.tableCards.push({
      attack: card,
      defense: null,
      playerId
    });

    // Переход к фазе защиты
    this.state.phase = GamePhase.DEFENSE;
    this.state.updatedAt = Date.now();

    return { success: true };
  }

  performDefense(playerId: string, defenseCardId: string, attackCardId: string): { success: boolean; message?: string } {
    const validation = this.validateDefense(playerId, defenseCardId, attackCardId);
    if (!validation.valid) {
      return validation;
    }

    const defender = this.state.players[this.state.defenderIndex];
    const cardIndex = defender.hand.findIndex(c => c.id === defenseCardId);
    const defenseCard = defender.hand.splice(cardIndex, 1)[0];

    const attackPair = this.state.tableCards.find(tc => tc.attack.id === attackCardId)!;
    attackPair.defense = defenseCard;

    // Проверяем, все ли карты побиты
    const allCardsBeaten = this.state.tableCards.every(tc => tc.defense !== null);
    
    if (allCardsBeaten) {
      this.state.phase = GamePhase.ADD_CARDS;
      // Возвращаем ход атакующим для подкидывания
      this.state.currentPlayerIndex = (this.state.defenderIndex + 1) % this.state.players.length;
    }

    this.state.updatedAt = Date.now();
    return { success: true };
  }

  transferCards(playerId: string): { success: boolean; message?: string } {
    if (!this.state.isTransferable) {
      return { success: false, message: 'Перевод не разрешен в этом режиме' };
    }

    if (this.state.phase !== GamePhase.DEFENSE) {
      return { success: false, message: 'Перевод возможен только в фазе защиты' };
    }

    const defender = this.state.players[this.state.defenderIndex];
    if (defender.id !== playerId) {
      return { success: false, message: 'Только защищающийся может переводить' };
    }

    if (this.state.tableCards.length === 0) {
      return { success: false, message: 'Нет карт для перевода' };
    }

    // Проверяем, есть ли у защищающегося карта того же достоинства
    const attackRank = this.state.tableCards[0].attack.rank;
    const hasTransferCard = defender.hand.some(card => card.rank === attackRank);

    if (!hasTransferCard) {
      return { success: false, message: 'Нет карты для перевода' };
    }

    // Перемещаем защиту на следующего игрока
    this.state.defenderIndex = (this.state.defenderIndex + 1) % this.state.players.length;
    this.state.updatedAt = Date.now();

    return { success: true };
  }

  takeCards(): { success: boolean } {
    // Защищающийся забирает все карты со стола
    const defender = this.state.players[this.state.defenderIndex];
    
    for (const tableEntry of this.state.tableCards) {
      defender.hand.push(tableEntry.attack);
      if (tableEntry.defense) {
        defender.hand.push(tableEntry.defense);
      }
    }

    this.state.tableCards = [];
    this.state.phase = GamePhase.TAKE_CARDS;
    this.moveToNextRound();
    
    this.state.updatedAt = Date.now();
    return { success: true };
  }

  finishBeat(): { success: boolean } {
    if (this.state.phase !== GamePhase.ADD_CARDS) {
      return { success: false };
    }

    // Все побитые карты уходят в отбой
    for (const tableEntry of this.state.tableCards) {
      if (tableEntry.attack) this.state.discardPile.push(tableEntry.attack);
      if (tableEntry.defense) this.state.discardPile.push(tableEntry.defense);
    }

    this.state.tableCards = [];
    this.moveToNextRound();
    
    this.state.updatedAt = Date.now();
    return { success: true };
  }

  private moveToNextRound(): void {
    // Восполняем карты игрокам
    this.dealCards();

    // Проверяем, есть ли победители
    this.checkWinners();

    if (this.state.winner) {
      this.state.phase = GamePhase.FINISHED;
      return;
    }

    // Переходим к следующему раунду
    this.state.phase = GamePhase.ATTACK;
    
    // Определяем следующего атакующего и защищающегося
    this.state.currentPlayerIndex = (this.state.defenderIndex + 1) % this.state.players.length;
    this.state.defenderIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
  }

  private checkWinners(): void {
    const activePlayers = this.state.players.filter(p => !p.hasFinished);
    
    // Проверяем, закончились ли у кого-то карты
    for (const player of activePlayers) {
      if (player.hand.length === 0 && this.state.deck.length === 0) {
        player.hasFinished = true;
        player.place = this.state.players.filter(p => p.hasFinished).length;
      }
    }

    // Если остался только один игрок с картами - он проиграл (дурак)
    const remainingPlayers = this.state.players.filter(p => !p.hasFinished);
    if (remainingPlayers.length === 1 && this.state.deck.length === 0) {
      remainingPlayers[0].hasFinished = true;
      remainingPlayers[0].place = this.state.players.length;
      
      // Определяем победителя (первый, кто остался без карт)
      const winner = this.state.players.find(p => p.place === 1);
      if (winner) {
        this.state.winner = winner.id;
      }
    }
  }

  getState(): GameState {
    return this.state;
  }
}
