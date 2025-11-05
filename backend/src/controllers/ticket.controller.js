const { query, getClient } = require('../config/database');
const ResponseHandler = require('../utils/responseHandler');
const asyncHandler = require('../utils/asyncHandler');
const systemEvents = require('../utils/eventEmitter');

/**
 * @desc    Book a ticket
 * @route   POST /api/tickets/book
 * @access  Private
 */
const bookTicket = asyncHandler(async (req, res) => {
  const { fromStationId, toStationId, paymentMethod } = req.body;
  const userId = req.user.userid;

  // Validate that stations are different
  if (fromStationId === toStationId) {
    return ResponseHandler.error(res, 400, 'Source and destination stations must be different');
  }

  // Use the stored procedure to create booking
  const result = await query(
    'SELECT * FROM create_ticket_booking($1, $2, $3, $4::payment_method, $5)',
    [userId, fromStationId, toStationId, paymentMethod, 24] // 24 hours validity
  );

  if (result.rows.length === 0) {
    return ResponseHandler.error(res, 500, 'Failed to create booking');
  }

  const booking = result.rows[0];

  // Get station details
  const stationsResult = await query(
    `SELECT stationid, stationname, stationcode 
     FROM station 
     WHERE stationid IN ($1, $2)`,
    [fromStationId, toStationId]
  );

  const fromStation = stationsResult.rows.find(s => s.stationid === fromStationId);
  const toStation = stationsResult.rows.find(s => s.stationid === toStationId);

  // Emit ticket booking event for live logging
  systemEvents.emitTicketBooked({
    ticketId: booking.ticket_id,
    userId: userId,
    from: fromStation.stationname,
    to: toStation.stationname,
    fare: parseFloat(booking.total_fare),
  });

  return ResponseHandler.success(res, 201, 'Ticket booked successfully', {
    ticketId: booking.ticket_id,
    bookingId: booking.booking_id,
    transactionId: booking.transaction_id,
    qrCodeData: booking.qr_code,
    from: {
      id: fromStation.stationid,
      name: fromStation.stationname,
      code: fromStation.stationcode,
    },
    to: {
      id: toStation.stationid,
      name: toStation.stationname,
      code: toStation.stationcode,
    },
    fare: parseFloat(booking.total_fare),
    validFrom: booking.valid_from,
    validUntil: booking.valid_until,
    status: 'active',
  });
});

/**
 * @desc    Get user's ticket and journey history
 * @route   GET /api/tickets/history
 * @access  Private
 */
const getHistory = asyncHandler(async (req, res) => {
  const userId = req.user.userid;

  // Get user's smart card
  const cardResult = await query(
    'SELECT cardid FROM smartcard WHERE userid = $1',
    [userId]
  );

  const cardIds = cardResult.rows.map(row => row.cardid);

  // Get ticket bookings with journey details
  const ticketHistory = await query(
    `SELECT 
      'TICKET' as type,
      b.bookingid as id,
      s1.stationname as "fromStation",
      s1.stationcode as "fromCode",
      s2.stationname as "toStation",
      s2.stationcode as "toCode",
      b.totalfare as fare,
      b.bookingdate as date,
      t.qrcodedata as "qrCode",
      t.isused as used,
      j.status as "journeyStatus",
      j.entrytime as "entryTime",
      j.exittime as "exitTime"
    FROM booking b
    JOIN transaction tr ON b.transactionid = tr.transactionid
    JOIN station s1 ON b.sourcestationid = s1.stationid
    JOIN station s2 ON b.destinationstationid = s2.stationid
    JOIN ticket t ON b.bookingid = t.bookingid
    LEFT JOIN journey j ON t.ticketid = j.ticketid
    WHERE tr.userid = $1
    ORDER BY b.bookingdate DESC
    LIMIT 50`,
    [userId]
  );

  // Get card journey history
  let cardJourneyHistory = { rows: [] };
  if (cardIds.length > 0) {
    cardJourneyHistory = await query(
      `SELECT 
        'CARD_JOURNEY' as type,
        j.journeyid as id,
        s1.stationname as "fromStation",
        s1.stationcode as "fromCode",
        s2.stationname as "toStation",
        s2.stationcode as "toCode",
        j.farededucted as fare,
        j.entrytime as date,
        j.status as "journeyStatus",
        j.entrytime as "entryTime",
        j.exittime as "exitTime",
        j.cardid as "cardId"
      FROM journey j
      JOIN station s1 ON j.entrystationid = s1.stationid
      LEFT JOIN station s2 ON j.exitstationid = s2.stationid
      WHERE j.cardid = ANY($1::int[])
      ORDER BY j.entrytime DESC
      LIMIT 50`,
      [cardIds]
    );
  }

  // Combine and sort by date
  const combinedHistory = [...ticketHistory.rows, ...cardJourneyHistory.rows]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 50);

  return ResponseHandler.success(res, 200, 'History retrieved successfully', {
    history: combinedHistory,
    count: combinedHistory.length,
  });
});

module.exports = {
  bookTicket,
  getHistory,
};
