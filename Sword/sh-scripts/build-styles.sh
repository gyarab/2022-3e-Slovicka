#!/bin/bash

set -e

# If executed as a child process of build script use exported SED_EXEC var
SED_EXEC=${SED_EXEC:-`which gsed 2>/dev/null || which sed`}

##########################################################################

# build css files
node-sass fe/styles/style.sass gen/fe/main.css --source-map gen/fe/main.css.map
$SED_EXEC -i 's#../../fe/##' gen/fe/main.css.map