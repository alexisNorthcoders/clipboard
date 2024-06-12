function flashDivBackground(div, color, duration = 300) {
  div.classList.add("transition", `duration-${duration}`, "ease-in-out", `bg-${color}`);
  setTimeout(() => {
    div.classList.remove(`bg-${color}`);
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
    return socket
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
            <button onclick="downloadFile("${file.url}")" class="gap-2 items-center inline-flex px-4 py-1 bg-green-500 rounded text-white font-bold hover:bg-green-600"><img src="./assets/download.svg" class="h-6 w-6 brightness-0 invert"alt="download icon"><span class="hidden lg:block">Download</span></button>
            <a href="${file.url}" target="_blank" class="text-blue-800 font-bold hover:underline">${file.name}</a>
            <span>Size: ${(file.size / 1024).toFixed(2)} KB</span>
            <span>Created: ${new Date(file.created).toLocaleString()}</span>
            
          </div>
        `
      )
      .join("");
  });
  return socket
}
