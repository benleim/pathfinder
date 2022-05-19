# Pathfinder
A command line interface (CLI) for quantifying & detecting DEX token pair arbitrage on the Ethereum blockchain. <br/> Currently supports UniswapV3 and Sushiswap.

# ⚡️ Quick start
First, install Node.js. Then, run the following commands:
```
npm install
npm install ts-node -g
npm install typescript -g
```


# ⚙️ Commands & Options
### **`start`**

begin searching for dex cycles repeatedly
```bash
ts-node ./src/program.ts start [OPTIONS]
```
| Option | Description                                              | Type    | Default | Required? |
|--------|----------------------------------------------------------|---------|---------|-----------|
| `--tokens`    | Number of highest daily volume tokens             | `number`| `5`     | No        |
| `--timeout`   | Polling timeout (seconds)                         | `number`| `5`     | No        | 
| `-x, --dex`   | Select which DEX(s) to arbitrage                  | `bool`  | `false` | No        |
| `-d, --debug` | Enable debug mode for printing                    | `bool`  | `false` | No        |

### **`run`**

search once for dex cycles
```bash
ts-node ./src/program.ts run [OPTIONS]
```
| Option | Description                                              | Type    | Default | Required? |
|--------|----------------------------------------------------------|---------|---------|-----------|
| `--tokens`    | Number of highest daily volume tokens             | `number`| `5`     | No        |
| `-x, --dex`   | Select which DEX(s) to arbitrage                  | `bool`  | `false` | No        |
| `-d, --debug` | Enable debug mode for printing                    | `bool`  | `false` | No        |

# 🔮 Future Roadmap
- More DEXs (PancakeSwap)
- CEX
- More L1s
- L2s
- Price slippage
- Live gas cost feed
