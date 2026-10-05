(() => {
 const key='moolya-contact-session';
 let token=sessionStorage.getItem(key)||'';
 let generation=0;
 const app=document.querySelector('main.shell');
 const panel=document.createElement('section');panel.className='login-panel';
 panel.innerHTML=`<h1>Sign in to Contact Notes</h1><p>Use the shared login provided by your administrator.</p>
 <form id="loginForm"><label for="loginUsername">Username</label><input id="loginUsername" autocomplete="username" required maxlength="120">
 <label for="loginPassword">Password</label><input id="loginPassword" type="password" autocomplete="current-password" required maxlength="256">
 <button type="submit" class="primary">Sign in</button></form>
 <button id="forgotPassword" type="button">Forgot password?</button>
 <form id="resetForm" hidden><label for="newPassword">New shared password</label><input id="newPassword" type="password" minlength="12" maxlength="256" autocomplete="new-password" required>
 <label for="confirmPassword">Confirm password</label><input id="confirmPassword" type="password" minlength="12" maxlength="256" autocomplete="new-password" required><button type="submit" class="primary">Change password</button></form>
 <p id="authStatus" role="status" aria-live="polite"></p>`;
 app.before(panel);app.hidden=true;
 const logout=document.createElement('button');logout.type='button';logout.textContent='Sign out';logout.hidden=true;logout.id='logoutButton';const themeButton=document.querySelector('.theme-toggle');
 const headerActions=document.createElement('div');headerActions.className='header-actions';
 if(themeButton){themeButton.before(headerActions);headerActions.append(themeButton,logout);}
 else{const header=document.querySelector('.topbar-inner');if(header){headerActions.append(logout);header.append(headerActions);}}
 const style=document.createElement('style');style.textContent='[hidden]{display:none!important}.login-panel{width:calc(100% - 32px);max-width:460px;margin:24px auto;padding:28px;background:var(--panel);color:var(--ink);border-radius:24px}.login-panel h1{font-size:26px}.login-panel p{line-height:1.6}.login-panel button{margin-top:16px}.topbar-inner{flex-wrap:wrap}.brand{margin-right:auto}.header-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-shrink:0}.header-actions .theme-toggle,#logoutButton{margin:0;min-height:44px;padding:9px 13px;border:1px solid var(--line);border-radius:24px;font-size:13px;white-space:nowrap}#logoutButton{color:var(--ink);background:var(--soft)}@media(max-width:520px){.header-actions{width:100%}.header-actions .theme-toggle,#logoutButton{font-size:12px;padding:9px 12px}}';document.head.append(style);
 const get=id=>document.getElementById(id);
 const message=text=>get('authStatus').textContent=text;
 let resetToken=new URLSearchParams(location.hash.slice(1)).get('reset');
 if(resetToken){history.replaceState(null,'',location.pathname+location.search);get('loginForm').hidden=true;get('forgotPassword').hidden=true;get('resetForm').hidden=false;}
 function hideApp(){generation++;app.hidden=true;panel.hidden=false;logout.hidden=true;}
 function clear(){token='';sessionStorage.removeItem(key);hideApp();window.dispatchEvent(new Event('contact-auth-cleared'));}
 window.contactApi=async(action,...args)=>{
  const endpoint=window.CONTACT_CONFIG?.apiUrl;
  if(!endpoint||endpoint.includes('YOUR-WORKER'))throw Error('The app connection is not configured.');
  const current=generation;
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({action,args}),cache:'no-store'});
  let result;try{result=await response.json()}catch{throw Error('Could not connect. Please try again.')}
  if(response.status===401&&result.code==='AUTH_REQUIRED'){clear();message(result.error);}
  if(!response.ok||!result.ok)throw Error(result.error||'Request failed.');
  if(current!==generation&&!['logout','login','forgotPassword','resetPassword','session'].includes(action))throw Error('Session changed. Please sign in again.');
  return result.data;
 };
 function openApp(){panel.hidden=true;app.hidden=false;logout.hidden=false;window.dispatchEvent(new Event('contact-auth-ready'));}
 function busy(form,value){form.querySelectorAll('button,input').forEach(el=>el.disabled=value);}
 get('loginForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget;busy(form,true);message('Signing in…');try{const result=await window.contactApi('login',{username:get('loginUsername').value.trim(),password:get('loginPassword').value});token=result.token;sessionStorage.setItem(key,token);get('loginPassword').value='';message('');openApp()}catch(error){message(error.message)}finally{busy(form,false)}};
 get('forgotPassword').onclick=async()=>{get('forgotPassword').disabled=true;message('Requesting reset…');try{const r=await window.contactApi('forgotPassword',{});message(r.message+' Contact the administrator for access.')}catch(error){message(error.message)}finally{get('forgotPassword').disabled=false}};
 get('resetForm').onsubmit=async e=>{e.preventDefault();if(get('newPassword').value!==get('confirmPassword').value){message('Passwords do not match.');return}const form=e.currentTarget;busy(form,true);try{const r=await window.contactApi('resetPassword',{token:resetToken,password:get('newPassword').value});clear();resetToken=null;form.reset();form.hidden=true;get('loginForm').hidden=false;get('forgotPassword').hidden=false;message(r.message)}catch(error){message(error.message)}finally{busy(form,false)}};
 logout.onclick=async()=>{logout.disabled=true;try{await window.contactApi('logout')}catch(error){message('Local session cleared. The server session will expire automatically.')}finally{clear();logout.disabled=false;}};
 if(token&&!resetToken)window.contactApi('session').then(openApp).catch(error=>{clear();message(error.message)});
})();
