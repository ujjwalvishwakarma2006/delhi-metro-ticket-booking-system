const { query, getClient } = require('../config/database');
const ResponseHandler = require('../utils/responseHandler');
const asyncHandler = require('../utils/asyncHandler');
const systemEvents = require('../utils/eventEmitter');

/**
 * @desc    Process journey entry at station gate
 * @route   POST /api/journey/entry
 * @access  Public (used by station gates)
 */
const journeyEntry = asyncHandler(async (req, res) => {
  const { mediaType, mediaId, stationId } = req.body;

  // Validate station exists
  const stationResult = await query(
    'SELECT stationid, stationname, isoperational FROM station WHERE stationid = $1',
    [stationId]
  );

  if (stationResult.rows.length === 0) {
    return ResponseHandler.error(res, 404, 'Station not found');
  }

  const station = stationResult.rows[0];

  if (!station.isoperational) {
    return ResponseHandler.error(res, 400, 'Station is not operational');
  }

  // Process based on media type
  if (mediaType === 'Ticket') {
    // Validate ticket
    const ticketResult = await query(
      `SELECT t.ticketid, t.isused, t.validfrom, t.validuntil, 
              b.sourcestationid, b.destinationstationid
       FROM ticket t
       JOIN booking b ON t.bookingid = b.bookingid
       WHERE t.ticketid = $1`,
      [mediaId]
    );

    if (ticketResult.rows.length === 0) {
      return ResponseHandler.error(res, 404, 'Ticket not found');
    }

    const ticket = ticketResult.rows[0];

    // Check if ticket is already used
    if (ticket.isused) {
      return ResponseHandler.error(res, 400, 'Ticket has already been used');
    }

    // Check validity period
    const now = new Date();
    const validFrom = new Date(ticket.validfrom);
    const validUntil = new Date(ticket.validuntil);

    if (now < validFrom || now > validUntil) {
      return ResponseHandler.error(res, 400, 'Ticket is not valid at this time');
    }

    // Check if entry station matches source station
    if (ticket.sourcestationid !== stationId) {
      return ResponseHandler.error(res, 400, 'Entry station does not match ticket source station');
    }

    // Check if there's already an active journey for this ticket
    const existingJourneyResult = await query(
      'SELECT journeyid FROM journey WHERE ticketid = $1 AND status = $2',
      [mediaId, 'Active']
    );

    if (existingJourneyResult.rows.length > 0) {
      return ResponseHandler.error(res, 400, 'An active journey already exists for this ticket');
    }

    // Start journey using stored procedure
    const journeyResult = await query(
      'SELECT start_journey($1::journey_type, $2, $3) as journey_id',
      [mediaType, stationId, mediaId]
    );

    const journeyId = journeyResult.rows[0].journey_id;

    // Emit journey entry event for live logging
    systemEvents.emitJourneyEntry({
      journeyId,
      mediaType,
      mediaId,
      station: station.stationid,
      stationName: station.stationname,
    });

    return ResponseHandler.success(res, 200, 'Entry permitted - Journey started', {
      journeyId,
      mediaType,
      mediaId,
      station: {
        id: station.stationid,
        name: station.stationname,
      },
      entryTime: new Date().toISOString(),
    });

  } else if (mediaType === 'Card') {
    // Validate card
    const cardResult = await query(
      'SELECT cardid, balance, isactive FROM smartcard WHERE cardid = $1',
      [mediaId]
    );

    if (cardResult.rows.length === 0) {
      return ResponseHandler.error(res, 404, 'Card not found');
    }

    const card = cardResult.rows[0];

    if (!card.isactive) {
      return ResponseHandler.error(res, 400, 'Card is not active');
    }

    // Check minimum balance (₹10)
    if (parseFloat(card.balance) < 10.00) {
      return ResponseHandler.error(res, 400, `Insufficient balance. Current balance: ₹${card.balance}. Minimum required: ₹10`);
    }

    // Check if there's already an active journey for this card
    const existingJourneyResult = await query(
      'SELECT journeyid FROM journey WHERE cardid = $1 AND status = $2',
      [mediaId, 'Active']
    );

    if (existingJourneyResult.rows.length > 0) {
      return ResponseHandler.error(res, 400, 'An active journey already exists for this card');
    }

    // Start journey using stored procedure
    const journeyResult = await query(
      'SELECT start_journey($1::journey_type, $2, NULL, $3) as journey_id',
      [mediaType, stationId, mediaId]
    );

    const journeyId = journeyResult.rows[0].journey_id;

    // Emit journey entry event for live logging
    systemEvents.emitJourneyEntry({
      journeyId,
      mediaType,
      mediaId,
      station: station.stationid,
      stationName: station.stationname,
    });

    return ResponseHandler.success(res, 200, 'Entry permitted - Journey started', {
      journeyId,
      mediaType,
      mediaId,
      station: {
        id: station.stationid,
        name: station.stationname,
      },
      currentBalance: parseFloat(card.balance),
      entryTime: new Date().toISOString(),
    });

  } else {
    return ResponseHandler.error(res, 400, 'Invalid media type');
  }
});

/**
 * @desc    Process journey exit at station gate
 * @route   POST /api/journey/exit
 * @access  Public (used by station gates)
 */
