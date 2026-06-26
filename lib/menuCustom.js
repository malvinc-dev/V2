// lib/menuCustom.js — Menu customisation for Malvin C VME
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const FILE = path.join(__dirname, '../config/menuSettings.json');

const defaults = {
  menuImage:  config.menuImage || 'https://files.catbox.moe/4785ld.jpg',
  botName:    'Malvin C VME',
  ownerName:  'Malvin C',
  tagline:    'Handsome Tech Zimbabwe 🇿🇼',
  theme:      'purple',
  menuFooter: '🇿🇼 Powered by Handsome Tech Zimbabwe',
  showTime:   true,
  showDate:   true,
  showRuntime:true,
};

function load() {
  try {
    if (fs.existsSync(FILE)) return { ...defaults, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
  } catch {}
  return { ...defaults };
}
function save(s) {
  try { fs.writeFileSync(FILE, JSON.stringify(s, null, 2)); } catch {}
}
function get(key)       { return load()[key]; }
function set(key, val)  { const s = load(); s[key] = val; save(s); return s; }
function getAll()       { return load(); }

module.exports = { get, set, getAll };
