#!/bin/bash

echo "NOTE: You may need to initialize the database first, see README"
docker run --rm --user "$(id -u):$(id -g)" -v $PWD/data:/var/lib/postgresql/data -p 5432:5432 postgres:alpine
