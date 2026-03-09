require('dotenv').config();
const { spawn } = require('child_process');

const args = [
  '-h', process.env.DB_HOST,
  '-p', process.env.DB_PORT,
  '-U', process.env.DB_USER,
  process.env.DB_NAME
];

const env = { ...process.env, PGPASSWORD: process.env.DB_PASS };

const psql = spawn('psql', args, {
  stdio: ['inherit', 'inherit', 'inherit'],
  env
});

psql.on('exit', (code, signal) => {
  if (signal) console.log(`psql killed by signal ${signal}`);
  else console.log(`psql exited with code ${code}`);
});
