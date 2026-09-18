---
title: MCP协议技术文档
date: 2026-08-21
tags: [MCP, Model-Context-Protocol, AI-Agent, LLM, JSON-RPC]
description: MCP 是 Anthropic 发布的开放协议，用于标准化大语言模型与外部数据源、工具的连接。本文梳理其核心架构、JSON-RPC 消息格式、stdio 与 Streamable HTTP 传输、连接生命周期与开发示例。
---

> 版本：1.0
> 日期：2026-08-21
> 主题：Model Context Protocol（模型上下文协议）原理与实践

---


### 目录



1. 协议概述
2. 核心架构
3. 传输协议
4. 连接生命周期
5. 完整调用示例
6. Server 开发示例
7. 客户端配置
8. 附录

---


### 1. 协议概述




#### 1.1 什么是 MCP



MCP（Model Context Protocol，模型上下文协议） 是由 Anthropic 于 2024 年 11 月发布的开放协议，旨在标准化大语言模型（LLM）与外部数据源、工具之间的连接方式。

MCP 常被比喻为 "AI 应用的 USB-C 接口"——如同 USB-C 统一了设备连接方式，MCP 统一了 AI 模型与外部世界的交互标准。


#### 1.2 解决的问题：M×N 问题



| 阶段     | 集成方式                                        | 复杂度 |
| -------- | ----------------------------------------------- | ------ |
| MCP 之前 | M 个 AI 应用 × N 个数据源，各自定制集成         | M × N  |
| MCP 之后 | 数据源实现一次 MCP 协议，所有兼容客户端均可使用 | M + N  |


#### 1.3 三大核心能力



| 能力                  | 说明                 | 典型用途           |
| --------------------- | -------------------- | ------------------ |
| Resources（资源） | 向模型暴露数据和内容 | 文件、数据库记录   |
| Tools（工具）     | 让模型执行操作       | 查询 API、发送消息 |
| Prompts（提示）   | 提供预定义的提示模板 | 标准化工作流       |


#### 1.4 典型应用场景



- 连接本地文件系统和数据库
- 集成 GitHub、Slack、Google Workspace 等工具
- 让 AI 助手操作浏览器、执行代码
- 企业内部知识库检索


#### 1.5 生态发展



MCP 已获得业界广泛支持，OpenAI、Google、Microsoft 等主要 AI 厂商均宣布支持或兼容该协议，正在成为 AI 工具生态的事实标准之一。

---


### 2. 核心架构



MCP 采用客户端-服务器架构，包含三个核心角色：


```
┌─────────────────┐    stdio / Streamable HTTP    ┌──────────────────────┐
│  MCP Host（宿主） │ ◄────── JSON-RPC 消息 ──────► │  MCP Server（服务器）  │
│  如 Claude Desktop│                               │  提供工具与数据        │
│  ┌─────────────┐ │                               └──────────┬───────────┘
│  │ MCP Client  │ │                                          │
│  └─────────────┘ │                                          ▼
└─────────────────┘                                   调用真实外部资源
        ▲                                              （API/数据库/文件）
        │ 工具结果回传
        ▼
     LLM 决策
```


| 角色           | 职责                                           |
| -------------- | ---------------------------------------------- |
| MCP Host   | AI 应用本体（Claude Desktop、IDE、CLI 工具等） |
| MCP Client | 宿主内负责与服务器保持连接、转发消息的组件     |
| MCP Server | 提供具体工具、资源和提示模板的服务进程         |

关键点：LLM 不直接连接 MCP Server。LLM 只负责"决定"调用什么工具，实际执行由 MCP Client 与 Server 完成，结果再回传给 LLM 生成最终回答。

---


### 3. 传输协议




#### 3.1 消息格式：JSON-RPC 2.0



MCP 不是基于普通 HTTP REST，所有通信统一采用 JSON-RPC 2.0 消息格式。

请求示例：
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```


响应示例：
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { "...": "..." }
}
```


通知（无需响应）示例：
```json
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized"
}
```



#### 3.2 两种传输方式




#### （1）stdio（标准输入输出）—— 本地场景



- 服务器作为本地子进程运行
- 通过进程的 stdin/stdout 交换 JSON-RPC 消息
- 优点：性能好、无需网络、数据不出本机（安全性高）


#### （2）Streamable HTTP —— 远程场景（2025年新规范）



- 基于 HTTP，用于连接远程服务器
- 客户端通过 HTTP POST 发送请求
- 响应可以是普通 JSON，或升级为 SSE（Server-Sent Events）流，支持流式输出和服务端主动推送
- 取代旧规范中的 "HTTP + SSE" 双端点设计

```http
POST /mcp
Content-Type: application/json

{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "...": "..."}
```



#### 3.3 与 REST API 的对比



| 特性     | REST API     | MCP                                              |
| -------- | ------------ | ------------------------------------------------ |
| 消息格式 | 自由定义     | 标准化 JSON-RPC                                  |
| 交互模式 | 多为单向请求 | 双向通信，服务器也可发起请求                 |
| 状态管理 | 无状态       | 有状态会话                                       |
| 能力发现 | 需要文档     | 协议内置 tools/list、resources/list 动态发现 |

---


### 4. 连接生命周期




