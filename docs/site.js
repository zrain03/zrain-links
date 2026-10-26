"use strict";
(() => {
  const buttons = [...document.querySelectorAll(".tab-button")];
  const method = document.getElementById("request-method");
  const path = document.getElementById("request-path");
  const fields = document.getElementById("demo-fields");
  const emailInput = document.getElementById("demo-email");
  const passwordInput = document.getElementById("demo-password");
  const fieldNote = document.getElementById("demo-field-note");
  const responseBody = document.getElementById("response-body");
  const status = document.getElementById("http-status");
  const hint = document.getElementById("response-hint");
  const sessionDot = document.getElementById("session-dot");
  const sessionLabel = document.getElementById("session-label");
  const execute = document.getElementById("execute-demo");
  const reset = document.getElementById("reset-demo");
  const copy = document.getElementById("copy-response");
  const stepCount = document.getElementById("step-count");
  const stepTitle = document.getElementById("step-title");
  const stepDescription = document.getElementById("step-description");
  const endpointExplainer = document.getElementById("endpoint-explainer");
  const resultTitle = document.getElementById("result-title");
  const resultDescription = document.getElementById("result-description");
  const resultSymbol = document.getElementById("result-symbol");
  const nextWrap = document.getElementById("next-step-wrap");
  const nextButton = document.getElementById("next-step");
  const steps = ["register", "login", "me", "admin"];
  const guidance = {
    register: ["Create a practice account", "The email and password are already examples. Press the button below to create a pretend account.", "Create demo account", "POST means send account details to the server."],
    login: ["Sign in to the practice account", "Use the same sample details. The demo will show a pretend JWT — a digital pass used by real backends.", "Sign in with demo account", "POST means send sign-in details to the server."],
    me: ["Open your private profile", "This page needs you to be signed in. A real server checks your JWT first.", "View demo profile", "GET means ask the server for information."],
    admin: ["Try opening an admin-only page", "You are signed in as a regular USER, not an ADMIN. See why permission checks matter.", "Try admin page", "GET means ask the server for information."]
  };
  const results = {
    "200": ["It worked!", "Your request was allowed. For login, the pretend token represents a short-lived digital pass.", "✓"],
    "201": ["Practice account created!", "You have a pretend USER account. Continue to sign in with the same example details.", "✓"],
    "400": ["Let's check the example details", "Use an example email like demo@example.com. The practice password is already filled in.", "!"],
    "401": ["You need to sign in first", "This action requires an account session, or the login details did not match.", "i"],
    "403": ["You're signed in, but not an admin", "This is the expected result: a regular USER cannot open an ADMIN-only page.", "✓"],
    "409": ["That practice account already exists", "You can sign in with it now. The demo prevents registering the same email twice.", "i"]
  };

  const endpoints = {
    register: { method: "POST", path: "/api/v1/auth/register" },
    login: { method: "POST", path: "/api/v1/auth/login" },
    me: { method: "GET", path: "/api/v1/users/me" },
    admin: { method: "GET", path: "/api/v1/demo/admin" }
  };

  let mode = "register";
  let demoUser = null;
  let authenticated = false;
  let lastJson = "";

  function setResponse(code, payload, message) {
    lastJson = JSON.stringify(payload, null, 2);
    responseBody.textContent = lastJson;
    status.textContent = code;
    status.className = "status-pill " + (code.startsWith("2") ? "success" : code === "READY" ? "neutral" : "client-error");
    hint.textContent = message;
    const explanation = results[code];
    resultTitle.textContent = explanation ? explanation[0] : "Ready when you are";
    resultDescription.textContent = explanation ? explanation[1] : "Follow the highlighted step and click the button to see what happens.";
    resultSymbol.textContent = explanation ? explanation[2] : "?";
    resultSymbol.classList.toggle("result-positive", code.startsWith("2") || code === "403");
    const advance = (mode === "register" && code === "201") || (mode === "login" && code === "200") || (mode === "me" && code === "200");
    nextWrap.hidden = !advance;
    if (advance) nextButton.textContent = "Next: " + ({register:"Sign in",login:"View profile",me:"Try admin access"})[mode] + " →";
  }

  function updateSession() {
    sessionDot.classList.toggle("online", authenticated);
    sessionLabel.textContent = authenticated ? "Demo session active · USER role" : demoUser ? "Demo user registered · not signed in" : "No demo session";
  }

  function setMode(next) {
    mode = next;
    buttons.forEach(button => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      if (active) fields.setAttribute("aria-labelledby", button.id);
    });
    method.textContent = endpoints[mode].method;
    path.textContent = endpoints[mode].path;
    fields.hidden = mode === "me" || mode === "admin";
    const [title, description, action, endpoint] = guidance[mode];
    stepCount.textContent = "STEP " + (steps.indexOf(mode) + 1) + " OF 4";
    stepTitle.textContent = title;
    stepDescription.textContent = description;
    execute.firstChild.textContent = action + " ";
    endpointExplainer.textContent = "Technical view: " + endpoint;
    document.querySelectorAll(".learning-steps li").forEach((li, i) => {
      li.classList.toggle("step-current", i === steps.indexOf(mode));
      li.classList.toggle("step-complete", i < steps.indexOf(mode));
    });
    fieldNote.textContent = "Preset practice password only. Never enter a real password.";
    setResponse("READY", { endpoint: endpoints[mode].path, instruction: "Run the browser-only simulation." }, "No network requests will be made.");
  }

  function run() {
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const invalid = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password !== "DemoPassword123!";

    switch (mode) {
      case "register":
        if (invalid) {
          setResponse("400", { status: 400, code: "VALIDATION_ERROR", message: "Use a fictional email and the preset demo password: DemoPassword123!." }, "The browser demo uses one fixed sample password; it never stores credentials.");
          return;
        }
        if (demoUser && demoUser.email === email) {
          setResponse("409", { status: 409, code: "EMAIL_ALREADY_REGISTERED", message: "This demo user already exists." }, "Duplicate email is rejected.");
          return;
        }
        demoUser = { email };
        authenticated = false;
        updateSession();
        setResponse("201", { id: "demo-user-0001", email, role: "USER" }, "Simulated registration. No password stored.");
        return;
      case "login":
        if (!demoUser || demoUser.email !== email || password !== "DemoPassword123!") {
          setResponse("401", { status: 401, code: "INVALID_CREDENTIALS", message: "Incorrect demo email or demo password." }, "Register with the default sample password, then login.");
          return;
        }
        authenticated = true;
        updateSession();
        setResponse("200", { accessToken: "SIMULATED.NOT_A_REAL_JWT.NOT_SIGNED", tokenType: "Bearer", expiresIn: 900 }, "Illustrative placeholder only — not signed, valid, or usable on an API.");
        return;
      case "me":
        if (!authenticated) {
          setResponse("401", { status: 401, code: "UNAUTHORIZED", message: "Authentication required." }, "Login in the demo first.");
          return;
        }
        setResponse("200", { id: "demo-user-0001", email: demoUser.email, role: "USER" }, "The simulated user has permission to view their profile.");
        return;
      case "admin":
        if (!authenticated) {
          setResponse("401", { status: 401, code: "UNAUTHORIZED", message: "Authentication required." }, "An authenticated session is required.");
          return;
        }
        setResponse("403", { status: 403, code: "FORBIDDEN", message: "Insufficient permissions." }, "The simulated USER role cannot access ADMIN.");
        return;
    }
  }

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
    button.addEventListener("keydown", event => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const next = buttons[(index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length];
      next.focus();
      setMode(next.dataset.mode);
    });
  });
  execute.addEventListener("click", run);
  nextButton.addEventListener("click", () => setMode(steps[steps.indexOf(mode) + 1]));
  reset.addEventListener("click", () => {
    demoUser = null;
    authenticated = false;
    emailInput.value = "demo@example.com";
    passwordInput.value = "DemoPassword123!";
    updateSession();
    setMode("register");
  });
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(lastJson);
      copy.textContent = "Copied!";
    } catch {
      copy.textContent = "Copy unavailable";
    }
    copy.disabled = true;
    window.setTimeout(() => {
      copy.textContent = "Copy JSON";
      copy.disabled = false;
    }, 1500);
  });
  setMode("register");
  updateSession();
})();
