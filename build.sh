#!/bin/bash

git config --local user.email "github-actions[bot]@users.noreply.github.com" 
git config --local user.name "github-actions[bot]"
currentVersion=$(cat version.txt)
ls -al
echo "Fetching latest gh-pages"
git fetch origin gh-pages --depth=1
mike deploy $currentVersion

echo "Checking out gh pages"
git checkout gh-pages

ls -al
# mv $currentVersion "${currentVersion}-tmp"
# git clone -b gh-pages https://github.com/kserve/website.git
# ls -al
# mv "${currentVersion}-tmp" $currentVersion