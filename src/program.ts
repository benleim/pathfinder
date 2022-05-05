import { Command } from 'commander';
const program = new Command();

program
    .command('start')
    .option('--tokens', 'number of tokens to consider')
    .description('begin searching for dex cycles')
    .action((source, destination) => {
        console.log('start command called');
    });

program.parse();