(()=>{
'use strict';

const PROJECT_URL = 'https://pmoazkdpkxveloespevd.supabase.co';
const PUBLISHABLE_KEY = ['sb','publishable','Yce3SzdU5SpLDJhEvd1PqQ_7LLp2AP9'].join('_');

const state = {
  session: null,
  user: null,
  profile: null,
  role: null,
  account: null,
  ready: false,
  recovery: false
};

let client = null;
let initialized = false;
let authSubscription = null;
let syncChain = Promise.resolve();
const recoveryHandlers = new Set();

function getClient(){
  if(client) return client;
  const createClient = globalThis.supabase?.createClient;
  if(typeof createClient !== 'function'){
    throw new Error('Supabase-Bibliothek konnte nicht geladen werden.');
  }
  client = createClient(PROJECT_URL, PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  return client;
}

function normalizeAccount(user, profile, role){
  if(!user) return null;
  const email = user.email || '';
  const metadataName = user.user_metadata?.display_name || user.user_metadata?.name || '';
  const emailName = email.includes('@') ? email.split('@')[0] : '';
  return {
    id: user.id,
    email,
    name: profile?.display_name || metadataName || emailName || 'Meta-Human',
    role: role || null,
    avatar: profile?.avatar_url || "", appearance: user.user_metadata?.archive_appearance || {}, created: user.created_at || ""
  };
}

function clearIdentity(){
  state.session = null;
  state.user = null;
  state.profile = null;
  state.role = null;
  state.account = null;
}

async function loadIdentity(session){
  if(!session?.user){
    clearIdentity();
    return null;
  }

  const sb = getClient();
  const user = session.user;
  state.session = session;
  state.user = user;
  state.profile = null;
  state.role = null;
  state.account = normalizeAccount(user, null, null);

  const [profileResult, roleResult] = await Promise.all([
    sb.from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle(),
    sb.from('user_roles')
      .select('user_id, role')
      .eq('user_id', user.id)
      .maybeSingle()
  ]);

  if(profileResult.error) throw profileResult.error;
  if(roleResult.error) throw roleResult.error;

  state.profile = profileResult.data || null;
  state.role = roleResult.data?.role || null;
  state.account = normalizeAccount(user, state.profile, state.role);
  return state.account;
}

function queueSessionSync(session, renderAfter=true){
  syncChain = syncChain
    .catch(()=>{})
    .then(()=>loadIdentity(session))
    .then(()=>{
      if(renderAfter) globalThis.JMA_RENDER?.();
      return state.account;
    })
    .catch(error=>{
      console.error('Supabase Auth-Synchronisierung fehlgeschlagen:', error);
      if(renderAfter) globalThis.JMA_RENDER?.();
      return null;
    });
  return syncChain;
}

function notifyRecovery(){
  recoveryHandlers.forEach(handler=>{
    try{ handler(); }catch(error){ console.error('Recovery-Handler fehlgeschlagen:', error); }
  });
}

async function handleRecoverySession(session){
  await queueSessionSync(session, false);
  state.recovery = true;
  notifyRecovery();
}

function onRecovery(handler){
  if(typeof handler !== 'function') return ()=>{};
  recoveryHandlers.add(handler);
  if(state.recovery) setTimeout(()=>handler(), 0);
  return ()=>recoveryHandlers.delete(handler);
}

function isRecovery(){
  return state.recovery;
}

async function init(){
  if(initialized) return state;
  const sb = getClient();

  const listener = sb.auth.onAuthStateChange((event, session)=>{
    if(event === 'PASSWORD_RECOVERY'){
      setTimeout(()=>handleRecoverySession(session), 0);
      return;
    }
    if(!initialized) return;
    setTimeout(()=>queueSessionSync(session, true), 0);
  });
  authSubscription = listener.data?.subscription || null;

  const {data, error} = await sb.auth.getSession();
  if(error) throw error;
  await loadIdentity(data.session);

  initialized = true;
  state.ready = true;
  return state;
}

async function signUp(email, password, displayName){
  const sb = getClient();
  const name = String(displayName || '').trim() || 'Meta-Human';
  const {data, error} = await sb.auth.signUp({
    email: String(email || '').trim(),
    password,
    options: {
      data: {
        display_name: name
      }
    }
  });
  if(error) throw error;

  if(data.session){
    await loadIdentity(data.session);
  }else{
    state.session = null;
    state.user = data.user || null;
    state.profile = null;
    state.role = null;
    state.account = null;
  }

  return {
    user: data.user || null,
    session: data.session || null,
    account: state.account,
    requiresEmailConfirmation: !data.session
  };
}

async function signInWithPassword(email, password){
  const sb = getClient();
  const {data, error} = await sb.auth.signInWithPassword({
    email: String(email || '').trim(),
    password
  });
  if(error) throw error;
  await loadIdentity(data.session);
  return state.account;
}

async function signOut(){
  const sb = getClient();
  const {error} = await sb.auth.signOut();
  if(error) throw error;
  clearIdentity();
  return true;
}

async function resetPasswordForEmail(email){
  const sb = getClient();
  const {error} = await sb.auth.resetPasswordForEmail(
    String(email || '').trim(),
    {redirectTo: 'https://raw.githack.com/CHABOWEBco/once-human-Archiv-/design-preview/index.html'}
  );
  if(error) throw error;
  return true;
}

async function updatePassword(password){
  if(!state.session?.user && !state.user) throw new Error('Keine gültige Recovery-Sitzung.');
  const sb = getClient();
  const {data, error} = await sb.auth.updateUser({password});
  if(error) throw error;
  if(data.user) state.user = data.user;
  return data.user || state.user;
}

async function finishRecovery(){
  await signOut();
  state.recovery = false;
  return true;
}

async function updateDisplayName(displayName){
  if(!state.user) throw new Error('Keine aktive Anmeldung.');
  const name = String(displayName || '').trim();
  if(!name) throw new Error('Anzeigename darf nicht leer sein.');

  const sb = getClient();
  const {data, error} = await sb.from('profiles')
    .update({display_name: name})
    .eq('id', state.user.id)
    .select('id, display_name, avatar_url')
    .single();
  if(error) throw error;

  state.profile = data;
  state.account = normalizeAccount(state.user, state.profile, state.role);
  return state.account;
}

async function updateProfile({name,avatar,appearance}){
 if(!state.user) throw new Error('Keine aktive Anmeldung.');
 name=String(name||'').trim();if(name.length<2||name.length>48)throw new Error('Anzeigename benötigt 2 bis 48 Zeichen.');
 if(JSON.stringify(appearance).length>3500)throw new Error('Profilgestaltung ist zu groß.');
 const allowed=(globalThis.PROFILE_ASSETS?.avatars||[]).find(x=>x.id===avatar);
 const {data,error}=await getClient().from('profiles').update({display_name:name,avatar_url:allowed?.src||null}).eq('id',state.user.id).select('id, display_name, avatar_url').single();if(error)throw error;
 state.profile=data;
 const result=await getClient().auth.updateUser({data:{archive_appearance:appearance}});
 if(result.error){state.account=normalizeAccount(state.user,state.profile,state.role);throw new Error('Anzeigename gespeichert; Profilgestaltung konnte nicht gespeichert werden: '+result.error.message)}
 state.user=result.data.user;if(state.session)state.session.user=state.user;
 state.account=normalizeAccount(state.user,state.profile,state.role);return getAccount();
}

function getAccount(){
  return state.account ? {...state.account} : null;
}

function getState(){
  return {
    session: state.session,
    user: state.user,
    profile: state.profile,
    role: state.role,
    account: getAccount(),
    ready: state.ready,
    recovery: state.recovery
  };
}

function destroy(){
  authSubscription?.unsubscribe?.();
  authSubscription = null;
  initialized = false;
  state.ready = false;
}

globalThis.JMA_AUTH = {
  init,
  signUp,
  signInWithPassword,
  signOut,
  resetPasswordForEmail,
  updatePassword,
  finishRecovery,
  onRecovery,
  isRecovery,
  updateDisplayName,
  updateProfile,
  getAccount,
  getState,
  destroy
};
})();
