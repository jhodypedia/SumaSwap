#!/usr/bin/env node
/**
 * Script Swap Token WCBTC → SUMA di Citrea Testnet
 * Dibuat oleh Jhody • Telegram: https://t.me/nongkripto
 * Brand: Nongkripto
 */

const readline = require('readline');
const { ethers } = require('ethers');
const Satsuma = require('@satsuma/sdk');
const chalk = require('chalk');
const figlet = require('figlet');
const ora = require('ora');

// RPC Citrea Testnet
const RPC_URL = 'https://rpc.testnet.citrea.xyz';

// Banner terminal
console.clear();
console.log(chalk.cyan(figlet.textSync('Nongkripto', { horizontalLayout: 'default' })));
console.log(chalk.yellow('🔁 Swap 10% dari WCBTC ke SUMA — Citrea Testnet'));
console.log(chalk.gray('Dibuat oleh Jhody • Telegram: https://t.me/nongkripto\n'));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question(chalk.green('🔑 Masukkan PRIVATE KEY: '), async (PRIVATE_KEY) => {
  rl.close();

  try {
    const spinner = ora('Menghubungkan ke jaringan Citrea...').start();

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY.trim(), provider);

    const satsuma = new Satsuma.SatsumaSDK({
      provider,
      signer: wallet,
      chainId: 'citrea-testnet'
    });

    const wcbtc = await satsuma.getTokenBySymbol('WCBTC');
    const suma = await satsuma.getTokenBySymbol('SUMA');

    if (!wcbtc || !suma) {
      spinner.fail('❌ Token tidak ditemukan di jaringan Citrea');
      return;
    }

    const token = new ethers.Contract(wcbtc.address, ['function balanceOf(address) view returns (uint256)'], wallet);
    const wcbtcBalance = await token.balanceOf(wallet.address);

    if (wcbtcBalance <= 0n) {
      spinner.fail('❌ Saldo WCBTC kosong');
      return;
    }

    const amountIn = wcbtcBalance * 10n / 100n;

    spinner.succeed('Terhubung ke jaringan Citrea ✅');
    console.log(chalk.blue(`\n💰 Saldo WCBTC: ${ethers.formatUnits(wcbtcBalance, wcbtc.decimals)} WCBTC`));
    console.log(chalk.magenta(`🔄 10% akan di-swap: ${ethers.formatUnits(amountIn, wcbtc.decimals)} WCBTC`));

    const quoteSpinner = ora('Mengambil estimasi SUMA...').start();
    const quote = await satsuma.quoteExactInput({
      tokenIn: wcbtc.address,
      tokenOut: suma.address,
      amountIn
    });
    quoteSpinner.succeed(`📈 Estimasi SUMA diterima: ${ethers.formatUnits(quote.amountOut, suma.decimals)} SUMA`);

    const swapSpinner = ora('Mengirim transaksi swap...').start();
    const tx = await satsuma.swapExactInput({
      tokenIn: wcbtc.address,
      tokenOut: suma.address,
      amountIn,
      amountOutMin: quote.amountOut * 95n / 100n, // 5% slippage
      recipient: wallet.address
    });

    swapSpinner.succeed('✅ Transaksi dikirim!');
    console.log(chalk.green(`TX Hash: ${tx.hash}`));
    console.log(chalk.cyan(`🔗 Explorer: https://explorer.testnet.citrea.xyz/tx/${tx.hash}`));

    const confirmSpinner = ora('Menunggu konfirmasi transaksi...').start();
    await tx.wait();
    confirmSpinner.succeed('🎉 Swap berhasil dan dikonfirmasi!');
  } catch (err) {
    console.error(chalk.red(`\n❌ Error: ${err.message || err}`));
  }
});
