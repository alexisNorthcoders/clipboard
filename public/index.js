let socket = null;
document.addEventListener("DOMContentLoaded", () => {
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

  let isUserLoggedIn = checkUserLoggedIn();

  if (isUserLoggedIn) {
    socket = initiateWebsocketConnection(socket);
  }

  loginButton.addEventListener("click", () => login(socket).then((updatedSocket) => (socket = updatedSocket)));
  logoutButton.addEventListener("click", () => logout(socket));

  document.getElementById("registerForm").addEventListener("submit", (e) => e.preventDefault());
  document.getElementById("loginForm").addEventListener("submit", (e) => e.preventDefault());

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
    if (socket) {
      socket.emit("clipboard", textarea.value);
    } else {
      console.log("Not connected.");
    }
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
      flashDivBackground(textarea, "green-100");
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
      flashDivBackground(textarea, "red-100");
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
      flashDivBackground(textarea, "blue-100");
    } catch (err) {
      console.error("Failed to copy text to clipboard: ", err);
    }
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
