function flashDivBackground(div, color, duration = 500) {
  div.classList.add("transition", `duration-${duration}`, "ease-in-out", `bg-${color}`, "shake");
  setTimeout(() => {
    div.classList.remove("transition", `duration-${duration}`, "ease-in-out", `bg-${color}`, "shake");
  }, duration);
}
function checkUserLoggedIn() {
  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) {
    logoutButton.style.display = "none";
    authForms.style.display = "flex";
    return false;
  } else {
    return true;
  }
}
function logout(socket) {
  fetch("/logout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
  })
    .then((response) => response.json())
    .then(() => {
      localStorage.removeItem("accessToken");
      const textarea = document.getElementById("clipboard");
      const filesListDiv = document.getElementById("filesList");
      const container = document.getElementById("imageContainer");
      container.innerHTML = "";
      filesListDiv.innerHTML = "";
      textarea.value = "";
      logoutButton.style.display = "none";
      authForms.style.display = "flex";

      socket.disconnect();
    })
    .catch((error) => {
      console.error("Error during logout:", error);
    });
}
async function login() {
  const username = document.getElementById("loginUsername").value;
  const password = document.getElementById("loginPassword").value;

  const response = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (response.ok) {
    console.log("Logged in successfully!");
    const data = await response.json();
    localStorage.setItem("accessToken", data.accessToken);
    authForms.style.display = "none";
    logoutButton.style.display = "flex";
    socket = initiateWebsocketConnection(socket);
    return socket;
  } else {
    console.error("Failed to log in!");
  }
}
function initiateWebsocketConnection(socket) {
  const textarea = document.getElementById("clipboard");
  const filesListDiv = document.getElementById("filesList");
  socket = io();

  socket.on("connect", () => {
    console.log("user connected");
    socket.emit("request_clipboard");
    socket.emit("request_filelist");
  });
  socket.on("clipboard", (data) => {
    if (data) {
      textarea.value = data;
    } else {
      textarea.value = "";
      console.log("No clipboard data available for this session.");
    }
  });

  socket.on("filesUploaded", (files) => {
    filesListDiv.innerHTML = files
      .map(
        (file) => `
          <div class="flex flex-row items-center gap-1">
            <button onclick="downloadFile(' ${file.url}')" class="btn btn-green inline-flex gap-2 w-fit"><img src="./assets/download.svg" class="h-6 w-6 brightness-0 invert" alt="download icon"/><span class="hidden lg:block">Download</span></button>
            <a href="${file.url}" target="_blank" class="text-blue-800 font-bold hover:underline overflow-text">${file.name}</a>
            <span class="overflow-text">${(file.size / 1024).toFixed(2)}KB</span>
            <button onclick="deleteFile(this,'${file.name}')" class="btn btn-red inline-flex gap-2 w-fit"><img src="./assets/delete.svg" class="h-6 w-6 brightness-0 invert" alt="download icon"/><span class="hidden lg:block">Delete</span></button>
          </div>
        `
      )
      .join("");
  });
  return socket;
}
function downloadFile(url) {
  const link = document.createElement("a");
  link.href = url;
  link.download = url.split("/").pop();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
async function deleteFile(button, filename) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch("/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },

    body: JSON.stringify({ filename }),
  });
  if (response.ok) {
    
    const fileDiv = button.parentNode;
    if (fileDiv) {
      fileDiv.remove();
    }
  } else {
    console.log("failed to remove file");
  }
}
function displayImage(blob) {
  const reader = new FileReader();

  reader.onload = function (event) {
    const imageUrl = event.target.result;

    const img = document.createElement("img");
    img.src = imageUrl;

    const container = document.getElementById("imageContainer");
    container.innerHTML = "";
    container.appendChild(img);
  };

  reader.readAsDataURL(blob);
}
function uploadImageFromClipboard() {
  navigator.clipboard
    .read()
    .then((data) => {
      data.forEach((clipboardItem) => {
        clipboardItem.types.forEach((type) => {
          if (type.startsWith("image")) {
            clipboardItem.getType(type).then((blob) => {
              const formData = new FormData();
              formData.append("file", blob, `clipboard_image_${Date.now()}.png`);

              fetch("/upload", {
                method: "POST",
                body: formData,
              })
                .then((response) => {
                  if (response.ok) {
                    console.log("Image uploaded successfully");
                  } else {
                    console.error("Failed to upload image");
                  }
                })
                .catch((error) => {
                  console.error("Error uploading image:", error);
                });
            });
          }
        });
      });
    })
    .catch((error) => {
      console.error("Error reading clipboard data:", error);
    });
}
function toggle(passwordInputId, showElementId, hideElementId) {
  const passwordInput = document.getElementById(passwordInputId);
  const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
  passwordInput.setAttribute("type", type);

  document.getElementById(showElementId).style.display = type === "password" ? "block" : "none";
  document.getElementById(hideElementId).style.display = type === "password" ? "none" : "block";
}
