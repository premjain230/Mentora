(()=>{'use strict';
const $=i=>document.getElementById(i),Q=s=>document.querySelectorAll(s),RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/,A=$('authMsg'),SU=!!$('signupForm'),PW=$('pwdF')||$('pwdIn');
let busy=false,step=1;
/* Friendly errors: [message, field(e|p), inline msg, state, offerLogin] */
const M={'invalid-email':['That email address doesn\u2019t look right. Check it and try again.','e','Enter a valid email address'],
'missing-email':['Enter your email address.','e','Enter your email'],
'user-not-found':['We couldn\u2019t find an account with that email. Check the address or create an account.','e','No account found'],
'wrong-password':['Incorrect email or password. Try again, or reset your password.','p','Check your password'],
'email-already-in-use':['An account with this email already exists.','e','Already registered','error',1],
'weak-password':['Choose a stronger password: at least 6 characters, ideally 8+ with numbers or symbols.','p','Password is too weak'],
'user-disabled':['This account has been disabled. Please contact support.'],
'too-many-requests':['Too many attempts. Wait a few minutes, or reset your password.'],
'network-request-failed':['Can\u2019t reach our servers. Check your connection and try again.'],
'popup-closed-by-user':['Google sign-in was closed before it finished.','','','info'],
'popup-blocked':['Your browser blocked the Google window. Allow pop-ups for this site and try again.'],
'account-exists-with-different-credential':['This email is linked to a different sign-in method. Try another option.'],
'missing-password':['Enter your password.','p','Enter your password']};
M['invalid-credential']=M['invalid-login-credentials']=M['wrong-password'];M['cancelled-popup-request']=M['popup-closed-by-user'];
const D=['Something went wrong on our side. Please try again in a moment.'];
const info=x=>{const s=(x&&(x.code||x.message))||String(x||''),m=s.match(/auth\/([a-z-]+)/i);return M[m?m[1]:s]||(/unavailable|network|fetch/i.test(s)?M['network-request-failed']:D)};
const mo=new MutationObserver(sync);mo.observe(A,{childList:true,characterData:true,subtree:true});
function paint(s,t,l){A.textContent=t;if(l){A.append(' ');const a=document.createElement('a');a.href=l[0];a.textContent=l[1];A.append(a)}A.dataset.state=s;mo.takeRecords()}
function clr(){A.textContent='';delete A.dataset.state;mo.takeRecords()}
function show(i){paint(i[3]||'error',i[0],i[4]&&SU?['login.html','Log in']:0);fld(i)}
/* Rewrites raw Firebase text from auth.js into friendly copy (raw text stays in console) */
function sync(){const r=A.textContent.trim();if(!r){delete A.dataset.state}
else if(/auth\/[a-z-]+|firebase/i.test(r)){console.warn('[auth] raw message:',r);show(info(r))}
else A.dataset.state=/(sent|created|success|welcome|redirect|signed in)/i.test(r)&&!/(not|fail|error|invalid|wrong|incorrect)/i.test(r)?'success':/verif/i.test(r)?'info':'error';mo.takeRecords()}
function err(e,t){e.setAttribute('aria-invalid','true');const m=e.closest('.f').querySelector('.m');if(m&&t){m.textContent=t;m.hidden=false;e.setAttribute('aria-describedby',m.id)}}
function ok(e){e.removeAttribute('aria-invalid');const m=e.closest('.f').querySelector('.m');if(m)m.hidden=true}
function fld(i){if(!i[1])return;const e=$(i[1]=='e'?'emailIn':PW.id);if(!e)return;if(SU&&step==2)go(1);err(e,i[2]);e.focus()}
Q('input,select').forEach(e=>e.addEventListener(e.tagName=='SELECT'||e.type=='checkbox'?'change':'input',()=>{ok(e);clr()}));
/* buttons */
Q('.btn').forEach(b=>b._h=b.innerHTML);
function bs(b,s){if(!b.querySelector('.bl'))b.innerHTML=b._h;b.classList.remove('is-loading','is-success');b.disabled=s!='idle';if(s!='idle')b.classList.add('is-'+s);b.querySelector('.bl').textContent=({loading:b.dataset.b,success:b.dataset.d})[s]||b.dataset.l;b.setAttribute('aria-busy',s=='loading')}
const lock=(on,b)=>Q('.btn').forEach(x=>{if(x!==b)x.disabled=on});
async function run(b,fn,done){if(busy)return;busy=true;clr();bs(b,'loading');lock(true,b);let o=false;
try{const r=await fn();sync();o=r!==false&&A.dataset.state!='error'}catch(x){console.error('[auth]',x);if(A.textContent.trim())sync();else show(info(x))}
if(o&&done)bs(b,'success');else{lock(false,b);bs(b,'idle');busy=false}return o}
addEventListener('pageshow',e=>{if(e.persisted){busy=false;Q('.btn').forEach(b=>bs(b,'idle'))}});
Q('.eye').forEach(b=>b.addEventListener('click',()=>{const i=b.previousElementSibling,s=i.type=='password';i.type=s?'text':'password';b.setAttribute('aria-pressed',s);b.setAttribute('aria-label',s?'Hide password':'Show password');b.classList.toggle('on',s)}));
/* theme (same storage keys / class as the existing app) */
const tg=$('themeBtn'),tl=()=>tg.setAttribute('aria-label',document.documentElement.classList.contains('light-mode')?'Switch to dark theme':'Switch to light theme');
tl();tg.addEventListener('click',()=>{const l=document.documentElement.classList.toggle('light-mode');try{localStorage.setItem('learning-allied-theme',l?'light':'dark')}catch(e){}tl()});
/* google */
$('googleBtn').addEventListener('click',e=>{const b=e.currentTarget;run(b,async()=>{const m=await import('./auth.js'),r=m.googleSignIn(SU?undefined:b);if(r&&r.then)return r;return new Promise(res=>{addEventListener('focus',()=>setTimeout(()=>res(false),600),{once:true});setTimeout(()=>res(false),15000)})},1)});
const em=()=>$('emailIn');
function vEmail(){const e=em(),v=e.value.trim();if(RE.test(v))return 0;err(e,v?'Enter a valid email address':'Enter your email');return e}
if(!SU){/* ---- login ---- */
$('loginForm').addEventListener('submit',e=>{e.preventDefault();const p=$('pwdF');let bad=vEmail();if(!p.value){err(p,'Enter your password');bad=bad||p}
if(bad)return bad.focus();const b=$('signInBtn');run(b,async()=>{const m=await import('./auth.js');await m.signIn(b)},1)});
$('forgotLink').addEventListener('click',async e=>{e.preventDefault();if(busy)return;const bad=vEmail();if(bad){err(bad,'Enter your email first');return bad.focus()}
const l=e.currentTarget,t=l.textContent;l.textContent='Sending\u2026';l.setAttribute('aria-disabled','true');busy=true;clr();
try{const m=await import('./auth.js');await m.forgotPassword();sync();if(!A.textContent.trim())paint('success','Password reset email sent. Check your inbox and spam folder.')}
catch(x){console.error('[auth]',x);if(A.textContent.trim())sync();else show(info(x))}
l.textContent=t;l.removeAttribute('aria-disabled');busy=false})}
else{/* ---- signup ---- */
function go(n){step=n;Q('.pn').forEach((p,i)=>p.classList.toggle('on',i==n-1));Q('.st i').forEach((s,i)=>s.classList.toggle('on',i<n));$('stl').textContent='Step '+n+' of 2';Q('.pn')[n-1].querySelector('.sl').append(A);$(n==1?'fnIn':'roleIn').focus({preventScroll:true})}
$('backBtn').addEventListener('click',()=>go(1));
const pw=$('pwdIn'),L=['','Weak','Fair','Good','Strong'],H=['','Add length, numbers or symbols','Add a number or symbol','Almost there',''];
pw.addEventListener('input',()=>{const v=pw.value;$('sw').hidden=!v;let s=(v.length>=8)+(/[a-z]/.test(v)&&/[A-Z]/.test(v))+/\d/.test(v)+/[^A-Za-z0-9]/.test(v),n=Math.max(s,1);
$('sbar').dataset.s=n;$('slab').textContent=v.length<6?'Too short':L[n];$('shint').textContent=v.length<6?'Use at least 6 characters':H[n]});
$('signupForm').addEventListener('submit',async e=>{e.preventDefault();
if(step==1){const f=$('fnIn');let bad=0;if(!f.value.trim()){err(f,'Enter your first name');bad=f}const x=vEmail();if(x)bad=bad||x;if(pw.value.length<6){err(pw,'Use at least 6 characters');bad=bad||pw}
return bad?bad.focus():go(2)}
const r=$('roleIn'),g=$('goalIn'),t=$('terms');let bad=0;
if(!r.value){err(r,'Select your role');bad=r}if(!g.value){err(g,'Select your goal');bad=bad||g}if(!t.checked){err(t,'Please accept the Terms and Privacy Policy to continue');bad=bad||t}
if(bad)return bad.focus();const b=$('createBtn');
if(await run(b,async()=>{const m=await import('./auth.js');await m.signUp(b,{role:r.value,goal:g.value})},1)){Q('.st i').forEach(i=>i.classList.add('on'));$('stl').textContent='Account created'}})}
})();
