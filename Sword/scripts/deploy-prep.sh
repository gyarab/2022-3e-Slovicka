#!/bin/bash

set -x -e

BRANCH=`git branch --show-current`
test -n "$1" && BRANCH=$1

TMP=`mktemp -d`
CWD=`pwd`

git clone -b $BRANCH . "$TMP/src"

pushd "$TMP/src"
npm i
./Sword/scripts/build.sh
VERSION=`git describe --always`
DATE=`date +%F-%H%M`
echo "$BRANCH-$DATE-$VERSION" > version
popd

mkdir -p Archive
tar czv -f Archive/$BRANCH-$DATE-$VERSION.tar.gz \
	-C "$TMP"/src \
	--exclude db/config \
	be fe gen Sword version node_modules package.json

ln -snf $BRANCH-$DATE-$VERSION.tar.gz Archive/$BRANCH-latest.tar.gz
