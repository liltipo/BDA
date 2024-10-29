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
      transaction_history list<frozen<tuple<timestamp, text>>>,
      tags set<text>,
      time_value map<timestamp, float>
    );
  `;
  await client.execute(query);
}

module.exports = { createKeyspace, createTable };
