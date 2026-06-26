// config/config.js — Malvin C VME | Handsome Tech Zimbabwe 🇿🇼
// Edit your details below. No .env file needed.

module.exports = {
  ownerName:   'Malvin C',        // ← Your name
  ownerNumber: '263776676755',    // ← Your WhatsApp number (you are the owner)
  botName:     'Malvin C VME',
  prefix:      '.',
  mode:        'public',          // public / private
  version:     '1.0.0',
  port:        3000,

  // ── Menu image shown when someone types .menu ───────────────
  // Paste any direct image URL here (.jpg or .png)
  // Free image hosts: imgbb.com, imgur.com, postimages.org
  menuImage: 'https://files.catbox.moe/4785ld.jpg', // ← CHANGE THIS TO YOUR IMAGE URL

  // ── Auto-join your groups/channels on startup ──────────────
  // Paste full invite links like: 'https://chat.whatsapp.com/XXXX'
  autoJoinLinks: [
    // 'https://chat.whatsapp.com/XXXXXXXXXXXXXXXX',
    // 'https://chat.whatsapp.com/YYYYYYYYYYYYYYYY',
  ],

  // ── Feature defaults (changed via WhatsApp commands) ───────
  defaults: {
    antilink:       false,
    antidelete:     false,
    antispam:       false,
    welcome:        true,
    goodbye:        true,
    chatbot:        false,
    autoread:       false,
    autotyping:     false,
    autorecording:  false,
    autoreact:      false,
    statusView:     false,
    statusLike:     false,
    anticall:       false,
    anticallMsg:    '📵 Sorry, I do not accept calls. Please message me instead.',
    alwaysOnline:   false,
  },

  colors: {
    green:   '\x1b[32m',
    cyan:    '\x1b[36m',
    yellow:  '\x1b[33m',
    red:     '\x1b[31m',
    reset:   '\x1b[0m',
    bold:    '\x1b[1m',
  },
};
