// lib/utils.js — Malvin C VME utilities

const config = require('../config/config');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function getNumber(jid) { return jid.split('@')[0].split(':')[0]; }

function formatPhone(num) {
  return num.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
}

function isOwner(sender, ownerJid) {
  const bare = sender.replace(/:\d+@/, '@');
  return bare === ownerJid || getNumber(sender) === config.ownerNumber;
}

function runtime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }
function shorten(str, n = 80) { return str.length > n ? str.slice(0, n) + '...' : str; }
function isUrl(str) { try { new URL(str); return true; } catch { return false; } }

function timeNow() {
  return new Date().toLocaleTimeString('en-ZW', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Africa/Harare',
  });
}

function dateNow() {
  return new Date().toLocaleDateString('en-ZW', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Africa/Harare',
  });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return '🌅 Good Morning';
  if (h < 17) return '☀️ Good Afternoon';
  if (h < 21) return '🌆 Good Evening';
  return '🌙 Good Night';
}

function tmpPath(ext = 'tmp') {
  const fs = require('fs');
  const path = require('path');
  const dir = path.join(__dirname, '../tmp');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
}

module.exports = {
  sleep, getNumber, formatPhone, isOwner,
  runtime, pickRandom, randInt, capitalize,
  shorten, isUrl, timeNow, dateNow, getGreeting, tmpPath,
};
