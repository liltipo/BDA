const cassandra = require('cassandra-driver');

const client = new cassandra.Client({
  contactPoints: ['127.0.0.1'],
  localDataCenter: 'datacenter1',
  keyspace: 'librepost'
});

// Función para agregar una nueva estampilla
async function addStamp(stampData) {
    const query = `
      INSERT INTO librepost.stamps (stamp_id, title, country, year, serie, design, face_value, condition, status, seller, tags)
      VALUES (uuid(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await client.execute(query, [
      stampData.title, stampData.country, stampData.year, stampData.serie, stampData.design,
      stampData.face_value, stampData.condition, stampData.status, stampData.seller, stampData.tags
    ], { prepare: true });
  }
  
// Función para buscar estampillas con filtros
async function searchStamps(year, country, tags = [], condition = null) {
  let query = `
    SELECT title, stamp_id, status, time_value 
    FROM librepost.stamps 
    WHERE year = ? AND country = ?
  `;

  let params = [year, country];

  // Filtro opcional por condición
  if (condition) {
    query += ` AND condition = ?`;
    params.push(condition);
  }

  // Filtro opcional por tags (hasta 3)
  if (tags.length > 0) {
    query += ` AND tags CONTAINS ?`;
    params.push(tags[0]);
    if (tags[1]) {
      query += ` AND tags CONTAINS ?`;
      params.push(tags[1]);
    }
    if (tags[2]) {
      query += ` AND tags CONTAINS ?`;
      params.push(tags[2]);
    }
  }

  // Agregar ALLOW FILTERING para permitir la ejecución
  query += ` ALLOW FILTERING`;

  try {
    const result = await client.execute(query, params, { prepare: true });
    return result.rows;
  } catch (err) {
    console.error('Error realizando la búsqueda:', err);
  }
}

// Función para agregar un nuevo time value (usando string en formato DD-MM-YYYY)
async function addTimeValue(stampId, timeValue) {
  const query = `
    UPDATE librepost.stamps 
    SET time_value = time_value + ?
    WHERE stamp_id = ?
  `;

  try {
    const timeValueMap = { [timeValue.date]: timeValue.value };  // Usar la fecha en formato DD-MM-YYYY
    await client.execute(query, [timeValueMap, stampId], { prepare: true });
    console.log('Nuevo time value agregado.');
  } catch (err) {
    console.error('Error agregando el time value:', err);
  }
}

// Función para modificar un time value existente (usando string en formato DD-MM-YYYY)
async function updateTimeValue(stampId, date, newValue) {
  const query = `
    UPDATE librepost.stamps 
    SET time_value[?] = ? 
    WHERE stamp_id = ?
  `;

  try {
    await client.execute(query, [date, newValue, stampId], { prepare: true });
    console.log('Time value actualizado.');
  } catch (err) {
    console.error('Error actualizando el time value:', err);
  }
}

// Función para buscar estampillas por vendedor
async function getStampsBySeller(seller) {
  const query = `
    SELECT title, stamp_id, status, seller 
    FROM librepost.stamps 
    WHERE seller = ? ALLOW FILTERING
  `;

  try {
    const result = await client.execute(query, [seller], { prepare: true });
    return result.rows;
  } catch (err) {
    console.error('Error buscando estampillas por vendedor:', err);
  }
}

module.exports = { addStamp, searchStamps, addTimeValue, updateTimeValue, getStampsBySeller };
  
