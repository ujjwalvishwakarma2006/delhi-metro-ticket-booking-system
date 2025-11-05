const { query } = require('../config/database');
const ResponseHandler = require('../utils/responseHandler');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all stations
 * @route   GET /api/stations
 * @access  Public
 */
const getAllStations = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT 
      stationid as id,
      stationname as name,
      stationcode as code,
      location as location,
      isoperational as "isOperational"
    FROM station
    WHERE isoperational = true
    ORDER BY stationname ASC`
  );

  return ResponseHandler.success(res, 200, 'Stations retrieved successfully', {
    stations: result.rows,
    count: result.rows.length,
  });
});

/**
 * @desc    Get fare between two stations
 * @route   GET /api/stations/fares?fromStationId=1&toStationId=5
 * @access  Public
 */
const getFare = asyncHandler(async (req, res) => {
  const { fromStationId, toStationId } = req.query;

  // Validate that stations are different
  if (parseInt(fromStationId) === parseInt(toStationId)) {
    return ResponseHandler.error(res, 400, 'Source and destination stations must be different');
  }

  // Check if stations exist
  const stationsResult = await query(
    `SELECT stationid, stationname, stationcode 
     FROM station 
     WHERE stationid IN ($1, $2) AND isoperational = true`,
    [fromStationId, toStationId]
  );

  if (stationsResult.rows.length !== 2) {
    return ResponseHandler.error(res, 404, 'One or both stations not found or not operational');
  }

  // Get fare using the database function
  const fareResult = await query(
    'SELECT get_current_fare($1, $2) as fare',
    [fromStationId, toStationId]
  );

  const fare = parseFloat(fareResult.rows[0].fare);

  if (fare <= 0) {
    return ResponseHandler.error(res, 404, 'Fare not found for this route');
  }

  // Get station details
  const fromStation = stationsResult.rows.find(s => s.stationid === parseInt(fromStationId));
  const toStation = stationsResult.rows.find(s => s.stationid === parseInt(toStationId));

  return ResponseHandler.success(res, 200, 'Fare retrieved successfully', {
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
    fare: fare,
  });
});

module.exports = {
  getAllStations,
  getFare,
};
