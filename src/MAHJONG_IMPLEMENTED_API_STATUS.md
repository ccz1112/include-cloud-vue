# 山东麻将已实现接口与联调状态说明

> 适用对象：前端联调 / 测试 / 产品确认
>
> 目标：明确告诉前端“后端已经实现了什么、怎么调、能拿到什么、当前还能依赖哪些实时能力”。

---

## 1. 当前后端已实现的麻将能力

当前山东麻将已经具备以下能力：

- 房间创建 / 列表 / 加入 / 离开 / 准备 / 开始
- 房间联机正式开局，统一入口为 `POST /room/{roomId}/start`
- 麻将正式对局动作：出牌 / 摸牌 / 碰 / 吃 / 杠 / 胡 / 过
- 安全版操作能力查询（按 `playerId + seat` 校验）
- 基础结算 DTO（胡牌结算 / 流局结算）
- 结算后下一局重开：重新准备 / 重新开始
- 基础托管能力：超时自动摸 / 自动打 / 自动 pass
- 手动开启托管 / 恢复托管
- WebSocket 大厅 / 房间 / 对局广播
- WebSocket 心跳与麻将断线重连快照
- 前端视角脱敏快照（仅自己可见手牌）

---

## 2. 统一返回格式

所有 HTTP 接口统一返回：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {}
}
```

失败时通常为：

```json
{
  "code": 500,
  "msg": "操作失败",
  "data": "错误描述"
}
```

前端判断建议：

- `code === 200` 视为成功
- 失败时优先读取 `data` 中的错误提示

---

## 3. 房间接口（正式联机主入口）

控制器前缀：`/room`

### 3.1 获取房间列表

- **方法**：`GET`
- **路径**：`/room/list`
- **功能描述**：大厅房间列表，支持按玩法、状态、分页查询。

#### 入参

| 字段 | 位置 | 必填 | 类型 | 说明 |
|---|---|---:|---|---|
| `gameCode` | query | 否 | string | 当前主要传 `SHANDONG_MAHJONG` |
| `status` | query | 否 | string | `WAITING` / `PLAYING` / `FINISHED` |
| `pageNo` | query | 否 | int | 页码，默认 1 |
| `pageSize` | query | 否 | int | 每页数量，默认 10 |

#### 出参

`data` 结构：

| 字段 | 类型 | 说明 |
|---|---|---|
| `total` | int | 总房间数 |
| `pageNo` | int | 当前页 |
| `pageSize` | int | 每页数量 |
| `records` | array | 房间摘要列表 |

`records[]` 字段：

- `roomId`
- `roomName`
- `gameCode`
- `playerCount`
- `maxPlayerCount`
- `readyCount`
- `status`
- `hostPlayerId`
- `currentGameId`

---

### 3.2 创建房间

- **方法**：`POST`
- **路径**：`/room/create`
- **功能描述**：创建一个山东麻将房间，房主自动入座。

#### 入参

```json
{
  "roomName": "测试房间",
  "hostPlayerId": "u1",
  "hostPlayerName": "玩家1",
  "gameCode": "SHANDONG_MAHJONG",
  "maxPlayerCount": 4
}
```

#### 出参

`data` 结构：

- `room`: 完整房间对象
- `currentGame`: 当前牌局快照，未开始时通常为 `null`
- `seatedCount`: 当前入座人数
- `readyCount`: 当前准备人数
- `allReady`: 是否全员准备

---

### 3.3 获取房间详情

- **方法**：`GET`
- **路径**：`/room/{roomId}`
- **功能描述**：进入房间页或刷新房间详情时调用。

#### 入参

| 字段 | 位置 | 必填 | 类型 | 说明 |
|---|---|---:|---|---|
| `roomId` | path | 是 | string | 房间 ID |
| `viewerPlayerId` | query | 否 | string | 当前查看者 playerId，用于脱敏快照 |

#### 出参

与创建房间返回相同，`currentGame` 为**脱敏后的牌局快照**。

---

### 3.4 加入房间

- **方法**：`POST`
- **路径**：`/room/{roomId}/join`
- **功能描述**：玩家加入房间并自动占用空座位。

#### 入参

```json
{
  "playerId": "u2",
  "playerName": "玩家2"
}
```

#### 出参

返回最新 `roomSnapshot`：

- `room`
- `currentGame`
- `seatedCount`
- `readyCount`
- `allReady`

> 注意：有人加入后，房间内所有人准备状态会被重置。

---

### 3.5 离开房间

- **方法**：`POST`
- **路径**：`/room/{roomId}/leave`
- **功能描述**：玩家离座。游戏进行中不允许离开。

#### 入参

```json
{
  "playerId": "u2"
}
```

#### 出参

返回最新房间快照。

> 注意：
> - 房主离开后会自动转移房主
> - 若房间无人则变为 `DISMISSED`

---

### 3.6 房间准备 / 取消准备

- **方法**：`POST`
- **路径**：`/room/{roomId}/ready`
- **功能描述**：房间准备。结算后，下一局也是通过这个接口重新准备。

#### 入参

```json
{
  "playerId": "u1",
  "ready": true
}
```

#### 出参

返回最新房间快照。

> 当前已实现：
> - 对局结算后，任一玩家重新 `ready`，房间会从 `FINISHED` 回到 `WAITING`
> - 已结束旧局的 `currentGameId` 会被清理
> - 全员再次准备后可重新开始下一局

---

### 3.7 房间开始游戏（正式联机唯一开局入口）

- **方法**：`POST`
- **路径**：`/room/{roomId}/start`
- **功能描述**：房主在房间内正式开局。

#### 入参

```json
{
  "playerId": "u1"
}
```

#### 出参

返回：

- `room`
- `currentGame`
- `seatedCount`
- `readyCount`
- `allReady`

其中：

- `room.status = PLAYING`
- `room.currentGameId` 为新牌局 ID
- `currentGame` 为脱敏牌局快照
- `currentGame.turnDeadlineAt` 已初始化

---

## 4. 麻将正式对局接口

控制器前缀：`/mahjong`

> 说明：
>
> - 房间联机正式开局请走 `/room/{roomId}/start`
> - `/mahjong/game/init` 和 `/mahjong/game/{gameId}/deal` 主要用于脱离房间的单局调试

---

### 4.1 调试初始化单局

- **方法**：`POST`
- **路径**：`/mahjong/game/init`
- **功能描述**：创建一局脱离房间的调试牌局。

#### 入参

```json
{
  "players": [
    {"playerId": "player_0", "playerName": "玩家1"},
    {"playerId": "player_1", "playerName": "玩家2"},
    {"playerId": "player_2", "playerName": "玩家3"},
    {"playerId": "player_3", "playerName": "玩家4"}
  ]
}
```

#### 出参

返回完整 `ShandongMahjongGame`。

> 如果传了 `roomId`，接口会拒绝，并提示改走 `/room/{roomId}/start`。

---

### 4.2 获取牌局快照

- **方法**：`GET`
- **路径**：`/mahjong/game/{gameId}`
- **功能描述**：按玩家视角获取牌局脱敏快照。

#### 入参

| 字段 | 位置 | 必填 | 类型 | 说明 |
|---|---|---:|---|---|
| `gameId` | path | 是 | string | 牌局 ID |
| `viewerPlayerId` | query | 否 | string | 查看者 ID |

#### 出参重点字段

- `gameId`
- `roomId`
- `status`
- `round`
- `dealerPosition`
- `currentPlayerPosition`
- `turnPhase`
- `lastDiscardedTile`
- `lastPlayerPosition`
- `lastDrawnTile`（仅当前摸牌玩家可见）
- `turnDeadlineAt`
- `remainingTileCount`
- `roundSettlement`
- `viewerPlayerId`
- `viewerPosition`
- `players`

`players[]` 当前会返回：

- `playerId`
- `playerName`
- `position`
- `handTileCount`
- `discardedTiles`
- `pongTiles`
- `chowTiles`
- `kongTiles`
- `isDealer`
- `isTing`
- `isWin`
- `autoManaged`
- `winType`
- `winFan`
- `self`
- `handTiles`（只对 `self=true` 返回）

---

### 4.3 调试发牌

- **方法**：`POST`
- **路径**：`/mahjong/game/{gameId}/deal`
- **功能描述**：调试牌局发牌。

#### 入参

无。

#### 出参

返回完整 `ShandongMahjongGame`。

> 若该牌局已绑定 `roomId`，接口会拒绝，提示走 `/room/{roomId}/start`。

---

### 4.4 出牌

- **方法**：`POST`
- **路径**：`/mahjong/game/{gameId}/discard`
- **功能描述**：当前玩家打出一张牌。

#### 入参

```json
{
  "playerId": "u1",
  "playerPosition": 0,
  "tile": {
    "type": "BAMBOO",
    "value": "3",
    "displayName": "3条",
    "sortValue": 3
  }
}
```

#### 出参

返回更新后的 `ShandongMahjongGame`。

#### 当前行为

- 会校验 `playerId` 与 `playerPosition` 是否匹配
- 若打牌后进入响应窗口，会打开 `WAITING_FOR_RESPONSE`
- 会刷新 `turnDeadlineAt`

---

### 4.5 摸牌

- **方法**：`POST`
- **路径**：`/mahjong/game/{gameId}/draw`
- **功能描述**：当前应摸牌玩家执行摸牌。

#### 入参

```json
{
  "playerId": "u2",
  "playerPosition": 1
}
```

#### 出参

```json
{
  "drawnTile": {},
  "game": {},
  "roundSettlement": {}
}
```

#### 当前行为

- 正常摸牌时返回 `drawnTile + game`
- 若牌墙已空，会直接流局：
  - `game.status = FINISHED`
  - `roundSettlement.settlementType = DRAW`
  - `roundSettlement.finishReason = WALL_EMPTY`

---

### 4.6 碰牌

- **方法**：`POST`
- **路径**：`/mahjong/game/{gameId}/pong`
- **功能描述**：在响应窗口中执行碰牌。

#### 入参

```json
{
  "playerId": "u3",
  "playerPosition": 2
}
```

#### 出参

返回更新后的 `ShandongMahjongGame`。

---

### 4.7 吃牌

- **方法**：`POST`
- **路径**：`/mahjong/game/{gameId}/chow`
- **功能描述**：在响应窗口中执行吃牌。

#### 入参

```json
{
  "playerId": "u1",
  "playerPosition": 0,
  "tiles": [
    {"type": "BAMBOO", "value": "1", "displayName": "1条", "sortValue": 1},
    {"type": "BAMBOO", "value": "2", "displayName": "2条", "sortValue": 2},
    {"type": "BAMBOO", "value": "3", "displayName": "3条", "sortValue": 3}
  ]
}
```

#### 出参

返回更新后的 `ShandongMahjongGame`。

---

### 4.8 杠牌

- **方法**：`POST`
- **路径**：`/mahjong/game/{gameId}/kong`
- **功能描述**：执行暗杠 / 明杠 / 补杠。

#### 入参

```json
{
  "playerId": "u1",
  "playerPosition": 0,
  "kongType": "CONCEALED",
  "tiles": [
    {"type": "BAMBOO", "value": "5", "displayName": "5条", "sortValue": 5},
    {"type": "BAMBOO", "value": "5", "displayName": "5条", "sortValue": 5},
    {"type": "BAMBOO", "value": "5", "displayName": "5条", "sortValue": 5},
    {"type": "BAMBOO", "value": "5", "displayName": "5条", "sortValue": 5}
  ]
}
```

#### 出参

- 正常杠牌：返回更新后的 `game`
- 杠后若直接结算：返回带 `roundSettlement` 的牌局结果

---

### 4.9 胡牌

- **方法**：`POST`
- **路径**：`/mahjong/game/{gameId}/win`
- **功能描述**：执行胡牌。

#### 入参

```json
{
  "playerId": "u2",
  "playerPosition": 1,
  "selfDrawn": false,
  "tile": {
    "type": "BAMBOO",
    "value": "9",
    "displayName": "9条",
    "sortValue": 9
  }
}
```

#### 出参

```json
{
  "winInfo": {},
  "game": {},
  "roundSettlement": {}
}
```

#### 当前行为

- 胡牌成功后立即进入结算
- 同步返回 `winInfo`
- 同步返回 `roundSettlement`

---

### 4.10 过牌

- **方法**：`POST`
- **路径**：`/mahjong/game/{gameId}/pass`
- **功能描述**：在响应窗口放弃本次动作。

#### 入参

```json
{
  "playerId": "u3",
  "playerPosition": 2
}
```

#### 出参

返回更新后的 `ShandongMahjongGame`。

---

### 4.11 开启托管

- **方法**：`POST`
- **路径**：`/mahjong/game/{gameId}/auto-manage`
- **功能描述**：玩家主动切换为托管状态。

#### 入参

```json
{
  "playerId": "u1",
  "seat": 0
}
```

#### 出参

返回更新后的 `ShandongMahjongGame`。

#### 当前行为

- 对应玩家 `autoManaged = true`
- 会刷新 `turnDeadlineAt`

---

### 4.12 恢复托管

- **方法**：`POST`
- **路径**：`/mahjong/game/{gameId}/auto-manage/resume`
- **功能描述**：玩家主动取消托管。

#### 入参

```json
{
  "playerId": "u1",
  "seat": 0
}
```

#### 出参

返回更新后的 `ShandongMahjongGame`。

#### 当前行为

- 对应玩家 `autoManaged = false`
- 会刷新 `turnDeadlineAt`

---

### 4.13 查询当前可执行动作（推荐接口）

- **方法**：`GET`
- **路径**：`/mahjong/game/{gameId}/operations`
- **功能描述**：返回当前玩家可执行动作，带安全校验。

#### 入参

| 字段 | 位置 | 必填 | 类型 | 说明 |
|---|---|---:|---|---|
| `gameId` | path | 是 | string | 牌局 ID |
| `playerId` | query | 是 | string | 玩家 ID |
| `seat` | query | 否 | int | 座位号，建议前端传这个 |
| `playerPosition` | query | 否 | int | 兼容旧字段 |

#### 出参字段

- `turnPhase`
- `actionWindow`
- `currentPlayer`
- `turnDeadlineAt`
- `lastDiscardedTile`
- `discardableTiles`
- `canPong`
- `chowableTiles`
- `kongableTiles`
- `kongOperations`
- `canWin`
- `canPass`
- `activePriority`
- `viewerAutoManaged`

> 前端建议：
> - 自己的操作按钮全部以这个接口为准
> - 不要靠前端自己推导吃碰杠胡

---

### 4.14 查询当前可执行动作（兼容旧路径）

- **方法**：`GET`
- **路径**：`/mahjong/game/{gameId}/operations/{playerPosition}`
- **功能描述**：兼容旧接口，能力与上面一致。

#### 入参

| 字段 | 位置 | 必填 | 类型 | 说明 |
|---|---|---:|---|---|
| `gameId` | path | 是 | string | 牌局 ID |
| `playerPosition` | path | 是 | int | 座位号 |
| `playerId` | query | 是 | string | 玩家 ID |

---

## 5. 结算对象说明

当前 `roundSettlement` 已经可以给前端直接用于结算弹窗。

### 5.1 `roundSettlement` 顶层字段

- `settlementType`: `WIN` / `DRAW`
- `finishReason`: `SELF_DRAW` / `DISCARD_WIN` / `WALL_EMPTY`
- `winnerPosition`
- `discardFromPosition`
- `selfDrawn`
- `fan`
- `winInfo`
- `summary`
- `players`

### 5.2 `roundSettlement.players[]` 字段

- `playerId`
- `playerName`
- `position`
- `winner`
- `dealer`
- `handTileCount`
- `handTiles`
- `discardedTiles`
- `pongTiles`
- `chowTiles`
- `kongTiles`
- `winType`
- `winFan`
- `scoreDelta`

> 说明：当前已实现基础结算 DTO；下一阶段会继续增强“多局累计分 / 庄家延续 / 房间级总战绩”。

---

## 6. 当前已经实现的“下一局重开”能力

当前已实现完整链路：

1. 本局胡牌或流局，房间状态进入 `FINISHED`
2. 玩家再次调用 `/room/{roomId}/ready`
3. 房间回到 `WAITING`
4. 已结束旧局 `currentGameId` 被清理
5. 全员重新准备后，房主再次调用 `/room/{roomId}/start`
6. 创建全新 `gameId` 的下一局

前端表现建议：

- 看到房间 `status = FINISHED` 且 `room.currentGameId` 仍存在时：展示结算页
- 看到结算后有人重新准备、房间回到 `WAITING` 且 `currentGameId = null` 时：切到“下一局准备中”状态
- 等房主重新 `start` 后，用新 `currentGameId` 进入下一局

---

## 7. WebSocket 已实现能力

### 7.1 已实现订阅主题

- 大厅：`/topic/lobby/rooms`
- 房间：`/topic/room/{roomId}`
- 对局：`/topic/game/{gameId}`
- 系统回包：`/user/queue/system`

### 7.2 已实现系统消息

客户端发送：

- `/app/system/auth`
- `/app/system/ping`
- `/app/system/reconnect-snapshot`

系统事件：

- `AUTH_SUCCESS`
- `AUTH_FAILED`
- `PONG`
- `RECONNECT_SNAPSHOT`
- `ERROR`

### 7.3 已实现房间/牌局事件

大厅事件：

- `ROOM_LIST_UPDATED`

房间事件：

- `PLAYER_JOINED`
- `PLAYER_LEFT`
- `PLAYER_READY`
- `GAME_STARTED`
- `ROUND_SETTLED`

麻将事件：

- `DEAL_COMPLETED`
- `TILE_DISCARDED`
- `ACTION_WINDOW_UPDATED`
- `TILE_DRAWN`
- `PONG_COMPLETED`
- `CHOW_COMPLETED`
- `KONG_COMPLETED`
- `ROUND_SETTLED`

### 7.4 当前实时消息通用包结构

```json
{
  "scene": "mahjong",
  "event": "TILE_DISCARDED",
  "traceId": "uuid",
  "timestamp": 1710000000000,
  "success": true,
  "message": "tile discarded",
  "roomId": "room_xxx",
  "gameId": "game_xxx",
  "gameCode": "SHANDONG_MAHJONG",
  "payload": {}
}
```

### 7.5 当前实时 `payload` 里常见字段

- `roomSnapshot`
- `gameSnapshot`
- `playerId`
- `playerPosition`
- `tile`
- `tiles`
- `kongType`
- `winInfo`
- `roundSettlement`
- `operatorPlayerId`
- `ready`
- `autoManaged`
- `timeoutAuto`
- `autoPassedPositions`

---

## 8. 麻将断线重连已实现能力

客户端发到：`/app/system/reconnect-snapshot`

### 入参

```json
{
  "scene": "system",
  "event": "RECONNECT_SNAPSHOT",
  "traceId": "uuid",
  "timestamp": 1710000000000,
  "payload": {
    "roomId": "room_xxx",
    "knownGameId": "game_old_xxx"
  }
}
```

### 出参 `payload`

- `roomSnapshot`
- `gameSnapshot`
- `viewerPlayerId`
- `viewerPosition`
- `knownGameId`
- `gameChanged`
- `pendingActions`

### 当前行为

- 若仍在原局中：返回当前牌局脱敏快照
- 若房间已切换到新牌局：`gameChanged = true`
- 若上一局已结束、当前正在重新准备下一局：
  - `gameChanged = true`
  - `gameSnapshot = null`
  - `roomSnapshot.room.status = WAITING`

---

## 9. 当前前端可以直接依赖的字段/功能

前端当前可以直接依赖：

- 房间状态：`WAITING / PLAYING / FINISHED / DISMISSED`
- 牌局回合阶段：`WAITING / WAITING_FOR_DRAW / WAITING_FOR_DISCARD / WAITING_FOR_RESPONSE / FINISHED`
- 玩家托管标记：`autoManaged`
- 回合倒计时：`turnDeadlineAt`
- 结算对象：`roundSettlement`
- 操作能力接口：`operations`
- 下一局重开链路：`ready -> start`
- WebSocket 结算广播与房间列表联动

---

## 10. 当前前端暂时不要假设已经有的能力

以下能力当前还**没有完全做成最终版**：

- 多局累计总分
- 庄家延续规则透出
- 整个房间的大结算对象
- 战绩持久化
- 回放
- 够级正式联机 controller

---

## 11. 前端联调建议顺序

### 第一阶段

先对接：

- `/room/list`
- `/room/create`
- `/room/{roomId}`
- `/room/{roomId}/join`
- `/room/{roomId}/leave`
- `/room/{roomId}/ready`
- `/room/{roomId}/start`

### 第二阶段

进入麻将桌面后对接：

- `/mahjong/game/{gameId}`
- `/mahjong/game/{gameId}/operations`
- `/mahjong/game/{gameId}/discard`
- `/mahjong/game/{gameId}/draw`
- `/mahjong/game/{gameId}/pong`
- `/mahjong/game/{gameId}/chow`
- `/mahjong/game/{gameId}/kong`
- `/mahjong/game/{gameId}/win`
- `/mahjong/game/{gameId}/pass`

### 第三阶段

接入实时：

- `/ws`
- `/topic/lobby/rooms`
- `/topic/room/{roomId}`
- `/topic/game/{gameId}`
- `/app/system/auth`
- `/app/system/ping`
- `/app/system/reconnect-snapshot`

---

## 12. 一句话结论

> 当前山东麻将已经不是只有规则引擎，而是已经具备：房间联机、正式动作接口、基础结算、超时托管、断线快照、下一局重开的一整套可联调能力。

