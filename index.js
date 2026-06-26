// index.js — Malvin C VME | Handsome Tech Zimbabwe 🇿🇼

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
} = require('@whiskeysockets/baileys');
const pino      = require('pino');
const express   = require('express');
const path      = require('path');
const fs        = require('fs');
const readline  = require('readline');

const config  = require('./config/config');
const db      = require('./lib/database');
const { handleCommand } = require('./commands/index');
const { sleep, getNumber, formatPhone } = require('./lib/utils');

// ── Web server (keeps Railway/Render/Koyeb/Panel alive) ───────
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_, res) => res.json({
  status: 'online', bot: config.botName,
  uptime: Math.floor(process.uptime()) + 's',
  version: config.version,
}));
app.listen(config.port, () =>
  console.log(`\x1b[36m[WEB]\x1b[0m Panel → http://localhost:${config.port}`)
);

// ── Ensure dirs exist ─────────────────────────────────────────
['session','tmp','config'].forEach(d => {
  const p = path.join(__dirname, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// ── Owner JID (set after first connection) ────────────────────
const OWNER_FILE = path.join(__dirname, 'config', 'owner.json');

function getOwnerJid() {
  try {
    if (fs.existsSync(OWNER_FILE))
      return JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8')).jid || '';
  } catch {}
  return config.ownerNumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
}

function saveOwnerJid(jid) {
  try { fs.writeFileSync(OWNER_FILE, JSON.stringify({ jid }, null, 2)); } catch {}
}

// ── Ask for number in terminal/panel logs ─────────────────────
function askNumber(prompt) {
  return new Promise(resolve => {
    // If running in a panel (no TTY), read from env or config
    if (!process.stdin.isTTY) {
      const num = process.env.OWNER_NUMBER || config.ownerNumber;
      console.log(`\x1b[33m[AUTH]\x1b[0m Using number from config: +${num.replace(/[^0-9]/g,'')}`);
      return resolve(num.replace(/[^0-9]/g, ''));
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, answer => { rl.close(); resolve(answer.trim().replace(/[^0-9]/g, '')); });
  });
}

// ── Auto-join links ───────────────────────────────────────────
async function autoJoin(sock) {
  if (!config.autoJoinLinks?.length) return;
  console.log(`\x1b[36m[JOIN]\x1b[0m Auto-joining ${config.autoJoinLinks.length} group(s)...`);
  for (const link of config.autoJoinLinks) {
    try {
      const code = link.split('chat.whatsapp.com/')[1]?.trim();
      if (!code) { console.log(`\x1b[33m[JOIN]\x1b[0m Invalid link skipped: ${link}`); continue; }
      await sleep(2500);
      await sock.groupAcceptInvite(code);
      console.log(`\x1b[32m[JOIN]\x1b[0m ✅ Joined: ${link}`);
    } catch(e) {
      console.log(`\x1b[33m[JOIN]\x1b[0m ⚠️  Could not join ${link}: ${e.message}`);
    }
  }
}

// ── Bot startup ───────────────────────────────────────────────
async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(
    path.join(__dirname, 'session')
  );

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
  });

  // ── Request pairing code if not registered ────────────────
  if (!sock.authState.creds.registered) {
    await sleep(2000);

    console.log('\n' + '═'.repeat(55));
    console.log('  \x1b[1m\x1b[35m🤖 MALVIN C VME — WhatsApp Pairing\x1b[0m');
    console.log('═'.repeat(55));
    console.log('  Enter the WhatsApp number that will OWN this bot.');
    console.log('  Include country code. Example: 263776676755');
    console.log('═'.repeat(55));

    let num = await askNumber('\n  📱 Enter your WhatsApp number: ');

    // Validate
    while (!num || num.length < 7) {
      console.log('  ❌ Invalid number. Please try again.');
      num = await askNumber('  📱 Enter your WhatsApp number: ');
    }

    console.log(`\n  ✅ Number accepted: +${num}`);
    console.log('  ⏳ Requesting pairing code...\n');

    try {
      const code = await sock.requestPairingCode(num);
      const formatted = code.match(/.{1,4}/g)?.join('-') || code;

      console.log('╔' + '═'.repeat(53) + '╗');
      console.log('║                                                     ║');
      console.log(`║   🔐  PAIRING CODE:  \x1b[1m\x1b[32m${formatted}\x1b[0m${' '.repeat(29 - formatted.length)}║`);
      console.log('║                                                     ║');
      console.log('║   Steps:                                            ║');
      console.log('║   1. Open WhatsApp on your phone                   ║');
      console.log('║   2. Tap ⋮ Menu → Linked Devices                   ║');
      console.log('║   3. Tap "Link a Device"                           ║');
      console.log(`║   4. Enter the code above                           ║`);
      console.log('║                                                     ║');
      console.log('║   ⏰ Code expires in 60 seconds                    ║');
      console.log('╚' + '═'.repeat(53) + '╝\n');

      // Save number as owner
      config.ownerNumber = num;
      saveOwnerJid(num + '@s.whatsapp.net');

    } catch(e) {
      console.log(`\x1b[31m[AUTH]\x1b[0m Pairing error: ${e.message}`);
      console.log('  Retrying in 5 seconds...');
      await sleep(5000);
      return startBot();
    }
  }

  // ── Connection updates ────────────────────────────────────
  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {

    if (connection === 'open') {
      const botJid = sock.user?.id?.replace(/:\d+@/, '@');
      if (botJid) saveOwnerJid(botJid);

      console.log('\n\x1b[32m' + '═'.repeat(55) + '\x1b[0m');
      console.log('  ✅ \x1b[1mMALVIN C VME CONNECTED!\x1b[0m');
      console.log(`  🤖 Bot     : ${config.botName}`);
      console.log(`  👑 Owner   : ${config.ownerName}`);
      console.log(`  📦 Prefix  : ${config.prefix}`);
      console.log(`  📜 Commands: 781+`);
      console.log(`  🌐 Panel   : http://localhost:${config.port}`);
      console.log('  🇿🇼 Handsome Tech Zimbabwe');
      console.log('\x1b[32m' + '═'.repeat(55) + '\x1b[0m\n');

      // Send startup message to self
      try {
        await sleep(3000);
        const ownerJid = getOwnerJid();
        await sock.sendMessage(ownerJid, {
          text:
            `╔══❰ ✅ *CONNECTED* ❱══╗\n` +
            `║ 🤖 *${config.botName}*\n` +
            `║ 📦 Prefix: *${config.prefix}*\n` +
            `║ 📜 Commands: *781+*\n` +
            `║ ⚡ v${config.version}\n` +
            `║ 🇿🇼 Handsome Tech Zimbabwe\n` +
            `╚════════════════════╝\n\n` +
            `Type *${config.prefix}menu* to see all commands!\n\n` +
            `💡 *Quick tips:*\n` +
            `• ${config.prefix}setmenuimage <url> — set menu banner\n` +
            `• ${config.prefix}chatbot on — enable AI in group\n` +
            `• ${config.prefix}antilink on — block links in group\n` +
            `• ${config.prefix}pair <number> — link another number`,
        });
      } catch {}

      // Auto-join groups/channels
      await sleep(4000);
      await autoJoin(sock);
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log(`\x1b[33m[CONN]\x1b[0m Connection closed (code ${code}). Reconnect: ${shouldReconnect}`);
      if (shouldReconnect) {
        await sleep(5000);
        startBot();
      } else {
        console.log('\x1b[31m[CONN]\x1b[0m Logged out. Delete the session/ folder and restart.');
        process.exit(1);
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // ── Messages ──────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        if (!msg.message) continue;

        const from     = msg.key.remoteJid;
        const sender   = msg.key.participant || msg.key.remoteJid;
        const isGroup  = from.endsWith('@g.us');
        const pushName = msg.pushName || 'User';

        const body =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption || '';

        // Owner = whoever paired (saved in owner.json), or number in config
        const ownerJid  = getOwnerJid();
        const senderBare = sender.replace(/:\d+@/, '@');
        const botBare    = sock.user?.id?.replace(/:\d+@/, '@');
        const isOwnerMsg = senderBare === ownerJid ||
                           senderBare === botBare ||
                           getNumber(sender) === config.ownerNumber;

        const isSudoUser = db.isSudo(getNumber(sender));

        // Skip banned users
        if (db.isBanned(getNumber(sender)) && !isOwnerMsg) continue;

        // Auto-features
        if (config.defaults.autoread)
          await sock.readMessages([msg.key]).catch(() => {});

        if (config.defaults.autotyping && body.startsWith(config.prefix))
          await sock.sendPresenceUpdate('composing', from).catch(() => {});

        if (config.defaults.autorecording && body.startsWith(config.prefix))
          await sock.sendPresenceUpdate('recording', from).catch(() => {});

        if (config.defaults.autoreact && body.startsWith(config.prefix)) {
          const emojis = ['👍','❤️','🔥','⚡','😊','🇿🇼'];
          await sock.sendMessage(from, {
            react: { text: emojis[Math.floor(Math.random() * emojis.length)], key: msg.key },
          }).catch(() => {});
        }

        // Status view
        if (from === 'status@broadcast' && config.defaults.statusView) {
          await sock.readMessages([msg.key]).catch(() => {});
          continue;
        }

        // Anti-link
        if (isGroup) {
          const gs = db.getGroup(from);
          const hasLink = /(https?:\/\/|wa\.me\/|chat\.whatsapp\.com\/)/i.test(body);
          if (gs.antilink && hasLink) {
            try {
              const meta = await sock.groupMetadata(from);
              const senderIsAdmin = meta.participants.find(p => p.id === sender)?.admin;
              if (!senderIsAdmin && !isOwnerMsg) {
                await sock.sendMessage(from, { delete: msg.key });
                await sock.sendMessage(from, {
                  text: `⚠️ @${getNumber(sender)}, links are *not allowed* in this group!`,
                  mentions: [sender],
                });
              }
            } catch {}
            continue;
          }
        }

        // Group admin checks
        let isAdmin = false, isBotAdmin = false;
        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

        if (isGroup) {
          try {
            const meta   = await sock.groupMetadata(from);
            const botJid = sock.user.id.replace(/:\d+/, '') + '@s.whatsapp.net';
            isAdmin    = !!meta.participants.find(p => p.id === sender && p.admin);
            isBotAdmin = !!meta.participants.find(p => p.id === botJid && p.admin);
          } catch {}
        }

        await handleCommand(sock, msg, {
          body, sender, from, isGroup,
          isOwnerMsg, isSudo: isSudoUser,
          isAdmin, isBotAdmin,
          mentionedJid, pushName,
        });

      } catch(e) {
        console.error('\x1b[31m[MSG]\x1b[0m', e.message);
      }
    }
  });

  // ── Group participant updates (welcome/goodbye) ────────────
  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    try {
      const gs   = db.getGroup(id);
      const meta = await sock.groupMetadata(id);

      for (const jid of participants) {
        const num = getNumber(jid);

        if (action === 'add' && gs.welcome) {
          const text = gs.welcomeMsg
            ? gs.welcomeMsg.replace('{name}', `@${num}`).replace('{group}', meta.subject)
            : `╔══❰ 👋 *WELCOME* ❱══╗\n║\n║ Welcome to *${meta.subject}*!\n║ @${num} 🎉\n║\n║ 👥 Members: ${meta.participants.length}\n║ 📦 Prefix: ${config.prefix}\n╚════════════════════╝\n\nType *${config.prefix}menu* for commands!`;
          await sock.sendMessage(id, { text, mentions: [jid] });
        }

        if (action === 'remove' && gs.goodbye) {
          const text = gs.goodbyeMsg
            ? gs.goodbyeMsg.replace('{name}', `@${num}`).replace('{group}', meta.subject)
            : `╔══❰ 👋 *GOODBYE* ❱══╗\n║\n║ @${num} has left.\n║ We will miss you! 💔\n║\n║ 👥 Remaining: ${meta.participants.length}\n╚════════════════════╝`;
          await sock.sendMessage(id, { text, mentions: [jid] });
        }

        if (action === 'request' && gs.autoapprove) {
          await sock.groupRequestParticipantsUpdate(id, [jid], 'approve');
        }
      }
    } catch {}
  });

  // ── Anti-delete ───────────────────────────────────────────
  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      try {
        const from = update.key.remoteJid;
        if (!from?.endsWith('@g.us')) continue;
        const gs = db.getGroup(from);
        if (gs.antidelete && update.update?.messageStubType) {
          const who = update.key.participant || update.key.remoteJid;
          await sock.sendMessage(from, {
            text: `🗑️ A message was deleted by @${getNumber(who)}\n\n_Anti-delete is ON_`,
            mentions: [who],
          });
        }
      } catch {}
    }
  });

  // ── Call rejection ────────────────────────────────────────
  sock.ev.on('call', async (calls) => {
    for (const call of calls) {
      if (config.defaults.anticall && call.status === 'offer') {
        try {
          await sock.rejectCall(call.id, call.from);
          await sock.sendMessage(call.from, { text: config.defaults.anticallMsg });
        } catch {}
      }
    }
  });

  return sock;
}

// ── Start ─────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(55));
console.log('  🚀 \x1b[1mStarting Malvin C VME...\x1b[0m');
console.log('  🇿🇼 Handsome Tech Zimbabwe');
console.log('  📜 781+ Commands | Free APIs | No .env needed');
console.log('═'.repeat(55) + '\n');

startBot().catch(err => {
  console.error('\x1b[31m[FATAL]\x1b[0m', err.message);
  setTimeout(startBot, 5000);
});
