# UNSEND · Agent Handbook · Recovering (Minting)

You are an AI agent acting for a human who holds a **Binance Agentic Wallet** on BNB Chain (chain id 56). Your task: recover (mint) Unsend case files exactly as described here. Unsend is a collection of 8,888 forensic reconstructions. Every work rebuilds a message that was sent, then unsent; every mint opens one case file and fixes its seed on-chain.

Read this whole file before acting. Show your human a preview and get their confirmation before executing anything.

## Contracts (BNB Chain, chain id 56)

- NFT contract (Unsend / UNSD): `0x6f8C7984e3C857E8Fbe55A75D3d5FFc9E4a19DcA`
- Token contract ($UNSD, separate, for holder claims): `0xB17eB2beF0E8A24975218a7ECcb2b439a9C335C5`
- Explorer: https://bscscan.com/address/0x6f8C7984e3C857E8Fbe55A75D3d5FFc9E4a19DcA
- Metadata base: `https://unsend.games/metadata/<tokenId>` (tokenURI = base + id, no extension)

## Rules of the collection

- Supply: 8,888 case files, tokenIds 1 to 8,888, minted in order.
- One call mints exactly one case file. There is no quantity argument.
- Price: flat **135000000000000 wei** per mint. Read `currentPrice()` fresh and pay exactly that value, no more, no less. The website displays the mint as free; the exact wei value appears in your wallet confirmation.
- Maximum 20 case files per wallet, counted on-chain (`mintedBy`).
- Eligibility gate: the minting wallet must hold a **Binance Agent ID** (SPACE ID Agent ID NFT, contract `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`). Check with `holdsAgentId(wallet)`.
- Anti-bot: the call must come from the wallet itself (`msg.sender == tx.origin`). Contract wallets cannot mint.
- Minting can be closed. Check `mintOpen()` first; if false, tell your human recovery has not opened or has closed, and stop.

## Recovery class (why one case differs from another)

At mint, the contract fixes the work's seed and derives its recovery class from it:

- class 0 "Ash" (about 70%): nothing of the message survived. Claim value 88,888 $UNSD.
- class 1 "Shard" (about 27%): a fragment of the message survived under redaction. Claim value 288,888 $UNSD.
- class 2 "Restored" (about 3%): the message was recovered in full. Claim value 2,888,888 $UNSD.

Read a minted work with `seedOf(id)`, `recoveryClassOf(id)` and `messageIndexOf(id)`. For class 2 works, the message index names the recovered message; for class 1 works it names the message the fragment belongs to. Message indexes map to: 0 "forget i said anything", 1 "you were right. i was wrong.", 2 "i never stopped loving you", 3 "the money is under the floor", 4 "dont come home tonight", 5 "i quit. effective now.", 6 "it was me. im sorry.", 7 "meet me where we first met", 8 "i saw what you did", 9 "this is the last message", 10 "i lied about everything", 11 "call me before you land". Always report the class and, for class 2, the full message to your human after minting.

## Function selectors (NFT contract)

- `mint()` payable, no arguments: `0x1249c58b`
- `currentPrice()` view returns uint256 wei: `0x9d1b464a`
- `mintOpen()` view returns bool: `0x24bbd049`
- `totalSupply()` view returns uint256 minted count: `0x18160ddd`
- `seedOf(uint256)` view returns uint256: `0x82829f74`
- `recoveryClassOf(uint256)` view returns uint8: `0x1dbc6dfb`
- `messageIndexOf(uint256)` view returns uint256: `0xa1e85750`
- `mintedBy(address)` view returns uint256: `0x3cef28d2`
- `holdsAgentId(address)` view returns bool: `0x11213086`
- `stats(address)` view returns (minted, max, priceWei, open, hasAgentId, hasMinted): `0x8bcdcbf3`

## Procedure with the baw CLI

1. Confirm your wallet and chain. Your agentic wallet address is the minting wallet; the Agent ID gate applies to it.
2. Read state: `mintOpen()`, `currentPrice()`, `totalSupply()`, `holdsAgentId(<wallet>)`, `mintedBy(<wallet>)`. Stop and report if minting is closed, the wallet holds no Agent ID, or the wallet already recovered 20.
3. Preview the mint call. Calldata is exactly the 4-byte selector `0x1249c58b` and nothing else; value is exactly 135000000000000 wei (verify it equals the `currentPrice()` result):

```
baw contract-call preview --to 0x6f8C7984e3C857E8Fbe55A75D3d5FFc9E4a19DcA --inputData 0x1249c58b --value 135000000000000 --binanceChainId 56 --from <your agentic wallet> --json
```

4. The preview must be clean: simulation code `000000000`, no simulation error, no listed risks. If it is not clean, stop and show your human exactly what the preview said.
5. Show the preview to your human and wait for their explicit confirmation for this mint.
6. Execute with the request id from the preview (request ids expire within seconds; if it lapses, preview again):

```
baw contract-call execute --requestId <requestId> --json
```

7. Wait for the receipt and confirm it succeeded (status 1). Your token id is the new `totalSupply()` value if your mint was the latest; verify ownership with `ownerOf` if in doubt.
8. Report to your human: token id, transaction hash, recovery class, surface and recall window if you can derive them, and the full message for class 2 works.

## Notes

- Never mint from a contract wallet, never batch, never pay a value different from `currentPrice()`.
- One confirmation covers one mint. For more case files, repeat the whole procedure, preview and confirmation included.
- The $UNSD holder claim is a separate contract and a separate handbook: https://unsend.games/unsend-claim-skill.md
