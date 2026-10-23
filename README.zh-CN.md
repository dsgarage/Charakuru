<p align="center"><img src="docs/images/readme-hero.png" alt="Charakuru：AI 角色建模套件，由 Tripo 赞助" width="100%"></p>

<h1 align="center">Charakuru / きゃらくる</h1>

<p align="center">从一张角色插画出发，与 AI Agent 分工合作，制作 VRM 角色。</p>

<p align="center"><a href="README.md">English</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="docs/tutorial.zh-CN.md"><b>教程</b></a> · <a href="https://github.com/nanocle/Charakuru/releases">下载（Releases）</a> · <a href="docs/license.zh-CN.md">使用条款</a> · <a href="https://discord.gg/tripoai">Discord</a></p>

<p align="center"><img alt="版本" src="https://img.shields.io/badge/version-1.1.0-22d3ee"> <img alt="Node.js" src="https://img.shields.io/badge/Node.js-22%2B-5fa04e"> <img alt="输出" src="https://img.shields.io/badge/output-VRM%201.0-a78bfa"> <img alt="许可" src="https://img.shields.io/badge/license-source--available-64748b"></p>

## 加入 Discord 社区

Tripo 官方 Discord 已设立 **Charakuru 专属分类**。欢迎提问、反馈、展示使用 Charakuru 制作的角色，并与其他创作者及开发者 Nano（ナノ）交流。活动和比赛信息也会在此发布。

