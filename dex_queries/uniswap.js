import { gql } from 'graphql-request'

/**
 * VARIABLES
 */
export const ENDPOINT = `https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3`;

/**
 * QUERIES
 */
export const POOLS_FIRST_10 = gql`
    {
        pools(first:10){
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
      }
    `

export const HIGHEST_VOLUME_TOKENS = gql`
    {
        tokens(first: 12, orderBy: volumeUSD, orderDirection:desc) {
          id
          symbol
          name
        }
    }`

export function fetch_pool(id) {
  return gql`
    {
      pool(id: "${id}") {
        token0 { id, symbol }
        token1 { id, symbol }
        token0Price
        token1Price
        totalValueLockedUSD
      }
    }
  `
}

export function token_whitelist_pools(id) {
  return gql`
    {
      token(id: "${id}") {
        whitelistPools {
          id
          token0 {
            id
          }
          token1 {
            id
          }
        }
      }
    }
  `
}