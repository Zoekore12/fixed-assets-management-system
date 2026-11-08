const pool = require("../config/database");

const securityStation = async ({
  stationCode,
  name,
  buildingId,
  isActive = true,
}) => {
  // Confirm the selected building exists.
  const buildingResult = await pool.query(
    `SELECT id FROM buildings WHERE id = $1`,
    [buildingId]
  );

  if (buildingResult.rowCount === 0) {
    const error = new Error("Building not found");
    error.statusCode = 404;
    throw error;
  }

  // Create the station and link it to the building.
  const result = await pool.query(
    `
      INSERT INTO security_stations (
        station_code,
        name,
        building_id,
        is_active
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        station_code,
        name,
        building_id,
        is_active,
        created_at,
        updated_at
    `,
    [stationCode, name, buildingId, isActive]
  );

  return result.rows[0];
};

const getAllSecurityStation = async () => {
  const query = `
    SELECT
      ss.id,
      ss.station_code,
      ss.name,
      ss.building_id,
      b.name AS building_name,
      ss.is_active,
      ss.created_at,
      ss.updated_at
    FROM security_stations ss
    LEFT JOIN buildings b
      ON b.id = ss.building_id
    ORDER BY ss.created_at DESC;
  `;

  const result = await pool.query(query);

  return result.rows;
};

module.exports = {
  securityStation,
  getAllSecurityStation
};