const journeyExit = asyncHandler(async (req, res) => {
  const { mediaType, mediaId, stationId } = req.body;

  // Validate station exists
  const stationResult = await query(
    'SELECT stationid, stationname, isoperational FROM station WHERE stationid = $1',
    [stationId]
  );

  if (stationResult.rows.length === 0) {
    return ResponseHandler.error(res, 404, 'Station not found');
  }

  const station = stationResult.rows[0];

  if (!station.isoperational) {
    return ResponseHandler.error(res, 400, 'Station is not operational');
  }

  // Find active journey
  let journeyResult;
  if (mediaType === 'Ticket') {
    journeyResult = await query(
      `SELECT j.journeyid, j.entrystationid, j.entrytime, 
              b.sourcestationid, b.destinationstationid, b.totalfare
       FROM journey j
       JOIN ticket t ON j.ticketid = t.ticketid
       JOIN booking b ON t.bookingid = b.bookingid
       WHERE j.ticketid = $1 AND j.status = $2`,
      [mediaId, 'Active']
    );
  } else if (mediaType === 'Card') {
    journeyResult = await query(
      'SELECT journeyid, entrystationid, entrytime FROM journey WHERE cardid = $1 AND status = $2',
      [mediaId, 'Active']
    );
  } else {
    return ResponseHandler.error(res, 400, 'Invalid media type');
  }

  if (journeyResult.rows.length === 0) {
    return ResponseHandler.error(res, 404, 'No active journey found for this media');
  }

  const journey = journeyResult.rows[0];

  // For tickets, validate exit station
  if (mediaType === 'Ticket') {
    const entryStationId = journey.entrystationid;
    const expectedExitStationId = journey.destinationstationid;
    const paidFare = parseFloat(journey.totalfare);

    // Calculate actual fare
    const actualFareResult = await query(
      'SELECT get_current_fare($1, $2) as fare',
      [entryStationId, stationId]
    );

    const actualFare = parseFloat(actualFareResult.rows[0].fare);

    // Check if actual fare exceeds paid fare
    if (actualFare > paidFare) {
      return ResponseHandler.error(res, 400, 
        `Insufficient fare. Paid: ₹${paidFare}, Required: ₹${actualFare}. Please pay penalty at counter.`
      );
    }

    // Warn if exiting at wrong station (but allow it if fare is covered)
    let warning = null;
    if (stationId !== expectedExitStationId) {
      const expectedStationResult = await query(
        'SELECT stationname FROM station WHERE stationid = $1',
        [expectedExitStationId]
      );
      warning = `Note: Your ticket was for ${expectedStationResult.rows[0].stationname}, but you are exiting at ${station.stationname}`;
    }

    // Complete journey
    const completeResult = await query(
      'SELECT * FROM complete_journey($1, $2)',
      [journey.journeyid, stationId]
    );

    // Emit journey exit event for live logging
    systemEvents.emitJourneyExit({
      journeyId: journey.journeyid,
      mediaType,
      mediaId,
      station: stationId,
      stationName: station.stationname,
      fareCharged: actualFare,
    });

    return ResponseHandler.success(res, 200, 'Exit permitted - Journey completed', {
      journeyId: journey.journeyid,
      mediaType,
      mediaId,
      entryStation: journey.entrystationid,
      exitStation: station.stationid,
      exitStationName: station.stationname,
      entryTime: journey.entrytime,
      exitTime: new Date().toISOString(),
      fareCharged: paidFare,
      warning,
    });

  } else if (mediaType === 'Card') {
    // Get card balance
    const cardResult = await query(
      'SELECT balance FROM smartcard WHERE cardid = $1',
      [mediaId]
    );

    const currentBalance = parseFloat(cardResult.rows[0].balance);

    // Calculate fare
    const fareResult = await query(
      'SELECT get_current_fare($1, $2) as fare',
      [journey.entrystationid, stationId]
    );

    const fare = parseFloat(fareResult.rows[0].fare);

    // Check if balance is sufficient
    if (currentBalance < fare) {
      return ResponseHandler.error(res, 400, 
        `Insufficient balance. Current: ₹${currentBalance}, Required: ₹${fare}. Please recharge at counter.`
      );
    }

    // Complete journey (will deduct fare automatically via trigger)
    const completeResult = await query(
      'SELECT * FROM complete_journey($1, $2)',
      [journey.journeyid, stationId]
    );

    const fareDeducted = parseFloat(completeResult.rows[0].fare_deducted);
    const newBalance = currentBalance - fareDeducted;

    // Emit journey exit event for live logging
    systemEvents.emitJourneyExit({
      journeyId: journey.journeyid,
      mediaType,
      mediaId,
      station: stationId,
      stationName: station.stationname,
      fareCharged: fareDeducted,
    });

    return ResponseHandler.success(res, 200, 'Exit permitted - Journey completed', {
      journeyId: journey.journeyid,
      mediaType,
      mediaId,
      entryStation: journey.entrystationid,
      exitStation: station.stationid,
      exitStationName: station.stationname,
      entryTime: journey.entrytime,
      exitTime: new Date().toISOString(),
      fareCharged: fareDeducted,
      previousBalance: currentBalance,
      newBalance: newBalance,
    });
  }
});

module.exports = {
  journeyEntry,
  journeyExit,
};
