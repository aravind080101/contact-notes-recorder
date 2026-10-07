(() => {
  "use strict";

  const key = "moolya-contact-user-session-v2";
  sessionStorage.removeItem("moolya-contact-session");

  let token = sessionStorage.getItem(key) || "";
  let generation = 0;

  const app = document.querySelector("main.shell");
  const get = id => document.getElementById(id);
  const panel = document.createElement("section");

  panel.className = "login-panel";
  panel.innerHTML = `
    <h1 id="authHeading">Welcome back</h1>
    <p id="authDescription">Sign in to your personal Contact Notes account.</p>

    <form id="loginForm">
      <label for="loginUsername">Username</label>
      <input id="loginUsername" autocomplete="username"
        required maxlength="40" autocapitalize="none" spellcheck="false">

      <label for="loginPassword">Password</label>
      <input id="loginPassword" type="password"
        autocomplete="current-password" required maxlength="256">

      <button type="submit" class="primary">Sign in</button>
    </form>

    <button id="forgotPassword" type="button">Forgot password?</button>

    <form id="forgotForm" hidden>
      <label for="resetEmail">Your registered email</label>
      <input id="resetEmail" type="email" autocomplete="email"
        required maxlength="254">
      <button type="submit" class="primary">Get reset help</button>
    </form>

    <form id="registerForm" hidden>
      <label for="inviteEmail">Email</label>
      <input id="inviteEmail" type="email" readonly>

      <label for="registerUsername">Choose a username</label>
      <input id="registerUsername" autocomplete="username"
        autocapitalize="none" spellcheck="false" required
        minlength="3" maxlength="40" pattern="[A-Za-z0-9_.-]{3,40}">

      <p class="auth-hint">
        Use 3–40 letters, numbers, dots, dashes or underscores.
      </p>

      <label for="registerPassword">Choose a password</label>
      <input id="registerPassword" type="password"
        autocomplete="new-password" required minlength="12" maxlength="256">

      <label for="registerConfirm">Confirm password</label>
      <input id="registerConfirm" type="password"
        autocomplete="new-password" required minlength="12" maxlength="256">

      <p class="auth-hint">Use at least 12 characters.</p>
      <button type="submit" class="primary"
        id="registerSubmit" disabled>Create account</button>
    </form>

    <form id="resetForm" hidden>
      <label for="newPassword">New password</label>
      <input id="newPassword" type="password" minlength="12"
        maxlength="256" autocomplete="new-password" required>

      <label for="confirmPassword">Confirm password</label>
      <input id="confirmPassword" type="password" minlength="12"
        maxlength="256" autocomplete="new-password" required>

      <button type="submit" class="primary">Change password</button>
    </form>

    <button id="backToLogin" type="button" hidden>Back to sign in</button>
    <p id="authStatus" role="status" aria-live="polite"></p>
  `;

  app.before(panel);
  app.hidden = true;

  const logout = document.createElement("button");
  logout.type = "button";
  logout.textContent = "Sign out";
  logout.hidden = true;
  logout.id = "logoutButton";

  const inviteButton = document.createElement("button");
  inviteButton.type = "button";
  inviteButton.textContent = "Manage users";
  inviteButton.hidden = true;
  inviteButton.id = "inviteButton";

  const themeButton = document.querySelector(".theme-toggle");
  let headerActions = document.querySelector(".header-actions");

  if (!headerActions) {
    headerActions = document.createElement("div");
    headerActions.className = "header-actions";
  }

  if (themeButton) {
    if (!headerActions.isConnected) themeButton.before(headerActions);
    headerActions.append(themeButton);
  } else if (!headerActions.isConnected) {
    document.querySelector(".topbar-inner")?.append(headerActions);
  }

  headerActions.append(inviteButton, logout);

  const admin = document.createElement("section");
  admin.id = "userAdminPanel";
  admin.className = "login-panel";
  admin.hidden = true;

  admin.innerHTML = `
    <h2>Manage users</h2>
    <p>Create a private invitation link for each new user.</p>

    <form id="inviteForm">
      <label for="newUserEmail">Person’s email</label>
      <input id="newUserEmail" type="email" autocomplete="off"
        required maxlength="254">
      <button type="submit" class="primary">Create invitation link</button>
    </form>

    <div id="inviteResult" hidden>
      <label for="inviteLink">Registration link</label>
      <input id="inviteLink" readonly>
      <button id="copyInvite" type="button">Copy link</button>
      <p class="auth-hint">
        This private link creates one account. It has no automatic expiry.
      </p>
    </div>

    <p id="adminStatus" role="status" aria-live="polite"></p>
    <div id="userList"></div>
  `;

  app.before(admin);

  const style = document.createElement("style");
  style.textContent = `
    [hidden]{display:none!important}
    .login-panel{
      width:calc(100% - 32px);
      max-width:480px;
      margin:24px auto;
      padding:28px;
      background:var(--panel,#fff);
      color:var(--ink,#162b35);
      border:1px solid var(--line,#dce6ea);
      border-radius:24px;
      box-sizing:border-box
    }
    .login-panel h1{font-size:26px;line-height:1.2}
    .login-panel h2{font-size:22px}
    .login-panel p{line-height:1.6}
    .login-panel button{margin-top:16px;min-height:44px}
    .login-panel input{min-width:0;width:100%;box-sizing:border-box}
    .login-panel .auth-hint{
      font-size:12px;color:var(--muted,#667);margin:8px 0
    }
    .topbar-inner{flex-wrap:wrap}
    .brand{margin-right:auto}
    .header-actions{
      display:flex;align-items:center;justify-content:flex-end;
      gap:8px;flex-wrap:wrap
    }
    .header-actions button{
      margin:0;min-height:44px;padding:9px 13px;
      border:1px solid var(--line);border-radius:24px;
      font-size:13px;white-space:nowrap;
      background:var(--soft);color:var(--ink)
    }
    #userAdminPanel{max-width:760px}
    #userList article{
      padding:16px 0;border-top:1px solid var(--line,#ddd);
      overflow-wrap:anywhere
    }
    #userList strong{display:block}
    #userList small{display:block;font-size:12px;line-height:1.6}
    #authStatus,#adminStatus{overflow-wrap:anywhere}
    @media(max-width:520px){
      .header-actions{width:100%}
      .header-actions button{font-size:12px;padding:9px 12px}
      .login-panel{padding:22px;margin:16px auto}
    }
  `;
  document.head.append(style);

  const message = text => {
    get("authStatus").textContent = text;
  };

  const adminMessage = text => {
    get("adminStatus").textContent = text;
  };

  const params = new URLSearchParams(location.hash.slice(1));
  let resetToken = params.get("reset");
  let inviteToken = params.get("invite");

  if (resetToken || inviteToken) {
    history.replaceState(null, "", location.pathname + location.search);
  }

  function mode(view) {
    for (const name of ["login", "forgot", "register", "reset"]) {
      get(name + "Form").hidden = name !== view;
    }

    get("forgotPassword").hidden = view !== "login";
    get("backToLogin").hidden = view === "login";

    get("authHeading").textContent = {
      login: "Welcome back",
      forgot: "Reset your password",
      register: "Create your account",
      reset: "Choose a new password"
    }[view];

    get("authDescription").textContent =
      view === "register"
        ? "Your contacts will be private to your account."
        : view === "forgot"
          ? "Ask your administrator for a private password-reset link."
          : view === "reset"
            ? "Use at least 12 characters for your new password."
            : "Sign in to your personal Contact Notes account.";

    message("");
  }

  function clear() {
    generation++;
    token = "";
    sessionStorage.removeItem(key);
    window.contactUser = null;

    app.hidden = true;
    panel.hidden = false;
    logout.hidden = true;
    inviteButton.hidden = true;
    admin.hidden = true;

    get("inviteLink").value = "";
    get("inviteResult").hidden = true;
    get("userList").replaceChildren();

    window.dispatchEvent(new Event("contact-auth-cleared"));
  }

  window.contactApi = async (action, ...args) => {
    const endpoint = window.CONTACT_CONFIG?.apiUrl;

    if (!endpoint || endpoint.includes("YOUR-WORKER")) {
      throw Error("The app connection is not configured.");
    }

    const current = generation;

    const response = await fetch(endpoint, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(token ? {Authorization: "Bearer " + token} : {})
      },
      body: JSON.stringify({action, args})
    });

    let result;

    try {
      result = await response.json();
    } catch {
      throw Error("Could not connect. Please try again.");
    }

    if (current !== generation) {
      throw Error("Session changed. Please sign in again.");
    }

    if (response.status === 401 && result.code === "AUTH_REQUIRED") {
      clear();
      message(result.error);
    }

    if (!response.ok || !result.ok) {
      throw Error(result.error || "Request failed.");
    }

    return result.data;
  };

  function openApp(user) {
    window.contactUser = user;
    panel.hidden = true;
    app.hidden = false;
    logout.hidden = false;
    inviteButton.hidden = user.role !== "admin";
    window.dispatchEvent(new Event("contact-auth-ready"));
  }

  function busy(form, value) {
    form.querySelectorAll("button,input:not([readonly])").forEach(el => {
      el.disabled = value;
    });
  }

  get("loginForm").onsubmit = async event => {
    event.preventDefault();

    const form = event.currentTarget;
    busy(form, true);
    message("Signing in…");

    try {
      const user = await window.contactApi("login", {
        username: get("loginUsername").value.trim(),
        password: get("loginPassword").value
      });

      clear();
      token = user.token;
      sessionStorage.setItem(key, token);
      get("loginPassword").value = "";
      message("");
      openApp(user);
    } catch (error) {
      message(error.message);
    } finally {
      busy(form, false);
    }
  };

  get("forgotPassword").onclick = () => {
    mode("forgot");
    get("resetEmail").focus();
  };

  get("backToLogin").onclick = () => {
    resetToken = null;
    inviteToken = null;
    mode("login");
  };

  get("forgotForm").onsubmit = async event => {
    event.preventDefault();

    const form = event.currentTarget;
    busy(form, true);
    message("Requesting reset…");

    try {
      const result = await window.contactApi("forgotPassword", {
        email: get("resetEmail").value
      });
      message(result.message);
    } catch (error) {
      message(error.message);
    } finally {
      busy(form, false);
    }
  };

  get("registerForm").onsubmit = async event => {
    event.preventDefault();

    if (get("registerPassword").value !== get("registerConfirm").value) {
      message("Passwords do not match.");
      return;
    }

    const form = event.currentTarget;
    busy(form, true);
    message("Creating account…");

    try {
      const result = await window.contactApi("register", {
        token: inviteToken,
        username: get("registerUsername").value,
        password: get("registerPassword").value
      });

      inviteToken = null;
      form.reset();
      mode("login");
      get("loginUsername").value = result.username;
      message(result.message);
    } catch (error) {
      message(error.message);
    } finally {
      busy(form, false);
    }
  };

  get("resetForm").onsubmit = async event => {
    event.preventDefault();

    if (get("newPassword").value !== get("confirmPassword").value) {
      message("Passwords do not match.");
      return;
    }

    const form = event.currentTarget;
    busy(form, true);
    message("Changing password…");

    try {
      const result = await window.contactApi("resetPassword", {
        token: resetToken,
        password: get("newPassword").value
      });

      clear();
      resetToken = null;
      form.reset();
      mode("login");
      message(result.message);
    } catch (error) {
      message(error.message);
    } finally {
      busy(form, false);
    }
  };

  logout.onclick = () => {
    const pending = window.contactApi("logout");
    clear();
    mode("login");
    pending.catch(() => {});
  };

  async function loadUsers() {
    const users = await window.contactApi("listUsers");
    const list = get("userList");
    list.replaceChildren();

    for (const user of users) {
      const card = document.createElement("article");

      const title = document.createElement("strong");
      title.textContent =
        user.username + (user.disabled ? " · Access disabled" : "");

      const details = document.createElement("small");
      details.textContent = user.email + " · " + user.role;

      const id = document.createElement("small");
      id.textContent = "Owner User ID: " + user.id;

      card.append(title, details, id);

      if (user.role !== "admin") {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = user.disabled ? "Restore access" : "Disable access";

        button.onclick = async () => {
          button.disabled = true;

          try {
            await window.contactApi("disableUser", {
              id: user.id,
              disabled: !user.disabled
            });
            await loadUsers();
          } catch (error) {
            adminMessage(error.message);
            button.disabled = false;
          }
        };

        const reset = document.createElement("button");
        reset.type = "button";
        reset.textContent = "Reset password";
        reset.disabled = !!user.disabled;

        const link = document.createElement("input");
        link.readOnly = true;
        link.hidden = true;
        link.setAttribute("aria-label", "Private password-reset link");

        const copy = document.createElement("button");
        copy.type = "button";
        copy.textContent = "Copy reset link";
        copy.hidden = true;

        reset.onclick = async () => {
          reset.disabled = true;

          try {
            const result = await window.contactApi("createPasswordReset", {
              id: user.id
            });

            link.value = result.link;
            link.hidden = false;
            copy.hidden = false;

            adminMessage(
              "Share this link privately with " +
              user.username +
              ". It expires in 15 minutes."
            );
          } catch (error) {
            adminMessage(error.message);
          } finally {
            reset.disabled = !!user.disabled;
          }
        };

        copy.onclick = async () => {
          try {
            await navigator.clipboard.writeText(link.value);
            adminMessage("Reset link copied.");
          } catch {
            link.focus();
            link.select();
            adminMessage("Select and copy the reset link.");
          }
        };

        card.append(button, reset, link, copy);
      }

      list.append(card);
    }
  }

  inviteButton.onclick = async () => {
    admin.hidden = !admin.hidden;

    if (!admin.hidden) {
      adminMessage("");

      try {
        await loadUsers();
      } catch (error) {
        adminMessage(error.message);
      }
    }
  };

  get("inviteForm").onsubmit = async event => {
    event.preventDefault();

    const form = event.currentTarget;
    busy(form, true);
    adminMessage("Creating invitation link…");
    get("inviteResult").hidden = true;

    try {
      const result = await window.contactApi("createInvitation", {
        email: get("newUserEmail").value
      });

      get("inviteLink").value = result.link;
      get("inviteResult").hidden = false;

      adminMessage(
        "Share this private link with " +
        result.email +
        " to create their account."
      );
    } catch (error) {
      adminMessage(error.message);
    } finally {
      busy(form, false);
    }
  };

  get("copyInvite").onclick = async () => {
    try {
      await navigator.clipboard.writeText(get("inviteLink").value);
      adminMessage("Link copied.");
    } catch {
      get("inviteLink").focus();
      get("inviteLink").select();
      adminMessage("Select and copy the registration link.");
    }
  };

  if (inviteToken || resetToken) {
    clear();

    if (resetToken) {
      mode("reset");
    } else {
      mode("register");
      message("Checking invitation…");

      window.contactApi("invitation", {token: inviteToken})
        .then(result => {
          get("inviteEmail").value = result.email;
          get("registerSubmit").disabled = false;
          message("");
        })
        .catch(error => message(error.message));
    }
  } else if (token) {
    window.contactApi("session")
      .then(openApp)
      .catch(error => {
        clear();
        message(error.message);
      });
  }
})();
