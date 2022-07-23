#!/bin/bash
source /root/.bashrc
chmod -R 777 /var/www/forecaster-export-api
cd /var/www/forecaster-export-api
npm install -g forever
forever start ./index.js --env $(cat /etc/forecaster_env)
