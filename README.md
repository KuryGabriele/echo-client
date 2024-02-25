[![Build and Release Electron App For Windows](https://github.com/KuryGabriele/echo-project/actions/workflows/build.yml/badge.svg)](https://github.com/KuryGabriele/echo-project/actions/workflows/build.yml)

# Echo project

Discord like application with overkill audio quality

# Dev build

In the electron folder, execute `npm start`. The process will automatically compile the frontend on [http://localhost:3000](http://localhost:3000) and show it in the electron app, opening the RTC debug and WebTools.

# Prod build

Then go to the electron folder and run `npm run dist` to package the built frontend in the electron app with squirrel executable.

# API

To run the API you will need a working MySQL database and to have the correct table.
TBD: add sql file to API folder.

# Server

To run the socket.io server you just need to install dependencies and run the server using `node main.js`