import { Command } from 'commander';
import * as ARB from './arbitrage';
import { DEFAULT_TOKEN_NUMBER, DEFAULT_TIMEOUT, DEX } from './constants';
import { sleep } from './utils';

const inquirer = require('inquirer');
const program = new Command();

// CMD: Start
program
    .command('start')
    .option('--tokens <number>', 'number of highest daily volume tokens to consider')
    .option('--timeout <seconds>', 'polling timeout')
    .option('-x --dex', 'select considered dexes')
    .option('-d --debug', 'enable debug mode')
    .description('begin searching for dex cycles repeatedly')
    .action(async (options) => {
        const timeout: number = (options.timeout) ? options.timeout * 1000 : DEFAULT_TIMEOUT;
        const numberTokens: number = (options.tokens) ? options.tokens : DEFAULT_TOKEN_NUMBER;
        const debug: boolean = (options.debug) ? true : false;
        const dexs: Set<DEX> = await parseDexs(options);
        while (true) {
            await ARB.main(numberTokens, dexs, debug);
            await sleep(timeout);
        }
    });

// CMD: Run
program
    .command('run')
    .option('--tokens <number>', 'number of highest daily volume tokens to consider')
    .option('-x --dex', 'select considered dexes')
    .option('-d --debug', 'enable debug mode')
    .description('search once for dex cycles')
    .action(async (options) => {
        const numberTokens: number = (options.tokens) ? options.tokens : DEFAULT_TOKEN_NUMBER;
        const dexs: Set<DEX> = await parseDexs(options);
        const debug: boolean = (options.debug) ? true : false;
        await ARB.main(numberTokens, dexs, debug);
    });

async function parseDexs(options: any) {
    let dexs: Set<DEX> = new Set();
    if (options.dex) {
        const dexAnswers = await inquireDex();
        (dexAnswers.DEXs.includes('UniswapV3')) ? dexs.add(DEX.UniswapV3) : null;
        (dexAnswers.DEXs.includes('Sushiswap')) ? dexs.add(DEX.Sushiswap) : null;
    } else {
        Object.keys(DEX).filter((v) => !isNaN(Number(v))).forEach((key, index) => { dexs.add(index); });
    }
    return dexs;
}

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