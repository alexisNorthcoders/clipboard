let socket = null;
document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("clipboard");
  const fileInput = document.getElementById("file");
  const uploadButton = document.getElementById("uploadFile");
  const pasteButton = document.getElementById("pasteClipboard");
  const copyButton = document.getElementById("copyClipboard");
  const clearButton = document.getElementById("clearClipboard");
  const previewButton = document.getElementById("viewImage");
  const filesListDiv = document.getElementById("filesList");
  const shareButton = document.getElementById("shareImage");
  const loginButton = document.getElementById("loginButton");
  const registerButton = document.getElementById("registerButton");
  const authForms = document.getElementById("authForms");
  const logoutButton = document.getElementById("logoutButton");
  const passwordInput = document.getElementById("loginPassword");
  const toggleLoginPassword = document.getElementById("toggleLoginPassword");
  const toggleRegisterPassword = document.getElementById("toggleRegisterPassword");
  const buttonMessageP = document.getElementById("buttonMessage");

  toggleLoginPassword.addEventListener("click", () => {
    toggle("loginPassword", "showLogin", "hideLogin");
  });
  toggleRegisterPassword.addEventListener("click", () => {
    toggle("registerPassword", "showRegister", "hideRegister");
  });

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
      flashDivBackground(textarea, "gray-100");

      const text = await navigator.clipboard.readText();
      if (!text) {
        showMessage(buttonMessageP, "There is no content on your clipboard");
      } else {
        showMessage(buttonMessageP, "Text pasted from clipboard");
      }
      textarea.value = text;
      socket.emit("clipboard", text);
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
    }
  });
  previewButton.addEventListener("click", async () => {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith("image")) {
          const blob = await item.getType(type);
          displayImage(blob);
        }
      }
    }
  });
  clearButton.addEventListener("click", async () => {
    try {
      showMessage(buttonMessageP, "Clipboard content cleared");
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

      if (!textarea.value) {
        showMessage(buttonMessageP, "There is nothing to copy");
      } else {
        showMessage(buttonMessageP, "Text copied to clipboard");
      }
      console.log("Text copied to clipboard:", textarea.value);
      flashDivBackground(textarea, "gray-100");
    } catch (err) {
      console.error("Failed to copy text to clipboard: ", err);
    }
  });
  document.addEventListener("paste", function (event) {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (const item of items) {
      console.log(item);
      if (item.type.startsWith("image")) {
        const blob = item.getAsFile();
        displayImage(blob);
      }
      if (item.type === "text/plain") {
        item.getAsString((text) => (textarea.value = text));
      }
    }
  });
});
