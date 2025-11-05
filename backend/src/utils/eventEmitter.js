const { EventEmitter } = require('events');

/**
 * Global event emitter for real-time logging
 * Used to broadcast events to WebSocket clients
 */
class SystemEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Allow multiple WebSocket connections
  }

  /**
   * Emit a new user registration event
   */
  emitNewUser(userData) {
    this.emit('NEW_USER', {
      event: 'NEW_USER',
      timestamp: new Date().toISOString(),
      data: {
        userId: userData.id,
        name: userData.name,
        email: userData.email,
      },
    });
  }

  /**
   * Emit a ticket booking event
   */
  emitTicketBooked(ticketData) {
    this.emit('TICKET_BOOKED', {
      event: 'TICKET_BOOKED',
      timestamp: new Date().toISOString(),
      data: {
        ticketId: ticketData.ticketId,
        userId: ticketData.userId,
        from: ticketData.from,
        to: ticketData.to,
        fare: ticketData.fare,
      },
    });
  }

  /**
   * Emit a smart card registration event
   */
  emitCardRegistered(cardData) {
    this.emit('CARD_REGISTERED', {
      event: 'CARD_REGISTERED',
      timestamp: new Date().toISOString(),
      data: {
        cardId: cardData.cardId,
        userId: cardData.userId,
        fee: cardData.registrationFee,
      },
    });
  }

  /**
   * Emit a smart card recharge event
   */
  emitCardRecharged(rechargeData) {
    this.emit('CARD_RECHARGED', {
      event: 'CARD_RECHARGED',
      timestamp: new Date().toISOString(),
      data: {
        cardId: rechargeData.cardId,
        userId: rechargeData.userId,
        amount: rechargeData.amount,
        newBalance: rechargeData.newBalance,
      },
    });
  }

  /**
   * Emit a journey entry event
   */
  emitJourneyEntry(journeyData) {
    this.emit('JOURNEY_ENTRY', {
      event: 'JOURNEY_ENTRY',
      timestamp: new Date().toISOString(),
      data: {
        journeyId: journeyData.journeyId,
        mediaType: journeyData.mediaType,
        mediaId: journeyData.mediaId,
        station: journeyData.station,
        stationName: journeyData.stationName,
      },
    });
  }

  /**
   * Emit a journey exit event
   */
  emitJourneyExit(journeyData) {
    this.emit('JOURNEY_EXIT', {
      event: 'JOURNEY_EXIT',
      timestamp: new Date().toISOString(),
      data: {
        journeyId: journeyData.journeyId,
        mediaType: journeyData.mediaType,
        mediaId: journeyData.mediaId,
        station: journeyData.station,
        stationName: journeyData.stationName,
        fareCharged: journeyData.fareCharged,
      },
    });
  }
}

// Create singleton instance
const systemEvents = new SystemEventEmitter();

module.exports = systemEvents;
