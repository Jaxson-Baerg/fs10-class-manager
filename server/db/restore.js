// load .env data into process.env
require('dotenv').config();

// other dependencies
const chalk = require('chalk');
const { execSync } = require("child_process");

console.log( `-> Connecting to PG using "PGPASSWORD=${process.env.DB_PASS} psql -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} ${process.env.DB_NAME}" ...` );

console.log( `\t-> Running db/init.sql` );
execSync(`PGPASSWORD=${process.env.DB_PASS} psql -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} ${process.env.DB_NAME} < ./db/init.sql`, (error, stdout, stderr) => {
    if (error) {
        console.error(chalk.red(`error: ${error.message}`));
        return;
    }
    if (stderr) {
        console.log(chalk.yellow(`${stderr}`));
        return;
    }
    console.log(`${stdout}`);
});

console.log( `\t-> downloading db dump from fortysix10fitness.ca` );
execSync(`scp baerg@fortysix10fitness.ca:/var/lib/postgresql/fortysixten.sql ./db/dump.sql`, (error, stdout, stderr) => {
    if (error) {
        console.error(chalk.red(`error: ${error.message}`));
        return;
    }
    if (stderr) {
        console.log(chalk.yellow(`${stderr}`));
        return;
    }
    console.log(`${stdout}`);
});

console.log( `\t-> Running db/dump.sql` );
execSync(`PGPASSWORD=${process.env.DB_PASS} psql -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} ${process.env.DB_NAME} < ./db/dump.sql`, (error, stdout, stderr) => {
    if (error) {
        console.error(chalk.red(`error: ${error.message}`));
        return;
    }
    if (stderr) {
        console.log(chalk.yellow(`${stderr}`));
        return;
    }
    console.log(`${stdout}`);
});

console.log( `\t-> Running db/scrub.sql` );
execSync(`PGPASSWORD=${process.env.DB_PASS} psql -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} ${process.env.DB_NAME} < ./db/scrub.sql`, (error, stdout, stderr) => {
    if (error) {
        console.error(chalk.red(`error: ${error.message}`));
        return;
    }
    if (stderr) {
        console.log(chalk.yellow(`${stderr}`));
        return;
    }
    console.log(`${stdout}`);
});
