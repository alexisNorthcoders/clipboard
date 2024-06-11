#!/bin/bash

cd /home/alexis/Projects/clipboard
git pull origin main
npm install
pm2 restart 5