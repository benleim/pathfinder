import { gql } from 'graphql-request'

/**
 * VARIABLES
 */
export const ENDPOINT = `https://thegraph.com/explorer/subgraph/sushiswap/exchange`;

/**
 * QUERIES
 */
export function PAIR(id) {
    return gql`
      {
        pair(id: "${id}") {
          token0 { id, symbol }
          token1 { id, symbol }
          token0Price
          token1Price
          totalValueLockedUSD
        }
      }
    `
}

export function PAIRS(first, skip = 0) { 
    return gql`
    {
        pairs(first:${first}, skip: ${skip}){
          id
          token0 {
            id
            symbol
          }
          token1 {
            id
            symbol
          }
        }
    }`
}

export function HIGHEST_VOLUME_TOKENS(first, skip = 0, orderby = "volumeUSD", orderDirection = "desc") {
  return gql`
    {
        tokens(first: ${first}, skip: ${skip}, orderBy: ${orderby}, orderDirection:${orderDirection}) {
          id
          symbol
          name
        }
    }`
}

// TODO: Need function for fetching pools - no whitelisting concept like uniV3.