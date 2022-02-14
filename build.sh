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

# ls -al

# tmp=$(date +%s)
# tmp_branch="gh-page-${tmp}"

mike deploy $currentVersion

# mv $currentVersion "/tmp/${currentVersion}"

git checkout gh-pages

ls -al
# 
# git clone -b gh-pages https://github.com/kserve/website.git
# ls -al
# mv "${currentVersion}-tmp" $currentVersion