/* Face ID / fingerprint sign-in (passkeys) for Contact Notes.
   Loaded by index.html before auth.js; auth.js shows the button on the
   sign-in form and offers to turn it on after a password sign-in.
   Talks to the same worker as the rest of the app (config.js apiUrl). */
(function () {
  'use strict';

  const b64u = buf => {
    const b = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const unb64u = s => {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return Uint8Array.from(atob(s), c => c.charCodeAt(0));
  };
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
    del: k => { try { localStorage.removeItem(k); } catch {} }
  };
  const REMEMBER_KEY = 'passkey:user';
  // Set when someone taps the Face ID button on a device that has no saved
  // passkey yet: their next password sign-in turns Face ID on straight away.
  let setupRequested = false;
  const DISMISS_KEY = 'passkey:dismissed:';

  async function call(action, input, token) {
    const url = window.PASSKEY_API_URL || (window.CONTACT_CONFIG && window.CONTACT_CONFIG.apiUrl);
    if (!url) throw new Error('The app connection is not configured.');
    const headers = {'Content-Type': 'application/json'};
    if (token) headers.Authorization = 'Bearer ' + token;
    let json;
    try {
      const response = await fetch(url, {method: 'POST', cache: 'no-store', headers,
        body: JSON.stringify({action, args: [input || {}]})});
      json = await response.json();
    } catch {
      throw new Error('Could not reach the server. Check your connection.');
    }
    if (!json || !json.ok) throw new Error((json && json.error) || 'Request failed.');
    return json.data;
  }

  async function supported() {
    if (!window.PublicKeyCredential || !window.isSecureContext) return false;
    try { return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); }
    catch { return false; }
  }

  function deviceLabel() {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Macintosh/.test(ua)) return navigator.maxTouchPoints > 1 ? 'iPad' : 'Mac';
    if (/Android/.test(ua)) return 'Android phone';
    if (/Windows/.test(ua)) return 'Windows PC';
    return 'This device';
  }

  const cancelled = e => e && (e.name === 'NotAllowedError' || e.name === 'AbortError');

  async function signIn({conditional = false, signal} = {}) {
    const options = await call('passkeyLoginOptions');
    const credential = await navigator.credentials.get({
      publicKey: {challenge: unb64u(options.challenge), rpId: options.rpId, timeout: options.timeout,
        userVerification: 'required', allowCredentials: []},
      ...(conditional ? {mediation: 'conditional'} : {}),
      ...(signal ? {signal} : {})
    });
    const r = credential.response;
    try {
      const data = await call('passkeyLogin', {
        id: credential.id,
        clientDataJSON: b64u(r.clientDataJSON),
        authenticatorData: b64u(r.authenticatorData),
        signature: b64u(r.signature),
        userHandle: r.userHandle ? b64u(r.userHandle) : ''
      });
      store.set(REMEMBER_KEY, data.username);
      return data;
    } catch (error) {
      store.del(REMEMBER_KEY); // passkey may have been removed on the server
      throw error;
    }
  }

  async function enable(token, username) {
    const o = await call('passkeyRegisterOptions', {}, token);
    let credential;
    try {
      credential = await navigator.credentials.create({publicKey: {
        ...o,
        challenge: unb64u(o.challenge),
        user: {...o.user, id: unb64u(o.user.id)},
        excludeCredentials: o.excludeCredentials.map(c => ({type: 'public-key', id: unb64u(c.id)}))
      }});
    } catch (error) {
      // This device already has a passkey for this account: nothing to add.
      if (error && error.name === 'InvalidStateError') {
        if (username) store.set(REMEMBER_KEY, username);
        return {alreadySetUp: true};
      }
      throw error;
    }
    const r = credential.response;
    const data = await call('passkeyRegister', {
      id: credential.id,
      clientDataJSON: b64u(r.clientDataJSON),
      attestationObject: b64u(r.attestationObject),
      label: deviceLabel()
    }, token);
    if (username) store.set(REMEMBER_KEY, username);
    return data;
  }

  const list = token => call('passkeyList', {}, token);
  const remove = (token, id) => call('passkeyDelete', {id}, token);

  /* ---------- UI ---------- */
  function css() {
    if (document.getElementById('passkey-style')) return;
    const s = document.createElement('style');
    s.id = 'passkey-style';
    s.textContent = `
      .pk-wrap{margin:0 0 16px}
      .pk-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;margin-top:0!important;
        padding:12px 16px;border-radius:24px;border:1px solid var(--line,#ccc);background:var(--soft,transparent);
        font:inherit;font-weight:600;cursor:pointer;color:var(--ink,inherit)}
      .pk-btn:disabled{opacity:.6;cursor:wait}
      .pk-btn svg{width:22px;height:22px;flex:none}
      .pk-or{display:flex;align-items:center;gap:10px;margin:14px 0 0;opacity:.6;font-size:.85em}
      .pk-or:before,.pk-or:after{content:"";flex:1;border-top:1px solid currentColor;opacity:.4}
      .pk-msg{margin:8px 0 0;font-size:.9em;color:#c0392b;min-height:0}.pk-msg:empty{display:none}.pk-msg.pk-hint{color:var(--muted,#555)}
      .pk-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;
        width:min(420px,calc(100vw - 32px));background:var(--panel,#fff);color:var(--ink,#111);
        border:1px solid var(--line,#ddd);border-radius:18px;box-shadow:0 10px 40px rgba(0,0,0,.25);
        padding:14px 18px;font:inherit;font-size:.95em}
      .pk-card{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;
        width:min(420px,calc(100vw - 32px));background:var(--panel,#fff);color:var(--ink,#111);border:1px solid var(--line,#ddd);border-radius:18px;
        box-shadow:0 10px 40px rgba(0,0,0,.25);padding:18px;font:inherit}
      .pk-card h3{margin:0 0 6px;font-size:1.05em}
      .pk-card p{margin:0 0 14px;font-size:.92em;color:var(--muted,#555)}
      .pk-row{display:flex;gap:10px;justify-content:flex-end}
      .pk-row button{margin:0;min-height:44px;padding:9px 16px;border-radius:24px;border:1px solid var(--line,#ccc);background:var(--soft,#f3f3f3);color:var(--ink,#111);font:inherit;cursor:pointer}`;
    document.head.appendChild(s);
  }
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M12 11c0 3.5-1 6.5-2.5 9"/><path d="M8.5 7.6A5 5 0 0 1 17 11c0 1.6-.1 3.2-.4 4.7"/><path d="M5.6 9.2A7 7 0 0 1 19 11c0 2.7-.4 5.3-1.2 7.6"/><path d="M14.5 11.5c0 2.6-.4 5.1-1.3 7.5"/><path d="M4 13.5c.3 1.5.4 2.7.3 4"/></svg>';

  async function mount({form, onSignedIn}) {
    if (!form || typeof onSignedIn !== 'function') throw new Error('Passkey.mount needs {form, onSignedIn}.');
    if (!(await supported())) return;
    css();
    const remembered = store.get(REMEMBER_KEY);
    const wrap = document.createElement('div');
    wrap.className = 'pk-wrap';
    wrap.innerHTML = `<button type="button" class="pk-btn">${ICON}<span></span></button>
      <p class="pk-msg" role="status"></p><div class="pk-or">or sign in with password</div>`;
    const button = wrap.querySelector('button'), label = wrap.querySelector('span'), msg = wrap.querySelector('.pk-msg');
    label.textContent = remembered ? 'Continue as ' + remembered + ' with Face ID / fingerprint'
      : 'Sign in with Face ID / fingerprint';
    form.insertBefore(wrap, form.firstChild);

    // Let saved passkeys also appear in the username field's autofill.
    let autofill = null;
    const startAutofill = async () => {
      const user = form.querySelector('input[name="username"], input[autocomplete~="username"], input[type="text"], input[type="email"]');
      if (!user || !PublicKeyCredential.isConditionalMediationAvailable) return;
      try { if (!(await PublicKeyCredential.isConditionalMediationAvailable())) return; } catch { return; }
      user.setAttribute('autocomplete', 'username webauthn');
      autofill = new AbortController();
      signIn({conditional: true, signal: autofill.signal}).then(onSignedIn).catch(error => {
        if (!cancelled(error)) msg.textContent = error.message;
      });
    };
    startAutofill();

    button.addEventListener('click', async () => {
      msg.classList.remove('pk-hint');
      if (!store.get(REMEMBER_KEY)) {
        // Nothing saved on this device yet: sign in with the password once,
        // then Face ID / fingerprint is saved automatically.
        setupRequested = true;
        msg.classList.add('pk-hint');
        msg.textContent = 'First time on this device: sign in with your username and password below. ' +
          'Face ID / fingerprint will be turned on right after, so next time you just tap this button.';
        const user = form.querySelector('input[autocomplete~="username"], input[type="text"], input[type="email"]');
        if (user) user.focus();
        return;
      }
      if (autofill) { autofill.abort(); autofill = null; }
      msg.textContent = '';
      button.disabled = true;
      try {
        onSignedIn(await signIn());
      } catch (error) {
        msg.textContent = cancelled(error)
          ? 'Face ID / fingerprint was cancelled. Try again or use your password.'
          : error.message;
        if (!store.get(REMEMBER_KEY)) label.textContent = 'Sign in with Face ID / fingerprint';
        startAutofill();
      } finally {
        button.disabled = false;
      }
    });
  }

  function toast(text) {
    css();
    const t = document.createElement('div');
    t.className = 'pk-toast';
    t.setAttribute('role', 'status');
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 5000);
  }

  async function offer({token, username}) {
    if (!token || !(await supported())) return false;
    const requested = setupRequested;
    setupRequested = false;
    if (store.get(REMEMBER_KEY) === username) return false;          // already on for this device
    if (requested) {
      // They tapped the Face ID button first, so turn it on straight away.
      try {
        await enable(token, username);
        toast('Face ID / fingerprint is on. Next time, just tap the button to sign in.');
        return true;
      } catch (error) {
        // Some browsers need one more tap before showing the Face ID prompt:
        // fall back to the card with a "Turn on" button.
        if (!cancelled(error)) { toast(error.message); return false; }
      }
    } else {
      const dismissed = Number(store.get(DISMISS_KEY + username) || 0);
      if (Date.now() - dismissed < 30 * 24 * 60 * 60 * 1000) return false; // asked recently
    }
    css();
    return new Promise(resolve => {
      const card = document.createElement('div');
      card.className = 'pk-card';
      card.setAttribute('role', 'dialog');
      card.innerHTML = `<h3>Sign in faster next time?</h3>
        <p>Use Face ID or your fingerprint on this ${deviceLabel()} instead of typing your password.</p>
        <p class="pk-msg" role="status" style="margin:-6px 0 10px"></p>
        <div class="pk-row"><button type="button" class="pk-later">Not now</button>
        <button type="button" class="pk-primary primary">Turn on</button></div>`;
      document.body.appendChild(card);
      const msg = card.querySelector('.pk-msg'), on = card.querySelector('.pk-primary');
      const close = result => { card.remove(); resolve(result); };
      card.querySelector('.pk-later').onclick = () => { store.set(DISMISS_KEY + username, String(Date.now())); close(false); };
      on.onclick = async () => {
        on.disabled = true; msg.textContent = '';
        try { await enable(token, username); close(true); }
        catch (error) {
          msg.textContent = cancelled(error) ? 'Cancelled. Tap Turn on to try again.' : error.message;
          on.disabled = false;
        }
      };
    });
  }

  window.Passkey = {supported, signIn, enable, list, remove, mount, offer};
})();
