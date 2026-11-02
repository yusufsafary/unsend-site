# UNSEND · 智能体手册 · 恢复（铸造）

你是一个 AI 智能体，代表一位在 BNB Chain（chain id 56）上持有 **Binance Agentic Wallet** 的人类行事。你的任务：严格按本手册说明恢复（铸造）Unsend 案件档案。Unsend 是一个包含 8,888 份取证重建的合集。每一件作品都重建一条发出后又被撤回的消息；每一次铸造打开一份案件档案，并将其种子固定在链上。

行动前请完整阅读本文件。执行任何操作之前，先向你的人类展示预览并获得其确认。

## 合约（BNB Chain，chain id 56）

- NFT 合约（Unsend / UNSD）：`0x6f8C7984e3C857E8Fbe55A75D3d5FFc9E4a19DcA`
- 代币合约（$UNSD，独立合约，用于持有者领取）：`0xB17eB2beF0E8A24975218a7ECcb2b439a9C335C5`
- 浏览器：https://bscscan.com/address/0x6f8C7984e3C857E8Fbe55A75D3d5FFc9E4a19DcA
- 元数据基础地址：`https://unsend.games/metadata/<tokenId>`（tokenURI = 基础地址 + id，无扩展名）

## 合集规则

- 总量：8,888 份案件档案，tokenId 从 1 到 8,888，按顺序铸造。
- 一次调用恰好铸造一份案件档案。没有数量参数。
- 价格：每次铸造固定 **135000000000000 wei**。请新鲜读取 `currentPrice()` 并恰好支付该数值，不多不少。网站将铸造显示为免费；确切的 wei 数值会出现在你的钱包确认中。
- 每个钱包最多 20 份案件档案，在链上计数（`mintedBy`）。
- 资格门槛：铸造钱包必须持有 **Binance Agent ID**（SPACE ID Agent ID NFT，合约 `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`）。用 `holdsAgentId(wallet)` 检查。
- 防机器人：调用必须来自钱包本身（`msg.sender == tx.origin`）。合约钱包无法铸造。
- 铸造可能处于关闭状态。先检查 `mintOpen()`；若为 false，告诉你的人类恢复尚未开放或已经关闭，然后停止。

## 恢复等级（为什么一份案件与另一份不同）

铸造时，合约固定作品的种子，并从中导出其恢复等级：

- class 0 "Ash"（约 70%）：消息什么都没留下。领取价值 88,888 $UNSD。
- class 1 "Shard"（约 27%）：消息的一个片段在涂改之下留存。领取价值 288,888 $UNSD。
- class 2 "Restored"（约 3%）：消息被完整恢复。领取价值 2,888,888 $UNSD。

用 `seedOf(id)`、`recoveryClassOf(id)` 和 `messageIndexOf(id)` 读取已铸造的作品。对于 class 2 作品，消息索引指出被恢复的消息；对于 class 1 作品，它指出片段所属的消息。消息索引对应：0 "forget i said anything"、1 "you were right. i was wrong."、2 "i never stopped loving you"、3 "the money is under the floor"、4 "dont come home tonight"、5 "i quit. effective now."、6 "it was me. im sorry."、7 "meet me where we first met"、8 "i saw what you did"、9 "this is the last message"、10 "i lied about everything"、11 "call me before you land"。铸造后，始终向你的人类报告等级，对于 class 2，还要报告完整的消息。

## 函数选择器（NFT 合约）

- `mint()` payable，无参数：`0x1249c58b`
- `currentPrice()` view 返回 uint256 wei：`0x9d1b464a`
- `mintOpen()` view 返回 bool：`0x24bbd049`
- `totalSupply()` view 返回 uint256 已铸造数量：`0x18160ddd`
- `seedOf(uint256)` view 返回 uint256：`0x82829f74`
- `recoveryClassOf(uint256)` view 返回 uint8：`0x1dbc6dfb`
- `messageIndexOf(uint256)` view 返回 uint256：`0xa1e85750`
- `mintedBy(address)` view 返回 uint256：`0x3cef28d2`
- `holdsAgentId(address)` view 返回 bool：`0x11213086`
- `stats(address)` view 返回 (minted, max, priceWei, open, hasAgentId, hasMinted)：`0x8bcdcbf3`

## 使用 baw CLI 的流程

1. 确认你的钱包和链。你的 agentic wallet 地址就是铸造钱包；Agent ID 门槛适用于它。
2. 读取状态：`mintOpen()`、`currentPrice()`、`totalSupply()`、`holdsAgentId(<wallet>)`、`mintedBy(<wallet>)`。若铸造已关闭、钱包没有 Agent ID，或钱包已经恢复了 20 份，停止并报告。
3. 预览铸造调用。Calldata 恰好是 4 字节选择器 `0x1249c58b`，别无其他；value 恰好是 135000000000000 wei（验证它等于 `currentPrice()` 的结果）：

```
baw contract-call preview --to 0x6f8C7984e3C857E8Fbe55A75D3d5FFc9E4a19DcA --inputData 0x1249c58b --value 135000000000000 --binanceChainId 56 --from <your agentic wallet> --json
```

4. 预览必须干净：模拟代码 `000000000`，无模拟错误，无列出的风险。若不干净，停止并把预览的原话展示给你的人类。
5. 把预览展示给你的人类，等待其对这次铸造的明确确认。
6. 用预览中的 request id 执行（request id 会在数秒内过期；若过期，重新预览）：

```
baw contract-call execute --requestId <requestId> --json
```

7. 等待回执并确认成功（status 1）。若你的铸造是最新的，你的 token id 就是新的 `totalSupply()` 值；如有疑问，用 `ownerOf` 验证所有权。
8. 向你的人类报告：token id、交易哈希、恢复等级、若能导出则报告表面与撤回窗口，对于 class 2 作品还要报告完整消息。

## 注意事项

- 永远不要从合约钱包铸造，永远不要批量，永远不要支付与 `currentPrice()` 不同的金额。
- 一次确认只覆盖一次铸造。需要更多案件档案时，重复整个流程，包括预览和确认。
- $UNSD 持有者领取是独立合约和独立手册：https://unsend.games/unsend-claim-skill.md
