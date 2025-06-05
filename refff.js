const inquirer = require('inquirer');
const colors = require('ansi-colors');
const fs = require('fs');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const cfonts = require('cfonts');
const { ethers } = require('ethers');

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const WHITE = '\x1b[37m';
const BOLD = '\x1b[1m';
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function createSpinner(text) {
  let index = 0;
  let interval = null;
  let isActive = false;

  function clearLine() {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
  }

  return {
    start() {
      if (isActive) return;
      isActive = true;
      clearLine();
      process.stdout.write(`${CYAN}${SPINNER_FRAMES[index]} ${text}${RESET}`);
      interval = setInterval(() => {
        index = (index + 1) % SPINNER_FRAMES.length;
        clearLine();
        process.stdout.write(`${CYAN}${SPINNER_FRAMES[index]} ${text}${RESET}`);
      }, 100);
    },
    succeed(successText) {
      if (!isActive) return;
      clearInterval(interval);
      isActive = false;
      clearLine();
      process.stdout.write(`${GREEN}${BOLD}✔ ${successText}${RESET}\n`);
    },
    fail(failText) {
      if (!isActive) return;
      clearInterval(interval);
      isActive = false;
      clearLine();
      process.stdout.write(`${RED}✖ ${failText}${RESET}\n`);
    },
    stop() {
      if (!isActive) return;
      clearInterval(interval);
      isActive = false;
      clearLine();
    }
  };
}

function centerText(text) {
  const terminalWidth = process.stdout.columns || 80;
  const textLength = text.replace(/\x1b\[[0-9;]*m/g, '').length;
  const padding = Math.max(0, Math.floor((terminalWidth - textLength) / 2));
  return ' '.repeat(padding) + text;
}

cfonts.say('NT Exhaust', {
  font: 'block',
  align: 'center',
  colors: ['cyan', 'black'],
});
console.log(centerText(`${BLUE}=== Telegram Channel 🚀 : NT Exhaust ( @NTExhaust ) ===${RESET}`));
console.log(centerText(`${CYAN}✪ POINTLESS AUTO REFF & COMPLITING SOME TASK ✪${RESET}\n`));

console.log(colors.yellow('============ Auto Registration Bot ===========\n'));

function generateRandomHeaders() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/14.0.3 Safari/605.1.15',
    'Mozilla/5.0 (Linux; Android 10; SM-G970F) AppleWebKit/537.36 Chrome/115.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0'
  ];
  const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
  return {
    'User-Agent': randomUserAgent,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Origin': 'https://pointless.fluence.network',
    'Referer': 'https://pointless.fluence.network/'
  };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function countdown(ms) {
  const seconds = Math.floor(ms / 1000);
  for (let i = seconds; i > 0; i--) {
    process.stdout.write(colors.grey(`\rMenunggu ${i} detik... `));
    await delay(1000);
  }
  process.stdout.write('\r' + ' '.repeat(50) + '\r');
}

async function getAxiosConfig(proxy) {
  const config = {
    timeout: 60000,
    headers: generateRandomHeaders(),
    proxy: false
  };
  if (proxy) {
    const agent = new HttpsProxyAgent(proxy);
    config.httpAgent = agent;
    config.httpsAgent = agent;
  }
  return config;
}

async function getNonce(address, axiosConfig) {
  const url = 'https://pointless-api.fluence.network/api/v1/auth/nonce';
  try {
    const response = await axios.post(url, { walletAddress: address }, axiosConfig);
    if (response.data.success) {
      return response.data.data.nonce;
    } else {
      throw new Error('Gagal mendapatkan nonce');
    }
  } catch (error) {
    throw new Error(`Error saat mendapatkan nonce: ${error.message}`);
  }
}

async function signNonce(wallet, nonce) {
  try {
    const signature = await wallet.signMessage(nonce);
    return signature;
  } catch (error) {
    throw new Error(`Gagal menandatangani nonce: ${error.message}`);
  }
}

