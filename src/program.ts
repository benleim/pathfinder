import { Command } from 'commander';
import * as ARB from './arbitrage';
import { DEFAULT_TOKEN_NUMBER, DEFAULT_TIMEOUT, DEX } from './constants';
import { sleep } from './utils';

const inquirer = require('inquirer');
const program = new Command();

program
    .command('start')
    .option('--tokens <number>', 'number of most liquid tokens to consider')
    .option('--timeout <seconds>', 'polling timeout')
    .description('begin searching for dex cycles repeatedly')
    .action(async (options) => {
        const timeout: number = (options.timeout) ? options.timeout * 1000 : DEFAULT_TIMEOUT;
        const numberTokens: number = (options.tokens) ? options.tokens : DEFAULT_TOKEN_NUMBER;
        const dexs: Set<DEX> = new Set();
        while (true) {
            await ARB.main(numberTokens, dexs);
            await sleep(timeout);
        }
    });

program
    .command('run')
    .option('--tokens <number>', 'number of most liquid tokens to consider')
    .option('-d --dex', 'select considered dexes')
    .description('search once for dex cycles')
    .action(async (options) => {
        const numberTokens: number = (options.tokens) ? options.tokens : DEFAULT_TOKEN_NUMBER;
        let dexs: Set<DEX> = new Set();
        if (options.dex) {
            const dexAnswers = await inquireDex();
            (dexAnswers.DEXs.includes('UniswapV3')) ? dexs.add(DEX.UniswapV3) : null;
            (dexAnswers.DEXs.includes('Sushiswap')) ? dexs.add(DEX.Sushiswap) : null;
        } else {
            Object.keys(DEX).forEach((key) => dexs.add(key));
        }
        await ARB.main(numberTokens, dexs);
    })

async function inquireDex() {
    return inquirer
                .prompt([
                    {
                        type: 'checkbox',
                        message: 'Select DEXs',
                        name: 'DEXs',
                        choices: [{ name: 'UniswapV3' }, { name: 'Sushiswap' } ],
                        validate(answer) {
                            if (answer.length < 1) return 'You must choose at least one DEX.';
                            return true;
                        },
                    },
                ])
                .then((answers) => {
                    return answers;
                }); 
}

program.parse();