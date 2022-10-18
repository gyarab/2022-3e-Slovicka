#!/bin/bash

export DATABASE=vocabulary
export USER=$DATABASE
export PASSWORD=$USER

sudo psql -U postgres postgres -c "CREATE USER $USER WITH PASSWORD '$PASSWORD'";
sudo psql -U postgres postgres -c "CREATE DATABASE $DATABASE WITH OWNER $USER";

# shellcheck disable=SC1009
# shellcheck disable=SC2043
for filename in be/sql/*; do
  echo "Printing: $filename"

  if [[ $filename =~ sql$ ]]; then
     echo "Applying: $filename"
     psql -U $USER -h 127.0.0.1 -d $DATABASE -f "$filename"
     echo "$filename"
  fi

done

psql -U $USER -h 127.0.0.1 -d $DATABASE -c "INSERT INTO users (email, password, verified, active, role, name, surname) VALUES('admin', '{\"a\":\"scrypt\",\"o\":{\"N\":16384,\"r\":8,\"p\":1},\"s\":\"5bNluJDmbnyYeTJ8EBgw1Q==\",\"k\":\"/a2hHEFOrOgWViwOxxz9WlZ/D/FW1XsXBtDzbg5ejC8=\"}', true, true, 'ADMIN', 'admin', 'admin');"
