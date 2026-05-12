import chalk from 'chalk';

// Warna unik per wallet
const WALLET_COLORS = [
  chalk.hex('#FF6B9D'),  // Pink
  chalk.hex('#51CF66'),  // Green
  chalk.hex('#339AF0'),  // Blue
];

const ROUTE_COLORS = {
  'LiteForge → Sepolia':       chalk.hex('#FFA94D'),
  'Sepolia → LiteForge':       chalk.hex('#845EF7'),
  'Base Sepolia → LiteForge':  chalk.hex('#20C997'),
  'LiteForge → Base Sepolia':  chalk.hex('#F06595'),
};

/**
 * Create a wallet-specific logger
 */
export function createWalletLogger(walletIndex) {
  const color = WALLET_COLORS[walletIndex % WALLET_COLORS.length];
  const prefix = color(`[W${walletIndex + 1}]`);

  return {
    info: (msg, data) => {
      const ts = chalk.gray(new Date().toLocaleTimeString());
      const line = `${ts} ${prefix} ${msg}`;
      if (data) {
        console.log(line, chalk.dim(JSON.stringify(data)));
      } else {
        console.log(line);
      }
    },

    success: (msg, data) => {
      const ts = chalk.gray(new Date().toLocaleTimeString());
      const line = `${ts} ${prefix} ${chalk.green('✓')} ${chalk.green(msg)}`;
      if (data) {
        console.log(line, chalk.dim(JSON.stringify(data)));
      } else {
        console.log(line);
      }
    },

    warn: (msg, data) => {
      const ts = chalk.gray(new Date().toLocaleTimeString());
      const line = `${ts} ${prefix} ${chalk.yellow('⚠')} ${chalk.yellow(msg)}`;
      if (data) {
        console.log(line, chalk.dim(JSON.stringify(data)));
      } else {
        console.log(line);
      }
    },

    error: (msg, data) => {
      const ts = chalk.gray(new Date().toLocaleTimeString());
      const line = `${ts} ${prefix} ${chalk.red('✗')} ${chalk.red(msg)}`;
      if (data) {
        console.log(line, chalk.dim(JSON.stringify(data)));
      } else {
        console.log(line);
      }
    },

    route: (routeName, msg) => {
      const ts = chalk.gray(new Date().toLocaleTimeString());
      const routeColor = ROUTE_COLORS[routeName] || chalk.white;
      const line = `${ts} ${prefix} ${routeColor(`[${routeName}]`)} ${msg}`;
      console.log(line);
    },

    divider: () => {
      console.log(color('─'.repeat(60)));
    },
  };
}

/**
 * Global logger (not wallet-specific)
 */
export const logger = {
  info: (msg) => {
    const ts = chalk.gray(new Date().toLocaleTimeString());
    console.log(`${ts} ${chalk.cyan('ℹ')} ${msg}`);
  },
  success: (msg) => {
    const ts = chalk.gray(new Date().toLocaleTimeString());
    console.log(`${ts} ${chalk.green('✓')} ${chalk.green(msg)}`);
  },
  warn: (msg) => {
    const ts = chalk.gray(new Date().toLocaleTimeString());
    console.log(`${ts} ${chalk.yellow('⚠')} ${chalk.yellow(msg)}`);
  },
  error: (msg) => {
    const ts = chalk.gray(new Date().toLocaleTimeString());
    console.log(`${ts} ${chalk.red('✗')} ${chalk.red(msg)}`);
  },
};
