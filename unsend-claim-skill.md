# UNSEND · 智能体手册 · $UNSD 持有者领取

你是一个 AI 智能体，代表一位在 **Binance Agentic Wallet**（BNB Chain，chain id 56）中持有 Unsend NFT 的人类行事。你的任务：严格按本手册说明，为人类的 Unsend 案件档案领取 $UNSD。

行动前请完整阅读本文件。执行任何操作之前，先向你的人类展示预览并获得其确认。

**领取将在领取池注资之后开放。** 在领取池注资且 `claimOpen()` 读数为 true 之前，不要尝试领取；告诉你的人类领取尚未开放。

## 合约（BNB Chain，chain id 56）

- 领取合约（UnsendClaim）：`0xfE37A7eBCC6DA7E625d7E744b4FeFE1E48a9892C`
- NFT 合约（Unsend / UNSD）：`0x6f8C7984e3C857E8Fbe55A75D3d5FFc9E4a19DcA`
- 代币合约（$UNSD）：`0xB17eB2beF0E8A24975218a7ECcb2b439a9C335C5`

## 领取规则

- 每一份 Unsend 案件档案可由其**当前持有者**领取**一次** $UNSD。领取跟随作品：若作品在被领取前易手，新持有者领取它；已领取的作品永远不能再次领取。
- 金额取决于作品在铸造时固定的恢复等级：
  - class 0，Ash：**88,888 $UNSD**
  - class 1，Shard：**288,888 $UNSD**
  - class 2，Restored：**2,888,888 $UNSD**
- 领取费：0。调用时恰好发送 0 wei；领取只花费 gas。
- 防机器人：调用必须来自钱包本身（`msg.sender == tx.origin`）。
- 领取可能处于关闭状态。先检查 `claimOpen()`；若为 false，告诉你的人类领取未开放，然后停止。
- 若领取池无法覆盖某件作品的金额，领取会 revert。如实报告；不要循环重试。

## 函数选择器

领取合约：
- `claim(uint256 tokenId)` payable：`0x379607f5`
- `claimAmount(uint256)` view 返回 uint256 wei 的 $UNSD（未铸造作品为 0）：`0x23b221a0`
- `claimOpen()` view 返回 bool：`0x4b8bcb58`
- `claimFee()` view 返回 uint256（0）：`0x99d32fc4`
- `claimedById(uint256)` view 返回 bool：`0x4c80ee12`
- `totalClaimed()` view 返回 uint256：`0xd54ad2a1`
- `claimsRemaining()` view 返回 uint256：`0x754c463f`
- `poolBalance()` view 返回 uint256 wei 的 $UNSD：`0x96365d44`

NFT 合约（用于等级与消息）：
- `recoveryClassOf(uint256)` view 返回 uint8：`0x1dbc6dfb`
- `messageIndexOf(uint256)` view 返回 uint256：`0xa1e85750`
- `ownerOf(uint256)` view 返回 address：`0x6352211e`

消息索引：0 "forget i said anything"、1 "you were right. i was wrong."、2 "i never stopped loving you"、3 "the money is under the floor"、4 "dont come home tonight"、5 "i quit. effective now."、6 "it was me. im sorry."、7 "meet me where we first met"、8 "i saw what you did"、9 "this is the last message"、10 "i lied about everything"、11 "call me before you land"。

## 使用 baw CLI 的流程

对你的人类询问的每一个 tokenId：

1. 读取状态：领取合约的 `claimOpen()`；`ownerOf(tokenId)` 必须是你的人类的钱包；`claimedById(tokenId)` 必须为 false；`claimAmount(tokenId)` 给出确切的 $UNSD 金额。
2. 构建 calldata：选择器 `0x379607f5` 后接 tokenId 的 32 字节 word。
3. 以 value 0 预览：

```
baw contract-call preview --to 0xfE37A7eBCC6DA7E625d7E744b4FeFE1E48a9892C --inputData 0x379607f5<tokenId as 64 hex digits, zero padded> --value 0 --binanceChainId 56 --from <your agentic wallet> --json
```

4. 预览必须干净：模拟代码 `000000000`，无模拟错误，无列出的风险，且模拟的代币转移必须与 `claimAmount(tokenId)` 一致。若有任何出入，停止并向你的人类展示预览。
5. 把预览展示给你的人类，等待其对这次领取的明确确认。
6. 执行：

```
baw contract-call execute --requestId <requestId> --json
```

7. 确认回执成功，然后验证：`claimedById(tokenId)` 为 true，且钱包的 $UNSD 余额恰好增加了领取金额。
8. 报告：token id、领取金额、交易哈希，以及作品的恢复等级（class 2 还要报告消息）。

## 注意事项

- 一次确认只覆盖一个 tokenId 的一次领取。每件作品重复整个流程。
- 永远不要为钱包当前未持有的作品领取。
- 铸造手册是独立的：https://unsend.games/unsend-skill.md
