#!/bin/bash

docker run --rm \
  -e POSTGRES_PASSWORD=postgres \
  -v "$PWD/data:/var/lib/postgresql/data" \
  -p 5432:5432 \
  postgres:alpine
