const { Client } = require('discord.js-selfbot-v13');
const Capmonster = require('capmonster-cloud');
const axios = require('axios');
const token = ['']; // token(s)
const guildId = ''; // id serveur
const message = ''; // msg
const capmonsterToken = ''; // token capmonster
const proxyConfig = {
  host: '', // proxy host
  port: , // proxy port
  auth: {
    username: '', // proxy username
    password: '' // proxy password
  }
};

const capmonster = new Capmonster({ token: capmonsterToken });

async function solveCaptcha() {
  const taskId = await capmonster.createTask({ type: 'Discord', websiteURL: 'https://discord.com', proxy: `http://${proxyConfig.host}:${proxyConfig.port}` });
  let result = await capmonster.getTaskResult(taskId);
  while (result.status !== 'ready') {
    result = await capmonster.getTaskResult(taskId);
    await new Promise(resolve => setTimeout(resolve, 1000)); 
  }
  return result.solution;
}

async function sendDMs(token) {
  const client = new Client();

  client.on('ready', async () => {
    const guild = client.guilds.cache.get(guildId);
    if (guild) {
      const members = await guild.members.fetch();
      for (const member of members.values()) {
        if (!member.user.bot) { 
          try {
            const dmChannelResponse = await axios.post('https://discord.com/api/v9/users/@me/channels', {
              recipient_id: member.user.id
            }, {
              headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
              },
              proxy: {
                host: proxyConfig.host,
                port: proxyConfig.port,
                auth: proxyConfig.auth
              }
            });

            const dmChannelId = dmChannelResponse.data.id;

            await axios.post(`https://discord.com/api/v9/channels/${dmChannelId}/messages`, {
              content: message
            }, {
              headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
              },
              proxy: {
                host: proxyConfig.host,
                port: proxyConfig.port,
                auth: proxyConfig.auth
              }
            });

            console.log(`message envoyé à ${member.user.username}`);
          } catch (error) {
            if (error.message.includes('captcha')) {
              const captchaSolution = await solveCaptcha();

              try {
                const dmChannelResponse = await axios.post('https://discord.com/api/v9/users/@me/channels', {
                  recipient_id: member.user.id
                }, {
                  headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                  },
                  proxy: {
                    host: proxyConfig.host,
                    port: proxyConfig.port,
                    auth: proxyConfig.auth
                  }
                });

                const dmChannelId = dmChannelResponse.data.id;

                await axios.post(`https://discord.com/api/v9/channels/${dmChannelId}/messages`, {
                  content: message
                }, {
                  headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                  },
                  proxy: {
                    host: proxyConfig.host,
                    port: proxyConfig.port,
                    auth: proxyConfig.auth
                  }
                });

                console.log(`succès captcha pour ${member.user.username}`);
              } catch (error) {
                console.error(`err captcha : ${error.message}`);
              }
            } else if (error.code === 50013) {
              console.log(`dm close pour ${member.user.username}`);
            } else if (error.code === 429) {
              console.log(`${member.user.username} rate limit :/`);
              await new Promise(resolve => setTimeout(resolve, error.retryAfter * 1000));
              await member.send(message);
            } else {
              console.error(`err ${member.user.username} : ${error.message}`);
            }
          }
          await new Promise(resolve => setTimeout(resolve, 1000)); 
        }
      }
    }
  });

  try {
    await client.login(token);
  } catch (error) {
    console.error(`err ${token} : ${error.message}`);
  }
}

async function main() {
  for (const tk of token) {
    await sendDMs(tk);
    await new Promise(resolve => setTimeout(resolve, 5000)); 
  }
}

main();