#!/bin/bash

set -e

export AUTHOR="Oren Holiš"
export SED_EXEC=`which gsed 2>/dev/null || which sed`

##########################################################################

rm -rf gen/{fe,be}
mkdir -p gen/{fe,be}

./Sword/scripts/build-icons.sh
./Sword/scripts/build-js.sh
./Sword/scripts/build-styles.sh