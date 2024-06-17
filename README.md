# clipboard
Clipboard project to easily copy/paste text and files between different devices

![alt text](image-1.png)

Features auto-deployment script with Github webhook.


TODO:
- Functionality (websocket or post request) to remove files 
  - POST /delete - done
  - Tests for endpoint and error handling - done
  - Button to remove files in the client side - done
- Automatically remove files 5 minutes after upload - done
- Styling (better spacing and color theme)
- Animated logo (Clipboard Sync logo)
- Save userList in database instead of a Map
- File encryption
- Improve safety and authentication checks
- Limit uploads folder to a set size
- Edit image before uploading
- Limit storage per user to 100mB