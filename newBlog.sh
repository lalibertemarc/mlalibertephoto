#!/bin/bash
# create-post.sh

if [ -z "$1" ]; then
  echo "Usage: ./create-post.sh post-name"
  exit 1
fi

hugo new content/en/blog/$1.md
hugo new content/fr/blog/$1.md