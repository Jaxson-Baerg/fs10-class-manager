## 1. install dependencies

  docker
  posgresql-client
  nodejs
  npm

## 2. create postgres docker container

  $ docker run --rm -e POSTGRES_PASSWORD=password -v `pwd`/data:/var/lib/postgresql/data postgres:alpine

## 3. Fix data directory permissions

  $ sudo chown -R $(id -u).$(id -g) data

## 4. start database

  $ npm run db:start

## 5. initialize database

  $ psql -U postgres -h localhost -p 5432
  postgres=# CREATE ROLE fortysixten LOGIN PASSWORD 'fortysixten';
  postgres=# CREATE DATABASE fortysixten;
  postgres=# ALTER DATABASE fortysixten OWNER TO fortysixten;

## 6. reset or restore database

  $ npm run db:reset
  $ npm run db:restore

## 7. start app

  $ npm run start

Go to http://localhost:3001

