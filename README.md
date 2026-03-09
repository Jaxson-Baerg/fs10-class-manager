## 1. install dependencies

    docker
    posgresql-client
    nodejs
    npm

## 2. start database

    $ npm run db:start

## 3. initialize database

    $ psql -U postgres -h localhost -p 5432
    default password: postgres
    postgres=# CREATE ROLE fortysixten LOGIN PASSWORD 'fortysixten';
    postgres=# CREATE DATABASE fortysixten;
    postgres=# ALTER DATABASE fortysixten OWNER TO fortysixten;

## 4. reset or restore database

    $ npm run db:reset
    $ npm run db:restore

## 5. start app

    $ npm run start

Go to http://localhost:3001

