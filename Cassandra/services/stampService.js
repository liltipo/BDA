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

// Función para buscar la estampilla más cara por condición y año sin usar vista materializada
async function getMostExpensiveStampsByYear(year) {
  const conditions = ['nuevo', 'usado', 'dañado'];  // Las tres condiciones
  const queries = conditions.map(condition => {
    return client.execute(
      `
        SELECT stamp_id, title, condition, face_value
        FROM librepost.stamps
        WHERE year = ? AND condition = ?
        ALLOW FILTERING
      `,
      [year, condition],
      { prepare: true }
    );
  });

  try {
    const results = await Promise.all(queries);
    // Para cada condición, seleccionamos la estampilla más cara
    const mostExpensiveStamps = results.map(result => {
      const stamps = result.rows;
      if (stamps.length > 0) {
        // Encontrar la estampilla con mayor face_value
        return stamps.reduce((prev, current) => (prev.face_value > current.face_value ? prev : current));
      }
      return null;  // Si no hay estampillas para esa condición
    });
    return mostExpensiveStamps;
  } catch (err) {
    console.error('Error buscando las estampillas más caras:', err);
  }
}

// Función para buscar la estampilla más barata por status en un rango de años
async function getCheapestStampsByStatusAndYearRange(startYear, endYear) {
  const statuses = ['disponible', 'vendido', 'reservado'];  // Los tres estados
  const queries = statuses.map(status => {
    return client.execute(
      `
        SELECT stamp_id, title, status, face_value
        FROM librepost.stamps
        WHERE year >= ? AND year <= ? AND status = ?
        ALLOW FILTERING;
      `,
      [startYear, endYear, status],
      { prepare: true }
    );
  });

  try {
    const results = await Promise.all(queries);
    // Para cada estado, seleccionamos la estampilla más barata ordenando los resultados en la aplicación
    const cheapestStamps = results.map(result => {
      const stamps = result.rows;
      if (stamps.length > 0) {
        // Encontrar la estampilla con menor face_value
        return stamps.reduce((prev, current) => (prev.face_value < current.face_value ? prev : current));
      }
      return null;  // Si no hay estampillas para ese estado
    });
    return cheapestStamps;
  } catch (err) {
    console.error('Error buscando las estampillas más baratas:', err);
    return [];  // Devolver array vacío en caso de error
  }
}

// Función para simular la compra de una estampilla
async function buyStamp(title, sellerId) {
  try {
    // Primero verificar si la estampilla está disponible
    const query = `
      SELECT stamp_id, status, transaction_history
      FROM librepost.stamps
      WHERE title = ? AND seller = ? ALLOW FILTERING;
    `;
    const result = await client.execute(query, [title, sellerId], { prepare: true });
    
    if (result.rowLength === 0) {
      console.log('Estampilla no encontrada o no pertenece al vendedor especificado.');
      return;
    }

    const stamp = result.rows[0];
    
    if (stamp.status !== 'disponible') {
      console.log('Estampilla no disponible para la compra.');
      return;
    }

    // Actualizar los datos en un BATCH
    const batchQuery = `
      BEGIN BATCH
      UPDATE librepost.stamps SET status = 'vendido' WHERE stamp_id = ?;
      UPDATE librepost.stamps SET seller = 'D' WHERE stamp_id = ?;
      UPDATE librepost.stamps SET transaction_history = transaction_history + [{toTimestamp(now()), 'compra'}] WHERE stamp_id = ?;
      APPLY BATCH;
    `;

    // Ejecutar el BATCH
    await client.execute(batchQuery, [stamp.stamp_id, stamp.stamp_id, stamp.stamp_id], { prepare: true });
    console.log('Compra realizada con éxito.');
  } catch (err) {
    console.error('Error en la compra de la estampilla:', err);
  }
}



module.exports = { addStamp, searchStamps, addTimeValue, updateTimeValue, getStampsBySeller, getMostExpensiveStampsByYear, getCheapestStampsByStatusAndYearRange, buyStamp };
  
