#!/bin/bash

git config --local user.email "github-actions[bot]@users.noreply.github.com" 
git config --local user.name "github-actions[bot]" 
mike deploy $(cat version.txt)
git checkout gh-pages
ls -al .