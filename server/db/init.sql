DROP DATABASE IF EXISTS fortysixten;
DROP ROLE IF EXISTS fortysixten;
CREATE ROLE fortysixten LOGIN PASSWORD 'fortysixten';
CREATE DATABASE fortysixten;
ALTER DATABASE fortysixten OWNER TO fortysixten;
