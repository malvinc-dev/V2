// lib/database.js — In-memory store for Malvin C VME

const store = {
  groups:  {},
  users:   {},
  sudo:    [],
  banned:  [],
  warns:   {},
};

function getGroup(id) {
  if (!store.groups[id]) {
    store.groups[id] = {
      antilink: false, antidelete: false, antispam: false,
      welcome: true, goodbye: true, chatbot: false,
      muted: false, autoapprove: false, antiedit: false,
      welcomeMsg: '', goodbyeMsg: '',
    };
  }
  return store.groups[id];
}
function setGroup(id, key, val) { getGroup(id)[key] = val; }

function addSudo(n)    { if (!store.sudo.includes(n)) store.sudo.push(n); }
function removeSudo(n) { store.sudo = store.sudo.filter(s => s !== n); }
function isSudo(n)     { return store.sudo.includes(n); }
function listSudo()    { return store.sudo; }

function banUser(n)    { if (!store.banned.includes(n)) store.banned.push(n); }
function unbanUser(n)  { store.banned = store.banned.filter(b => b !== n); }
function isBanned(n)   { return store.banned.includes(n); }
function listBanned()  { return store.banned; }

function warnUser(n)   { store.warns[n] = (store.warns[n] || 0) + 1; return store.warns[n]; }
function getWarns(n)   { return store.warns[n] || 0; }
function resetWarns(n) { store.warns[n] = 0; }

module.exports = {
  getGroup, setGroup,
  addSudo, removeSudo, isSudo, listSudo,
  banUser, unbanUser, isBanned, listBanned,
  warnUser, getWarns, resetWarns,
};
