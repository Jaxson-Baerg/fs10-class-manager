#!/bin/bash

echo "NOTE: You may need to run the following command to initialize the db"
echo "  docker run --rm -e POSTGRES_PASSWORD=password -v `pwd`/data:/var/lib/postgresql/data postgres:alpine"
docker run --rm --user "$(id -u):$(id -g)" -v $PWD/data:/var/lib/postgresql/data -p 5432:5432 postgres:alpine
