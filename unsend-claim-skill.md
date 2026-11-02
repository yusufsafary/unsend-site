# UNSEND · Agent Handbook · $UNSD Holder Claim

You are an AI agent acting for a human who holds Unsend NFTs in a **Binance Agentic Wallet** on BNB Chain (chain id 56). Your task: claim $UNSD for the human's Unsend case files exactly as described here.

Read this whole file before acting. Show your human a preview and get their confirmation before executing anything.

**Claims open later, after the claim pool is funded.** Until the pool is funded and `claimOpen()` reads true, do not attempt a claim; tell your human claims have not opened yet.

## Contracts (BNB Chain, chain id 56)

- Claim contract (UnsendClaim): `0xfE37A7eBCC6DA7E625d7E744b4FeFE1E48a9892C`
- NFT contract (Unsend / UNSD): `0x6f8C7984e3C857E8Fbe55A75D3d5FFc9E4a19DcA`
- Token contract ($UNSD): `0xB17eB2beF0E8A24975218a7ECcb2b439a9C335C5`

## Rules of the claim

- Every Unsend case file can be claimed **once**, by its **current holder**, for $UNSD. The claim follows the work: if the work changes hands before being claimed, the new holder claims it; a claimed work can never be claimed again.
- The amount follows the work's recovery class, fixed at mint:
  - class 0, Ash: **88,888 $UNSD**
  - class 1, Shard: **288,888 $UNSD**
  - class 2, Restored: **2,888,888 $UNSD**
- Claim fee: 0. Send exactly 0 wei with the call; the claim costs gas only.
- Anti-bot: the call must come from the wallet itself (`msg.sender == tx.origin`).
- Claims can be closed. Check `claimOpen()` first; if false, tell your human claims are not open, and stop.
- If the claim pool cannot cover a work's amount, the claim reverts. Report that plainly; do not retry in a loop.

## Function selectors

Claim contract:
- `claim(uint256 tokenId)` payable: `0x379607f5`
- `claimAmount(uint256)` view returns uint256 wei of $UNSD (0 for unminted works): `0x23b221a0`
- `claimOpen()` view returns bool: `0x4b8bcb58`
- `claimFee()` view returns uint256 (0): `0x99d32fc4`
- `claimedById(uint256)` view returns bool: `0x4c80ee12`
- `totalClaimed()` view returns uint256: `0xd54ad2a1`
- `claimsRemaining()` view returns uint256: `0x754c463f`
- `poolBalance()` view returns uint256 wei of $UNSD: `0x96365d44`

NFT contract (for class and message):
- `recoveryClassOf(uint256)` view returns uint8: `0x1dbc6dfb`
- `messageIndexOf(uint256)` view returns uint256: `0xa1e85750`
- `ownerOf(uint256)` view returns address: `0x6352211e`

Message indexes: 0 "forget i said anything", 1 "you were right. i was wrong.", 2 "i never stopped loving you", 3 "the money is under the floor", 4 "dont come home tonight", 5 "i quit. effective now.", 6 "it was me. im sorry.", 7 "meet me where we first met", 8 "i saw what you did", 9 "this is the last message", 10 "i lied about everything", 11 "call me before you land".

## Procedure with the baw CLI

For each tokenId your human asks about:

1. Read state: `claimOpen()` on the claim contract; `ownerOf(tokenId)` must be your human's wallet; `claimedById(tokenId)` must be false; `claimAmount(tokenId)` gives the exact $UNSD amount.
2. Build calldata: selector `0x379607f5` followed by the tokenId as a 32-byte word.
3. Preview with value 0:

```
baw contract-call preview --to 0xfE37A7eBCC6DA7E625d7E744b4FeFE1E48a9892C --inputData 0x379607f5<tokenId as 64 hex digits, zero padded> --value 0 --binanceChainId 56 --from <your agentic wallet> --json
```

4. The preview must be clean: simulation code `000000000`, no simulation error, no listed risks, and the simulated token movement must match `claimAmount(tokenId)`. If anything differs, stop and show your human the preview.
5. Show the preview to your human and wait for explicit confirmation for this claim.
6. Execute:

```
baw contract-call execute --requestId <requestId> --json
```

7. Confirm the receipt succeeded, then verify: `claimedById(tokenId)` is true and the wallet's $UNSD balance increased by exactly the claim amount.
8. Report: token id, amount claimed, transaction hash, and the work's recovery class (and message, for class 2).

## Notes

- One confirmation covers one claim for one tokenId. Repeat the full procedure per work.
- Never claim for a work the wallet does not currently hold.
- The minting handbook is separate: https://unsend.games/unsend-skill.md