**[加入 Tripo 官方 Discord](https://discord.gg/tripoai)**，进入 Charakuru 专属分类即可。

## Charakuru 是什么

这是一个使用 Tripo Smart Mesh 的角色建模辅助套件，将 Nano 设计的制作流程打包为本地应用与 Agent Skills。您负责确认和选择，Agent 负责图片制作、Tripo 与 Blender 操作、绑定等复杂步骤。不必亲自操作 Blender，仅需使用本地应用中的基本控件。

准备一张有权使用的全身角色插画，即可开始制作 VRM。部分步骤仍需要人的判断，初次使用也可能需要学习；遇到困难欢迎通过 Issues 反馈。

> [!WARNING]
> **套件仍在开发中。** 存在错误、未完成的功能及尚未同步的文档。
>
> **文档由 AI 编写。** 可将解压后的文件夹交给 Codex 或 Claude Code 等编码 Agent，直接询问用法，例如：“阅读 README.zh-CN.md 和 AGENTS.md，用简体中文介绍套件并帮助我开始。”

<p align="center"><img src="docs/images/en/overview-strip.jpg" alt="原始插画、八张部位图、3D 模型与动作确认示例" width="100%"></p>
<p align="center"><sub>示例角色：海月みる（Miru Umitsuki）。此共用示意图的部分标注为英文。</sub></p>

## 如何使用

您会在**应用中确认**与**聊天中发出请求**之间切换。

1. 确认当前阶段后，点击继续按钮，复制显示的请求。
2. 粘贴到 Agent 聊天中并发送。仅复制不会开始工作。
3. Agent 完成后，应用自动载入结果，并停在下一个确认点。

标准流程为：**添加原图 → 确认八张部位图与三视图 → 选择头部和身体候选 → 调整头身比例 → 确认动作并导出 VRM**。

无需反复手动导出、导入或另存项目。候选模型由用户选择，Agent 不会自动越过确认点。候选比较窗口可旋转模型、显示线框并重新打开。调整比例时，三张参考图共用角色高度与脚底高度。纹理完成后更换候选，会创建独立项目副本并保留原件。

## 设计原则

- **您决定，Agent 执行。** 分割、分类、导出、注册和保存由 Agent 完成。
- **在确认点停止。** 需要视觉判断时，Agent 展示具体位置并询问。
- **一个项目主文件。** 同一 `project.charakit` 持续更新。同一文件夹再次启动应用可恢复项目。
- **在本机运行。** 无需 `npm install` 即可启动。图片生成和 Tripo 等外部服务使用您自己的账户。

## 所需环境

| 环境 | 用途 |
| --- | --- |
| Node.js 22 或更新版本 | 运行本地应用 |
| 桌面 Chromium 浏览器，例如 Chrome | 打开应用并复用登录状态 |
| 支持图片生成和浏览器控制的 Codex | 制作图片、操作 Tripo 和 Blender |
| 已在浏览器登录的 Tripo 账户 | 生成候选、重生成纹理和绑定 |
| Blender 5.2、VRM Add-on for Blender、Blender MCP | 权重、物理与 VRM 导出 |
| 有权使用的角色插画 | PNG / JPEG / WebP，最大 20 MB，建议全身图 |

外部服务的账户、条款与费用由用户自行管理。Agent 会在开始时检查并说明缺少的环境。

## 开始制作

1. 从 [Releases](https://github.com/nanocle/Charakuru/releases) 下载专用 **`charakuru-1.1.0-….zip`**，解压到可写文件夹。GitHub 自动生成的 Source code ZIP 不包含可运行套件。
2. 在 Codex 中打开解压文件夹并发送：

   ```text
   请阅读根目录 AGENTS.md，使用简体中文帮助我用此套件制作角色。
   ```

3. Agent 检查环境并启动应用后，打开终端显示的地址，通常为 `http://127.0.0.1:8766`。在设置的语言选项中选择 **简体中文**。

也可在解压目录执行 `npm start` 自行启动。详细步骤见 **[简体中文教程](docs/tutorial.zh-CN.md)**。

新请求使用 `begin` 命令，以避开 Windows Codex 对旧 `start` 参数与 URL 的误判。旧请求因 `blocked by policy` 被拒绝时，请从更新后的套件重新复制请求，参见教程中的故障排除。

## 套件内容

| 文件或文件夹 | 内容 |
| --- | --- |
| `AGENTS.md` | Agent 入口：环境、制作阶段和保存规则 |
| `public/`、`server.mjs` | 本地确认应用 |
| `skills/` | 项目、图片、Tripo、权重、物理等工作流程 |
| `scripts/` | Agent 用于操作与更新项目的脚本 |
| `assets/donor/weighted-body.blend` | 权重传递使用的基础模型 |
| `docs/` | 英语、日语、韩语、简体中文教程和用户文档 |

主要 Skills：`charakit-project`、`character-parts-images`、`character-three-views`、`character-material-brushup`、`tripo-agent-workflow`、`tripo-studio-download`、`avatar-weight-transfer`、`avatar-spring-setup`、`tripo-character-setup`。Agent 根据当前阶段阅读所需资料。技术标识、命令、路径和用户素材名称保持原文。

## 当前限制

- 复制请求后，必须在聊天中粘贴并发送，工作时保持应用打开。
- 标准新角色为普通表情和固定视线。
- 动作确认会自动显示经过结构、MToon、纹理和各部位物理检查的 VRM；即使尚未填写模型信息，也会播放默认行走并启用物理。外观由用户判断。
- “导出 VRM”中确认模型名、作者与使用条件，点击“保存信息并导出”即可下载。保留已确认形状、材质与物理，信息随项目保存，无需另发 Agent 请求。
- 画面和请求支持英语、日语、韩语和简体中文。Agent 的说明、进度与结果使用所选语言。Tripo 页面优先使用相同语言，不支持时使用英语并说明。
- 移动制作项目时，请保留含 `exports` 的整个项目文件夹，包括完成的 VRM 与 Blend，而不只是 `project.charakit`。

## 使用条款

可在许可条件内用于非商业和商业用途，允许私人修改与复制。再分发套件，或将套件代码提供给用户的产品、服务集成，须事先联系 Nano。不得仅提取同捆素材带出套件或单独再分发。在法律允许范围内，许可方不对使用导致的损害承担责任。

若整个业务的年度收入与累计融资**均低于 1 亿日元**，可在标准许可范围内使用，无需另行签约或登记。若**任一达到 1 亿日元**，在开始或继续商业、业务使用前，须联系 Nano，并与许可方或授权代表另行签订书面许可协议。收入和融资不相加。

年度收入按**最近已结束会计年度**计算；无固定会计年度时采用此前十二个月，尚无已结束年度时采用开业以来实际收入且最多追溯十二个月。经营不足十二个月或首个会计年度较短时不年化。累计融资在获得资金时重新评估，不受会计年度限制。

详见[简体中文使用条款说明](docs/license.zh-CN.md)。正式许可为 [LICENSE 英文原文](LICENSE)，翻译不改变许可条件。

## 报告问题

请按照[报告指南](CONTRIBUTING.md)，在公开仓库的 [Issues](https://github.com/nanocle/Charakuru/issues) 报告错误或建议。欢迎使用英语、日语、韩语或简体中文。不接受 Pull Request。

<p align="center"><sub>Made by Nano（ナノ） · sponsored by Tripo</sub></p>
