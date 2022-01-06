#!/bin/bash

git config --local user.email "github-actions[bot]@users.noreply.github.com" 
git config --local user.name "github-actions[bot]"
currentVersion=$(cat version.txt)
mike deploy $currentVersion
ls -al
echo "Checking out gh-pages"
git checkout gh-pages
mv $currentVersion "${currentVersion}-tmp"
git clone -b gh-pages https://github.com/kserve/website.git
ls -al
mv "${currentVersion}-tmp" $currentVersion