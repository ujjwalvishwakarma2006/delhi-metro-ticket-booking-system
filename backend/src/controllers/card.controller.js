const { query } = require('../config/database');
const ResponseHandler = require('../utils/responseHandler');
const asyncHandler = require('../utils/asyncHandler');
const systemEvents = require('../utils/eventEmitter');

/**
 * @desc    Register a new smart card for user
 * @route   POST /api/cards/register
 * @access  Private
 */
const registerCard = asyncHandler(async (req, res) => {
  const { paymentMethod } = req.body;
  const userId = req.user.userid;

  // Check if user already has an active smart card
  const existingCard = await query(
    'SELECT cardid FROM smartcard WHERE userid = $1 AND isactive = true',
    [userId]
  );

  if (existingCard.rows.length > 0) {
    return ResponseHandler.error(res, 400, 'You already have an active smart card');
  }

  // Smart card registration fee
  const registrationFee = 50.00;

  // Create transaction for registration fee payment
  const transactionResult = await query(
    'INSERT INTO transaction (userid, amount, transactiontype) VALUES ($1, $2, $3) RETURNING transactionid',
    [userId, registrationFee, 'Recharge'] // Using Recharge type as it's the closest fit
  );

  const transactionId = transactionResult.rows[0].transactionid;

  // Create payment record
  await query(
    'INSERT INTO payment (transactionid, paymentmethod, status) VALUES ($1, $2::payment_method, $3::payment_status)',
    [transactionId, paymentMethod, 'Success']
  );

  // Create smart card with zero initial balance
  const cardResult = await query(
    'INSERT INTO smartcard (userid, balance, isactive) VALUES ($1, $2, $3) RETURNING cardid, balance, issuedat',
    [userId, 0.00, true]
  );

  const card = cardResult.rows[0];

  // Emit card registration event for live logging
  systemEvents.emitCardRegistered({
    cardId: card.cardid,
    userId: userId,
    registrationFee: registrationFee,
  });

  return ResponseHandler.success(res, 201, 'Smart card registered successfully', {
    card: {
      cardId: card.cardid,
      balance: parseFloat(card.balance),
      issuedAt: card.issuedat,
    },
    registrationFee: registrationFee,
    transactionId: transactionId,
    message: 'Registration fee of ₹50 charged successfully. You can now recharge your card.',
  });
});

/**
 * @desc    Recharge smart card
 * @route   POST /api/cards/recharge
 * @access  Private
 */
const rechargeCard = asyncHandler(async (req, res) => {
  const { amount, paymentMethod } = req.body;
  const userId = req.user.userid;

  // Get user's smart card
  const cardResult = await query(
    'SELECT cardid, balance FROM smartcard WHERE userid = $1 AND isactive = true',
    [userId]
  );

  if (cardResult.rows.length === 0) {
    return ResponseHandler.error(res, 404, 'No active smart card found for this user');
  }

  const card = cardResult.rows[0];

  // Use the stored procedure to recharge card
  const result = await query(
    'SELECT * FROM recharge_smart_card($1, $2, $3, $4::payment_method)',
    [userId, card.cardid, amount, paymentMethod]
  );

  if (result.rows.length === 0) {
    return ResponseHandler.error(res, 500, 'Failed to recharge card');
  }

  const recharge = result.rows[0];

  // Emit card recharge event for live logging
  systemEvents.emitCardRecharged({
    cardId: card.cardid,
    userId: userId,
    amount: parseFloat(amount),
    newBalance: parseFloat(recharge.new_balance),
  });

  return ResponseHandler.success(res, 200, 'Card recharged successfully', {
    transactionId: recharge.transaction_id,
    rechargeId: recharge.recharge_id,
    cardId: card.cardid,
    previousBalance: parseFloat(card.balance),
    amountAdded: parseFloat(amount),
    newBalance: parseFloat(recharge.new_balance),
    status: recharge.status,
  });
});

/**
 * @desc    Get smart card balance
 * @route   GET /api/cards/balance
 * @access  Private
 */
const getBalance = asyncHandler(async (req, res) => {
  const userId = req.user.userid;

  // Get user's smart card
  const cardResult = await query(
    'SELECT cardid, balance, isactive, issuedat, lastusedat FROM smartcard WHERE userid = $1 AND isactive = true',
    [userId]
  );

  if (cardResult.rows.length === 0) {
    return ResponseHandler.error(res, 404, 'No active smart card found for this user');
  }

  const card = cardResult.rows[0];

  return ResponseHandler.success(res, 200, 'Card balance retrieved successfully', {
    cardId: card.cardid,
    balance: parseFloat(card.balance),
    isActive: card.isactive,
    issuedAt: card.issuedat,
    lastUsedAt: card.lastusedat,
  });
});

/**
 * @desc    Get card details (alias for getBalance)
 * @route   GET /api/cards
 * @access  Private
 */
const getCardDetails = asyncHandler(async (req, res) => {
  const userId = req.user.userid;

  // Get user's smart card
  const cardResult = await query(
    'SELECT cardid, balance, isactive, issuedat, lastusedat FROM smartcard WHERE userid = $1 AND isactive = true',
    [userId]
  );

  if (cardResult.rows.length === 0) {
    return ResponseHandler.error(res, 404, 'No active smart card found for this user');
  }

  const card = cardResult.rows[0];

  // Get recent recharge history
  const rechargeHistory = await query(
    `SELECT 
      r.rechargeid as id,
      t.amount as amount,
      r.rechargedate as date,
      p.paymentmethod as "paymentMethod",
      p.status as status
    FROM recharge r
    JOIN transaction t ON r.transactionid = t.transactionid
    JOIN payment p ON t.transactionid = p.transactionid
    WHERE r.cardid = $1
    ORDER BY r.rechargedate DESC
    LIMIT 10`,
    [card.cardid]
  );

  return ResponseHandler.success(res, 200, 'Card details retrieved successfully', {
    card: {
      cardId: card.cardid,
      balance: parseFloat(card.balance),
      isActive: card.isactive,
      issuedAt: card.issuedat,
      lastUsedAt: card.lastusedat,
    },
    recentRecharges: rechargeHistory.rows,
  });
});

module.exports = {
  registerCard,
  rechargeCard,
  getBalance,
  getCardDetails,
};