async function login(address, signature, axiosConfig) {
  const url = 'https://pointless-api.fluence.network/api/v1/auth/verify';
  const payload = { walletAddress: address, signature };
  try {
    const response = await axios.post(url, payload, axiosConfig);
    if (response.data.success) {
      return response.data.data.accessToken;
    } else {
      throw new Error('Login gagal');
    }
  } catch (error) {
    throw new Error(`Error saat login: ${error.message}`);
  }
}

async function applyReferral(token, referralCode, axiosConfig) {
  const url = 'https://pointless-api.fluence.network/api/v1/referrals/apply';
  const payload = { referralCode };
  try {
    const response = await axios.post(url, payload, {
      ...axiosConfig,
      headers: { ...axiosConfig.headers, Authorization: `Bearer ${token}` }
    });
    if (response.data.success) {
      return response.data.data.message;
    } else {
      throw new Error('Gagal menerapkan kode referral');
    }
  } catch (error) {
    throw new Error(`Error saat menerapkan referral: ${error.message}`);
  }
}

async function fetchTasks(token, walletAddress, axiosConfig) {
  const url = `https://pointless-api.fluence.network/api/v1/points/${walletAddress}`;
  try {
    const response = await axios.get(url, {
      ...axiosConfig,
      headers: { ...axiosConfig.headers, Authorization: `Bearer ${token}` }
    });
    if (!response.data.success) throw new Error('Gagal mengambil tasks');
    const activities = response.data.data.activities;
    return [
      ...activities.daily,
      ...activities.earning,
      ...activities.oneTime,
      ...activities.pointless
    ].map(task => ({
      id: task.id,
      title: task.title || 'Unnamed Task',
      status: task.status || 'pending',
      points: task.points || 0,
      category: Object.keys(activities).find(key => activities[key].includes(task)) || 'N/A'
    }));
  } catch (error) {
    throw new Error(`Gagal mendapatkan daftar task: ${error.message}`);
  }
}

async function completeTask(token, taskId, taskName, taskCategory, axiosConfig) {
  const url = 'https://pointless-api.fluence.network/api/v1/verify';
  const payload = { activityId: taskId };
  const spinner = createSpinner(`Verifying ${taskName}...`);
  spinner.start();
  try {
    if (["daily", "one time", "pointless"].includes(taskCategory)) {
      spinner.fail(` Skipped needs manual proof: ${taskName} [${taskCategory}]`);
      return false;
    }
    const response = await axios.post(url, payload, {
      ...axiosConfig,
      headers: { ...axiosConfig.headers, Authorization: `Bearer ${token}` }
    });
    if (response.data.success) {
      spinner.succeed(` Verified: ${taskName} [${taskCategory}]`);
      return true;
    }
    throw new Error(response.data.error?.message || 'Unknown error');
  } catch (error) {
    if (error.response?.status === 400) {
      spinner.fail(` Failed to verify ${taskName}: Proof required`);
    } else {
      spinner.fail(` Failed to verify ${taskName}: ${error.message}`);
    }
    return false;
  }
}

