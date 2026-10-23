# 上游与本机基线

最新进展：Codex 固定上游现已用于 `scripts/build-gpt.mjs`，使用独立项目数据目录运行；官方剩余额度、窗口跟随与本机任务监测已接通。DSH 正式端也已更新并验收点击余额。以下早期“不运行/不部署”段落描述首次基线检查当时的状态，已由 `docs/GPT_PARITY.md` 的最新记录取代。

2026-10-20 通过 Git 克隆并固定以下提交：

| 用途 | 来源 | 固定提交 | 许可 |
|---|---|---|---|
| DSH 插件基线 0.4.2 | https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget | `5247dd6813d6e4430728f39ccc63d43cda046022` | MIT |
| Codex 桌宠参考 0.4.1 | https://github.com/Yang-huai406/Codex-Whale-Public | `4a7ec1240de82527f2222b4af5202fa7b2ad731b` | MIT |

上游完整源码位于本机 `upstream/`，目录被 Git 忽略，避免嵌套仓库与无审查的整体发布。DSH 构建保留上游 LICENSE、PROVENANCE 和原功能，仅增加点击事件、语音模块和经过原信任校验的本地资源路由。

本机已有 `desktop`、`web`、`ai-work` 三个 Harness profile，desktop 已装 dsh-whale-widget 0.4.2；用户角色库中已有 murasame 角色。开发没有读取凭据文件，也没有替换正在使用的插件。

独立 Windows 初版采用 Electron，仅用于与 ChatGPT/Codex 同屏使用，尚未实现跟随窗口、任务状态或订阅额度接入。没有将 Codex 参考仓库整体运行或安装，因为其中包含账户、额度等超过当前最小桌宠所需的功能。
