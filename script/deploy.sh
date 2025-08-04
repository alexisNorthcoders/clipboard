#!/bin/bash

cd /root/Projects/clipboard
git pull origin main
npm install
pm2 restart 6