async function main() {
  const { useProxy } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useProxy',
      message: `${CYAN}Apakah Anda ingin menggunakan proxy?${RESET}`,
      default: false,
    }
  ]);

  let proxyList = [];
  let proxyMode = null;
  if (useProxy) {
    const proxyAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'proxyType',
        message: `${CYAN}Pilih jenis proxy:${RESET}`,
        choices: ['Rotating', 'Static'],
      }
    ]);
    proxyMode = proxyAnswer.proxyType;
    try {
      const proxyData = fs.readFileSync('proxy.txt', 'utf8');
      proxyList = proxyData.split('\n').map(line => line.trim()).filter(Boolean);
      console.log(colors.blueBright(`Terdapat ${proxyList.length} proxy.\n`));
    } catch (err) {
      console.log(colors.yellow('File proxy.txt tidak ditemukan, tidak menggunakan proxy.\n'));
    }
  }

  let count;
  while (true) {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'count',
        message: `${CYAN}Masukkan jumlah akun: ${RESET}`,
        validate: (value) => {
          const parsed = parseInt(value, 10);
          if (isNaN(parsed) || parsed <= 0) {
            return `${RED}Harap masukkan angka yang valid lebih dari 0!${RESET}`;
          }
          return true;
        }
      }
    ]);
    count = parseInt(answer.count, 10);
    if (count > 0) break;
  }

  const { ref } = await inquirer.prompt([
    {
      type: 'input',
      name: 'ref',
      message: `${CYAN}Masukkan kode referral: ${RESET}`,
      default: 'fi3hbnzd'
    }
  ]);

  console.log(colors.yellow('\n==================================='));
  console.log(colors.yellowBright(`Creating ${count} Account ..`));
  console.log(colors.yellow('=====================================\n'));

  const fileName = 'accounts.json';
  let accounts = [];
  if (fs.existsSync(fileName)) {
    try {
      accounts = JSON.parse(fs.readFileSync(fileName, 'utf8'));
    } catch (err) {
      accounts = [];
    }
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < count; i++) {
    console.log(colors.cyanBright(`\n================================ ACCOUNT ${i + 1}/${count} ================================`));

    let accountAxiosConfig = await getAxiosConfig(proxyList.length > 0 && useProxy ? (proxyMode === 'Rotating' ? proxyList[0] : proxyList.shift()) : null);
    if (useProxy && proxyList.length > 0) {
      const selectedProxy = proxyMode === 'Rotating' ? proxyList[0] : proxyList[0] || 'None';
      if (!selectedProxy && proxyMode === 'Static') {
        console.error(colors.red("Tidak ada proxy yang tersisa untuk mode static."));
        process.exit(1);
      }
      console.log(colors.white(`Menggunakan proxy: ${selectedProxy}`));
    }

    let accountIP = '';
    try {
      const ipResponse = await axios.get('https://api.ipify.org?format=json', accountAxiosConfig);
      accountIP = ipResponse.data.ip;
    } catch (error) {
      accountIP = "Gagal mendapatkan IP";
      console.error(colors.red(`Error saat mendapatkan IP: ${error.message}`));
    }
    console.log(colors.white(`IP Yang Digunakan: ${accountIP}\n`));

    const wallet = ethers.Wallet.createRandom();
    const walletAddress = wallet.address;
    const privateKey = wallet.privateKey.startsWith('0x') ? wallet.privateKey.slice(2) : wallet.privateKey;

    console.log(colors.greenBright(`✔️  Wallet Ethereum berhasil dibuat: ${walletAddress}`));

    const regSpinner = createSpinner('Proses registrasi...');
    regSpinner.start();
    try {
      const nonce = await getNonce(walletAddress, accountAxiosConfig);
      const signature = await signNonce(wallet, nonce);
      const token = await login(walletAddress, signature, accountAxiosConfig);
      const referralMessage = await applyReferral(token, ref, accountAxiosConfig);
      regSpinner.succeed(`  Register Account And ${referralMessage}`);
      successCount++;

      accounts.push({ walletAddress, privateKey });
      fs.writeFileSync(fileName, JSON.stringify(accounts, null, 2));
      console.log(colors.greenBright('✔️  Data akun disimpan ke accounts.json'));

      const taskSpinner = createSpinner('Memulai auto complete task...');
      taskSpinner.start();
      const tasks = await fetchTasks(token, walletAddress, accountAxiosConfig);
      taskSpinner.succeed('  Task List Received');

      for (const task of tasks) {
        console.log(colors.white(`\n Compliting Task: ${task.title}`));
        await completeTask(token, task.id, task.title, task.category, accountAxiosConfig);
      }
    } catch (error) {
      regSpinner.fail(` Gagal untuk ${walletAddress}: ${error.message}`);
      failCount++;
    }

    console.log(colors.yellow(`\nProgress: ${i + 1}/${count} akun telah diregistrasi. (Berhasil: ${successCount}, Gagal: ${failCount})`));
    console.log(colors.cyanBright('====================================================================\n'));

    if (i < count - 1) {
      const randomDelay = Math.floor(Math.random() * (60000 - 30000 + 1)) + 30000;
      await countdown(randomDelay);
    }
  }
  console.log(colors.blueBright('\nRegistrasi dan auto complete task selesai.'));
}

main().catch(err => console.log(colors.red(`Terjadi error fatal: ${err.message}`)));