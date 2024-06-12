function flashDivBackground(div, color, duration = 300) {
  div.classList.add("transition", `duration-${duration}`, "ease-in-out", `bg-${color}`);
  setTimeout(() => {
    div.classList.remove(`bg-${color}`);
  }, duration);
}
function isUserLoggedIn(socket) {
  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) {
    logoutButton.style.display = "none";
    authForms.style.display = "flex";
  } else {
    socket.on("connect", () => {
      socket.emit("request_clipboard");
    });
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
async function login(socket) {
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
    socket.on("connect", () => {
      socket.emit("request_clipboard");
    });
  } else {
    console.error("Failed to log in!");
  }
}
