# 上游与素材来源

本项目在以下固定版本的 MIT 程序代码上增加丛雨角色、点击语音、收藏与语音库、气泡、宿主跟随等功能：

| 用途 | 来源 | 固定提交 |
|---|---|---|
| DSH 插件基线 0.4.2 | https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget | `5247dd6813d6e4430728f39ccc63d43cda046022` |
| Codex 桌宠基线 0.4.1 | https://github.com/Yang-huai406/Codex-Whale-Public | `4a7ec1240de82527f2222b4af5202fa7b2ad731b` |

`npm run setup` 拉取并核对这些固定提交，不会把用户的其他工作区作为上游。原 MIT 文本保留在 `licenses/`，构建产物也保留上游的 LICENSE 和 PROVENANCE。

当前完整丛雨版附带立绘和 503 段点击语音；来源和许可边界见 [角色素材说明](../character-pack/素材说明.md)。角色、游戏美术与声音素材不适用程序代码的 MIT 许可。AI 配音模型不在包内，也不是桌宠播放所需文件。

个人设置、宿主账号、聊天记录、模型、日志与构建目录均不纳入 Git 版本控制。GPT 和 DSH 的本地偏好与导入库互相独立。
