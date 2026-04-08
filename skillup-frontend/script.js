const API_BASE = "http://localhost:3000/api";

function getToken() {
  return localStorage.getItem("token");
}

function setStatus(elementId, message, type = "info") {
  const element = document.getElementById(elementId);

  if (!element) {
    return;
  }

  element.textContent = message || "";
  element.className = `status-message status-${type}`;
}

function setLoading(buttonId, isLoading, loadingText) {
  const button = document.getElementById(buttonId);

  if (!button) {
    return;
  }

  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent;
  }

  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : button.dataset.defaultText;
}

function renderOutput(data) {
  const output = document.getElementById("output");

  if (output) {
    output.textContent = JSON.stringify(data, null, 2);
  }
}

function redirectToLogin() {
  window.location.href = "index.html";
}

async function apiRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };

  if (!headers.Authorization && getToken()) {
    headers.Authorization = getToken();
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  let data = {};

  try {
    data = await response.json();
  } catch (error) {
    data = { message: "Server returned an unexpected response." };
  }

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }

  return data;
}

async function signup() {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!name || !email || !password) {
    setStatus("message", "Please fill in every field.", "error");
    return;
  }

  setLoading("signup-button", true, "Creating account...");
  setStatus("message", "", "info");

  try {
    const data = await apiRequest("/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    });

    setStatus("message", data.message || "Signup successful. You can log in now.", "success");
    document.getElementById("signup-form").reset();
  } catch (error) {
    setStatus("message", error.message, "error");
  } finally {
    setLoading("signup-button", false);
  }
}

async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    setStatus("message", "Enter your email and password.", "error");
    return;
  }

  setLoading("login-button", true, "Signing in...");
  setStatus("message", "", "info");

  try {
    const data = await apiRequest("/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    if (!data.token) {
      throw new Error(data.message || "Login failed.");
    }

    localStorage.setItem("token", data.token);
    window.location.href = "dashboard.html";
  } catch (error) {
    setStatus("message", error.message, "error");
  } finally {
    setLoading("login-button", false);
  }
}

async function loadProtectedData(path, loadingMessage, buttonId) {
  setStatus("dashboard-message", loadingMessage, "info");
  setLoading(buttonId, true, loadingMessage);

  try {
    const data = await apiRequest(path, {
      headers: {
        Authorization: getToken()
      }
    });

    renderOutput(data);
    setStatus("dashboard-message", "Request completed successfully.", "success");
  } catch (error) {
    renderOutput({ error: error.message });
    setStatus("dashboard-message", error.message, "error");

    if (error.message.toLowerCase().includes("token") || error.message.toLowerCase().includes("unauthorized")) {
      localStorage.removeItem("token");
      setTimeout(redirectToLogin, 800);
    }
  } finally {
    setLoading(buttonId, false);
  }
}

async function getProfile() {
  await loadProtectedData("/profile", "Loading profile...", "profile-button");
}

async function getUsers() {
  await loadProtectedData("/users", "Loading users...", "users-button");
}

async function getMatches() {
  await loadProtectedData("/match", "Loading matches...", "matches-button");
}

async function updateSkills() {
  const token = getToken();
  const skillsInput = document.getElementById("skills").value;
  const skills = skillsInput
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

  if (!token) {
    setStatus("dashboard-message", "Please log in again.", "error");
    redirectToLogin();
    return;
  }

  if (skills.length === 0) {
    setStatus("dashboard-message", "Add at least one skill before updating.", "error");
    return;
  }

  setLoading("skills-button", true, "Saving...");
  setStatus("dashboard-message", "", "info");

  try {
    const data = await apiRequest("/profile", {
      method: "PUT",
      headers: {
        Authorization: token
      },
      body: JSON.stringify({ skills })
    });

    renderOutput(data);
    setStatus("dashboard-message", "Skills updated successfully.", "success");
    document.getElementById("skills").value = skills.join(", ");
  } catch (error) {
    renderOutput({ error: error.message });
    setStatus("dashboard-message", error.message, "error");
  } finally {
    setLoading("skills-button", false);
  }
}

function logout() {
  localStorage.removeItem("token");
  redirectToLogin();
}

function protectDashboard() {
  if (!document.getElementById("output")) {
    return;
  }

  if (!getToken()) {
    redirectToLogin();
    return;
  }

  setStatus("dashboard-message", "Ready. Choose an action to load data.", "info");
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const skillsForm = document.getElementById("skills-form");
  const profileButton = document.getElementById("profile-button");
  const usersButton = document.getElementById("users-button");
  const matchesButton = document.getElementById("matches-button");
  const logoutButton = document.getElementById("logout-button");

  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      login();
    });
  }

  if (signupForm) {
    signupForm.addEventListener("submit", (event) => {
      event.preventDefault();
      signup();
    });
  }

  if (skillsForm) {
    skillsForm.addEventListener("submit", (event) => {
      event.preventDefault();
      updateSkills();
    });
  }

  if (profileButton) {
    profileButton.addEventListener("click", getProfile);
  }

  if (usersButton) {
    usersButton.addEventListener("click", getUsers);
  }

  if (matchesButton) {
    matchesButton.addEventListener("click", getMatches);
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }

  protectDashboard();
});
