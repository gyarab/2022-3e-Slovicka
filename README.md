# Slovicka

This file describes requirements of the project, how to configure it
and how to start it.

## Requirements

- nodejs 12.0.0+
- Postgresql 11.0+
- environment for running .sh scripts

## Startup

To start project run `npm run init` in console (in project root folder) and project should be initialized 
and ready to run if you have everything configured in `be/env.js`.

After initialization admin user is created. Credentials:

```json
{
    "email": "admin",
    "password": "qwe"
}
```

## Configuration

You can configure everything in file `be/env.js`. 
Mainly fields `host, port, url, datadir, useProxy, reload_css_onsave`.

## NPM scripts

All of these scripts can be run with `npm run script` and should be run from root folder of the project.

- `start` - Starts server
- `dev` - Starts server with reload on changes and auto-rebuilds parts of frontend
- `build` - Builds whole frontend 
- `build-js` - Builds only frontend js
- `build-styles` - Builds only sass files
- `auto-rebuild` - Auto-rebuilds parts of frontend
- `init` - Removes folder `gen`, creates it again, downloads all node modules, then runs init script which initializes database and then builds project
- `server-reload` - Starts server with reload on changes