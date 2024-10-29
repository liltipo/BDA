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

// Función para agregar un nuevo time value
async function addTimeValue(stampId, timeValue) {
    const query = `
      UPDATE librepost.stamps 
      SET time_value = time_value + ?
      WHERE stamp_id = ?
    `;
    
    try {
      // En lugar de usar un Map, construimos un objeto simple que represente el mapa en Cassandra
      const timeValueMap = { [timeValue.date]: timeValue.value };
      
      await client.execute(query, [timeValueMap, stampId], { prepare: true });
      console.log('Nuevo time value agregado.');
    } catch (err) {
      console.error('Error agregando el time value:', err);
    }
  }  
  
  
// Función para modificar un time value existente
async function updateTimeValue(stampId, date, newValue) {
    // Convertir la fecha a formato ISO para la comparación
    const formattedDate = new Date(date).toISOString();
  
    // Primero, recuperamos los time_value existentes
    const getTimeValueQuery = `
      SELECT time_value 
      FROM librepost.stamps 
      WHERE stamp_id = ?
    `;
  
    try {
      const result = await client.execute(getTimeValueQuery, [stampId], { prepare: true });
      
      if (result.rows.length > 0 && result.rows[0].time_value) {
        const timeValueMap = result.rows[0].time_value;
  
        // Comprobar si la fecha que queremos modificar ya existe
        const existingDate = Object.keys(timeValueMap).find(key => {
          return new Date(key).toISOString() === formattedDate;
        });
  
        if (existingDate) {
          // Actualizamos el time_value existente
          const updateQuery = `
            UPDATE librepost.stamps 
            SET time_value[?] = ? 
            WHERE stamp_id = ?
          `;
          await client.execute(updateQuery, [existingDate, newValue, stampId], { prepare: true });
          console.log('Time value actualizado.');
        } else {
          console.log('No se encontró la fecha específica para actualizar.');
        }
      } else {
        console.log('No se encontraron time values existentes.');
      }
    } catch (err) {
      console.error('Error actualizando el time value:', err);
    }
  }
  
  
module.exports = { addStamp, searchStamps, addTimeValue, updateTimeValue };
  
