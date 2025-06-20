const mineflayer = require('mineflayer');
const Movements = require('mineflayer-pathfinder').Movements;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const { GoalBlock } = require('mineflayer-pathfinder').goals;

const config = require('./settings.json');
const express = require('express');

const app = express();

app.get('/', (req, res) => {
  res.send('Bot is arrived')
});

app.listen(8000, () => {
  console.log('server started');
});

function createBot() {
   const bot = mineflayer.createBot({
      username: config['bot-account']['username'],
      password: config['bot-account']['password'],
      auth: config['bot-account']['type'],
      host: config.server.ip,
      port: config.server.port,
      version: config.server.version,
      viewDistance: 10,
   });

   bot.loadPlugin(pathfinder);
   const mcData = require('minecraft-data')(bot.version);
   const defaultMove = new Movements(bot, mcData);
   // bot.settings.colorsEnabled = false;

   bot.once('spawn', () => {
      console.log('\x1b[33m[AfkBot] Bot joined to the server', '\x1b[0m');

      if (config.utils['auto-auth'].enabled) {
         console.log('[INFO] Started auto-auth module');

         var password = config.utils['auto-auth'].password;
         setTimeout(() => {
            bot.chat(`/register ${password} ${password}`);
            bot.chat(`/login ${password}`);
         }, 500);

         console.log(`[Auth] Authentification commands executed.`);
      }

      if (config.utils['chat-messages'].enabled) {
         console.log('[INFO] Started chat-messages module');
         var messages = config.utils['chat-messages']['messages'];

         if (config.utils['chat-messages'].repeat) {
            var delay = config.utils['chat-messages']['repeat-delay'];
            let i = 0;

            let msg_timer = setInterval(() => {
               bot.chat(`${messages[i]}`);

               if (i + 1 == messages.length) {
                  i = 0;
               } else i++;
            }, delay * 1000);
         } else {
            messages.forEach((msg) => {
               bot.chat(msg);
            });
         }
      }

      const pos = config.position;

      if (config.position.enabled) {
         console.log(
            `\x1b[32m[Afk Bot] Starting moving to target location (${pos.x}, ${pos.y}, ${pos.z})\x1b[0m`
         );
         bot.pathfinder.setMovements(defaultMove);
         bot.pathfinder.setGoal(new GoalBlock(pos.x, pos.y, pos.z));
      }

      if (config.utils['anti-afk'].enabled) {
         console.log('[INFO] Started anti-afk movement module');

         let direction = 1; // 1 for forward, -1 for backward
         let moveInterval = setInterval(() => {
            // Move forward or backward
            bot.setControlState('forward', direction === 1);
            bot.setControlState('back', direction === -1);

            // Change direction every 2 seconds
            setTimeout(() => {
               bot.setControlState('forward', false);
               bot.setControlState('back', false);
               direction *= -1; // Switch direction
            }, 2000);

         }, 4000); // Move every 4 seconds (2 seconds in each direction)

         if (config.utils['anti-afk'].sneak) {
            bot.setControlState('sneak', true);
         }
      }
   });

   bot.on('chat', (username, message) => {
      if (config.utils['chat-log']) {
         console.log(`[ChatLog] <${username}> ${message}`);
      }
   });

   bot.on('goal_reached', () => {
      console.log(
         `\x1b[32m[AfkBot] Bot arrived to target location. ${bot.entity.position}\x1b[0m`
      );
   });

   bot.on('death', () => {
      console.log(
         `\x1b[33m[AfkBot] Bot has been died and was respawned ${bot.entity.position}`,
         '\x1b[0m'
      );
   });

   if (config.utils['auto-reconnect']) {
      bot.on('end', () => {
         setTimeout(() => {
            createBot();
         }, config.utils['auto-recconect-delay']);
      });
   }

   bot.on('kicked', (reason) =>
      console.log(
         '\x1b[33m',
         `[AfkBot] Bot was kicked from the server. Reason: \n${reason}`,
         '\x1b[0m'
      )
   );
   bot.on('error', (err) =>
      console.log(`\x1b[31m[ERROR] ${err.message}`, '\x1b[0m')
   );
}

createBot();