```
┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   ┌────────────┐
│  initialize  │ → │  initialized │ → │    正常通信        │ → │ disconnect │
│  握手+能力协商│   │   确认通知    │   │ 调用工具/读取资源  │   │   断开连接  │
└──────────────┘   └──────────────┘   └──────────────────┘   └────────────┘
```


1. initialize：客户端发起握手，交换协议版本与双方能力
2. initialized：客户端发送确认通知
3. 正常通信：发现工具、调用工具、读取资源等
4. disconnect：会话结束，断开连接

---


### 5. 完整调用示例



> 场景：本机 CLI 客户端调用一个"天气查询"MCP Server


```
┌─────────────────┐    stdio (stdin/stdout)    ┌──────────────────────┐
│  本机 CLI 客户端  │ ◄──────JSON-RPC消息──────► │  MCP Server (本地进程) │
│  (MCP Host)      │                            │  weather-server      │
└─────────────────┘                            └──────────┬───────────┘
                                                          │
                                                          ▼
                                                  调用真实天气API
```



#### 步骤一：Initialize 握手



客户端 → 服务器（stdin 写入）：
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-03-26",
    "capabilities": {},
    "clientInfo": { "name": "my-cli", "version": "1.0.0" }
  }
}
```


服务器响应（stdout 返回）：
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2025-03-26",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": { "name": "weather-server", "version": "1.2.0" }
  }
}
```


客户端发送确认通知：
```json
{ "jsonrpc": "2.0", "method": "notifications/initialized" }
```



#### 步骤二：发现可用工具



请求：
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```


响应：
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "get_weather",
        "description": "查询指定城市的当前天气",
        "inputSchema": {
          "type": "object",
          "properties": {
            "city": { "type": "string", "description": "城市名称，如 Beijing" }
          },
          "required": ["city"]
        }
      }
    ]
  }
}
```



#### 步骤三：调用工具



用户输入"北京今天天气怎么样？"，LLM 决定调用 get_weather：

请求：
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_weather",
    "arguments": {
      "city": "Beijing"
    }
  }
}
```


服务器内部处理：收到消息 → 调用真实天气 API → 封装结果返回

响应：
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "北京当前天气：晴，气温 28°C，湿度 45%，东南风 2级"
      }
    ]
  }
}
```



#### 步骤四：LLM 生成最终回答



CLI 将工具结果作为上下文交给 LLM，输出给用户：

> "北京今天天气晴朗，气温 28 度，比较舒适，湿度适中，微风，适合外出活动 🌤️"

---


### 6. Server 开发示例




#### Python 最小可运行实现（基于 FastMCP SDK）



```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("weather-server")

@mcp.tool()
def get_weather(city: str) -> str:
    """查询指定城市的当前天气"""
    # 实际项目中这里调用真实天气API
    return f"{city}当前天气：晴，气温 28°C"

if __name__ == "__main__":
    mcp.run(transport="stdio")  # 以 stdio 方式运行
```


说明：
- @mcp.tool() 装饰器自动从函数签名生成 JSON Schema
- transport="stdio" 适合本地部署；远程部署可改为 Streamable HTTP，消息格式完全一致
- docstring 会自动作为工具的 description 暴露给 LLM

---


### 7. 客户端配置



以 Claude Desktop 为例，在配置文件中注册本地 MCP Server：

```json
{
  "mcpServers": {
    "weather": {
      "command": "python",
      "args": ["/path/to/weather_server.py"]
    }
  }
}
```


远程服务器（Streamable HTTP）的配置形式：

```json
{
  "mcpServers": {
    "weather-remote": {
      "url": "https://api.example.com/mcp"
    }
  }
}
```


---


### 8. 附录




#### 8.1 常用 JSON-RPC 方法速查



| 方法                        | 方向          | 说明                                  |
| --------------------------- | ------------- | ------------------------------------- |
| initialize                | 客户端→服务器 | 握手，交换版本与能力                  |
| notifications/initialized | 客户端→服务器 | 确认初始化完成                        |
| tools/list                | 客户端→服务器 | 获取工具列表                          |
| tools/call                | 客户端→服务器 | 调用指定工具                          |
| resources/list            | 客户端→服务器 | 获取资源列表                          |
| resources/read            | 客户端→服务器 | 读取指定资源                          |
| prompts/list              | 客户端→服务器 | 获取提示模板列表                      |
| sampling/createMessage    | 服务器→客户端 | 服务器请求 LLM 采样（双向通信的体现） |


#### 8.2 关键要点总结



1. 消息层统一：所有通信基于 JSON-RPC 2.0
2. 传输层灵活：本地用 stdio（安全、高性能），远程用 Streamable HTTP（支持 SSE 流式）
3. 动态发现：客户端无需预知工具清单，运行时通过 tools/list 动态获取
4. 双向有状态：服务器也能向客户端发起请求，区别于传统无状态 REST
5. LLM 解耦：LLM 只做决策，MCP 负责执行，结果回传后由 LLM 生成最终回答


#### 8.3 参考资料



- MCP 官方规范与文档：modelcontextprotocol.io
- MCP 官方 SDK：Python、TypeScript 等多语言实现
- JSON-RPC 2.0 规范：jsonrpc.org


---

本文档基于 MCP 协议 2025-03-26 版规范整理，如有协议更新请以官方文档为准。
