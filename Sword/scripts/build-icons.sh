#!/bin/bash

set -e

export ICONS_DIR=fe/icons
export ICONS_OUT_JS=gen/fe/icon-data.js
export ICONS_OUT_SVG=gen/fe/icon-symbols.svg
export ICONS_OUT_SASS=gen/fe/_icon-data.sass

##########################################################################

node Sword/utils/icons/generate.js