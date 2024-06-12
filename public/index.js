document.addEventListener("DOMContentLoaded", () => {
  const socket = io('wss://127.0.0.1', { secure: true });
  const textarea = document.getElementById("clipboard");
  const fileInput = document.getElementById("file");
  const uploadButton = document.getElementById("uploadFile");
  const pasteButton = document.getElementById("pasteClipboard");
  const copyButton = document.getElementById("copyClipboard");
  const clearButton = document.getElementById("clearClipboard");
  const filesListDiv = document.getElementById("filesList");
  const shareButton = document.getElementById("shareImage");
  const loginButton = document.getElementById("loginButton");
  const registerButton = document.getElementById("registerButton");
  const authForms = document.getElementById("authForms");
  const logoutButton = document.getElementById("logoutButton");

  const accessToken = localStorage.getItem("accessToken");
  console.log(accessToken);
  if (!accessToken) {
    logoutButton.style.display = "none";
    authForms.style.display = "flex";
  } else {
    

    socket.on("connect", () => {
      socket.emit("request_clipboard");
    });
  }
  logoutButton.addEventListener("click", () => {
    fetch("/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
    })
      .then((response) => response.json())
      .then((data) => {
        localStorage.removeItem("accessToken");
        window.location.reload();
      })
      .catch((error) => {
        console.error("Error during logout:", error);
      });
  });
  loginButton.addEventListener("click", async () => {
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
      window.location.reload();
    } else {
      console.error("Failed to log in!");
    }
  });

  document.getElementById("registerForm").addEventListener("submit",  (e)=> e.preventDefault());
  document.getElementById("loginForm").addEventListener("submit",  (e)=> e.preventDefault());


  registerButton.addEventListener("click", async () => {
    const username = document.getElementById("registerUsername").value;
    const password = document.getElementById("registerPassword").value;

    const response = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      console.log("Registered successfully!");
    } else {
      console.error("Failed to register!");
    }
  });

  shareButton.addEventListener("click", uploadImageFromClipboard);

  textarea.addEventListener("input", () => {
    socket.emit("clipboard", textarea.value);
  });

  uploadButton.addEventListener("click", () => {
    const file = fileInput.files[0];
    if (file) {
      const formData = new FormData();
      formData.append("file", file);

      fetch("/upload", {
        method: "POST",
        body: formData,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          console.log("File uploaded:", data.fileUrl);
        })
        .catch((error) => {
          console.error("Error uploading file:", error);
        });
    } else {
      console.error("No file selected.");
    }
  });

  pasteButton.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      textarea.value = text;
      socket.emit("clipboard", text);
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
    }
  });
  clearButton.addEventListener("click", async () => {
    try {
      const text = "";
      textarea.value = text;
      socket.emit("clipboard", text);
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
    }
  });

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(textarea.value);
      console.log("Text copied to clipboard:", textarea.value);
    } catch (err) {
      console.error("Failed to copy text to clipboard: ", err);
    }
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
          <button onclick="downloadFile('${file.url}')" class="px-4 py-1 bg-green-500 rounded text-white font-bold hover:bg-green-600">Download</button>
          <a href="${file.url}" target="_blank" class="text-blue-800 font-bold hover:underline">${file.name}</a>
          <span>Size: ${(file.size / 1024).toFixed(2)} KB</span>
          <span>Created: ${new Date(file.created).toLocaleString()}</span>
          
        </div>
      `
      )
      .join("");
  });
});
document.addEventListener("paste", function (event) {
  const items = (event.clipboardData || event.originalEvent.clipboardData).items;
  for (const item of items) {
    if (item.type.indexOf("image") !== -1) {
      const blob = item.getAsFile();
      displayImage(blob);
    }
  }
});

function downloadFile(url) {
  const link = document.createElement("a");
  link.href = url;
  link.download = url.split("/").pop();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
