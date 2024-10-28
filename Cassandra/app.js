const cassandra = require('cassandra-driver');

const client = new cassandra.Client({
  contactPoints: ['127.0.0.1'],  
  localDataCenter: 'datacenter1',
  keyspace: 'librepost'  // Ya asumiendo que el keyspace está creado
});

async function createKeyspace() {
  const query = `
    CREATE KEYSPACE IF NOT EXISTS librepost
    WITH REPLICATION = { 'class': 'SimpleStrategy', 'replication_factor': 1 };
  `;
  try {
    await client.execute(query);
    console.log('Keyspace "librepost" creado o ya existía.');
  } catch (err) {
    console.error('Error creando el keyspace:', err);
  }
}

async function start() {
  try {
    await client.connect();
    console.log('Conectado a Cassandra');
    
    await createKeyspace();
    
  } catch (err) {
    console.error('Error conectando a Cassandra:', err);
  } finally {
    // Siempre cerrar la conexión al final
    await disconnect();
  }
}

async function disconnect() {
  try {
    await client.shutdown();
    console.log('Desconectado de Cassandra');
  } catch (err) {
    console.error('Error al desconectar de Cassandra:', err);
  }
}

start();
