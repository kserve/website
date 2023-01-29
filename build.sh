#!/bin/bash

git config --local user.email "github-actions[bot]@users.noreply.github.com" 
git config --local user.name "github-actions[bot]"
currentVersion=$(cat version.txt)
ls -al

echo "Fetching latest gh-pages"
git branch -D gh-pages

git remote add origin https://github.com/kserve/website.git
git fetch origin

echo "Creating local gh-pages"
git branch gh-pages origin/gh-pages

echo "Listing branches"
git branch

mike deploy --update-aliases $(cat version.txt) latest

git checkout gh-pages
