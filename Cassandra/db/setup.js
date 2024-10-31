const cassandra = require('cassandra-driver');

const client = new cassandra.Client({
  contactPoints: ['127.0.0.1'],
  localDataCenter: 'datacenter1',
});

async function createKeyspace() {
  const query = `
    CREATE KEYSPACE IF NOT EXISTS librepost
    WITH REPLICATION = { 'class': 'SimpleStrategy', 'replication_factor': 1 };
  `;
  await client.execute(query);
}

async function dropTable() {
  const query = `
    DROP TABLE IF EXISTS librepost.stamps;
  `;
  try {
    await client.execute(query);
    console.log('Tabla "stamps" eliminada (si existía).');
  } catch (err) {
    console.error('Error eliminando la tabla:', err);
  }
}

async function createTable() {
  const query = `
      CREATE TABLE IF NOT EXISTS librepost.stamps (
      stamp_id uuid PRIMARY KEY,
      title text,
      country text,
      year int,
      serie text,
      design text,
      face_value float,
      condition text,
      status text,
      seller text,
      transaction_history list<frozen<list<text>>>,
      tags set<text>,
      time_value map<text, float>
    );
  `;
  await client.execute(query);
  console.log('Tabla "stamps" creada.');
}

/* async function createMaterializedView() {
  const query = `
    CREATE MATERIALIZED VIEW IF NOT EXISTS librepost.stamps_by_condition_year AS
    SELECT stamp_id, title, condition, year, face_value
    FROM librepost.stamps
    WHERE condition IS NOT NULL AND year IS NOT NULL AND face_value IS NOT NULL AND stamp_id IS NOT NULL
    PRIMARY KEY ((condition, year), face_value, stamp_id)
    WITH CLUSTERING ORDER BY (face_value DESC);
  `;
  try {
    await client.execute(query);
    console.log('Vista materializada "stamps_by_condition_year" creada.');
  } catch (err) {
    console.error('Error creando la vista materializada:', err);
  }
} */

  async function createSAIIndex() {
    const query = `
      CREATE CUSTOM INDEX IF NOT EXISTS year_status_sai ON librepost.stamps (year)
      USING 'StorageAttachedIndex';
    `;
    
    const query2 = `
      CREATE CUSTOM INDEX IF NOT EXISTS status_sai ON librepost.stamps (status)
      USING 'StorageAttachedIndex';
    `;
  
    try {
      await client.execute(query);
      await client.execute(query2);
      console.log('Índices SAI "year" y "status" creados.');
    } catch (err) {
      console.error('Error creando los índices SAI:', err);
    }
  }
  

module.exports = { createKeyspace, createTable, dropTable/* , createMaterializedView */, createSAIIndex };
