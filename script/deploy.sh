#!/bin/bash

cd /home/alexis/Projects/clipboard
git pull origin main
pm2 restart 5
