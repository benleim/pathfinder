import { UniqueInputFieldNamesRule } from 'graphql';
import { request, gql } from 'graphql-request'
import * as UNISWAP from './queries/uniswap.js';

// Fetch most active tokens
let mostActiveTokens = await request(UNISWAP.ENDPOINT, UNISWAP.HIGHEST_VOLUME_TOKENS);
console.log(mostActiveTokens)

let tokenIds = mostActiveTokens.tokens.map((t) => { return t.id });
console.log(tokenIds);

// Fetch whitelist pools for these tokens
let graph = {};
for (let id of tokenIds) {
  console.log(id)

  let whitelistPoolsRaw = await request(UNISWAP.ENDPOINT, UNISWAP.token_whitelist_pools(id));
  let whitelistPools = whitelistPoolsRaw.token.whitelistPools;
  for (let pool of whitelistPools) {
    console.log(pool);
  }
}

//TODO: Run route searching logic