import { Command } from 'commander';
import * as ARB from './arbitrage';
import { DEFAULT_TOKEN_NUMBER } from './constants';
const program = new Command();

program
    .command('start')
    .option('--tokens <number>', 'number of tokens to consider')
    .description('begin searching for dex cycles')
    .action((options) => {
        const numberTokens: number = (options.tokens) ? options.tokens : DEFAULT_TOKEN_NUMBER;
        ARB.main(numberTokens);
    });

program.parse();