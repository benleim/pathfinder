import { Command } from 'commander';
import * as ARB from './arbitrage';
import { DEFAULT_TOKEN_NUMBER, DEFAULT_TIMEOUT } from './constants';
import { sleep } from './utils';
const program = new Command();

program
    .command('start')
    .option('--tokens <number>', 'number of most liquid tokens to consider')
    .option('--timeout <seconds>', 'polling timeout')
    .description('begin searching for dex cycles repeatedly')
    .action(async (options) => {
        const timeout: number = (options.timeout) ? options.timeout * 1000 : DEFAULT_TIMEOUT;
        const numberTokens: number = (options.tokens) ? options.tokens : DEFAULT_TOKEN_NUMBER;
        while (true) {
            await ARB.main(numberTokens);
            await sleep(timeout);
        }
    });

program
    .command('run')
    .option('--tokens <number>', 'number of most liquid tokens to consider')
    .description('search once for dex cycles')
    .action((options) => {
        const numberTokens: number = (options.tokens) ? options.tokens : DEFAULT_TOKEN_NUMBER;
        ARB.main(numberTokens);
    })

program.parse();