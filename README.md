# 小丛雨 · GPT 版 / Project Murasame

Windows 上的非官方丛雨聊天工作伙伴。现已包含用户确认的丛雨立绘和现有 503 段语音，运行初始化后即可使用。素材来源与许可边界见 [角色素材说明](character-pack/素材说明.md)。AI 配音模型不属于桌宠播放所需文件，未包含。

## 2026-10-25 显示修复

恢复 GPT 额度气泡中 5 小时及每周额度的重置时间，保留原字号，并调整内容位置与间距，防止日期和刷新按钮溢出白色气泡。已检查 250 / 350 / 500 像素宽度及左右翻转。

已有安装可在项目目录运行 `git pull --ff-only`，然后重新执行 `npm run build:gpt` 并重启丛雨；收藏和个人设置仍保存在本地。构建后执行 `npm run test:quota-layout`，可用隔离测试数据验证实际 SVG 白色气泡边界、重置时间及按钮布局，不读取真实账号额度。

## 功能

- 点击一次播放一段。随机不重复、按顺序、单段循环三种模式；循环由每次点击推进，不是自动连续播放。
- 编号选定与取消选定、最近播放、逐段启用/禁用、收藏夹播放。
- 整体导入本地 MP3/WAV/OGG/M4A 语音库，自然数字排序；库重命名、切换与删除。每库分别保存收藏和播放偏好，导入前逐个解码验证。
- 自定义角色图、音量、大小、气泡自动消失、提醒开关。
- GPT/Codex 版读取剩余订阅额度，Windows 窗口跟随与托盘生命周期；DSH 版显示 API 余额、右键切换设置菜单。

## 环境与构建

Windows（本机验证为 Windows 11）、Node.js 24 或更高、Git。先运行下面命令（会下载固定版本的两个上游源码和 npm 依赖）：

```powershell
npm ci
npm run setup
npm run init:assets
npm test
```

`init:assets` 将 `character-pack/` 中的丛雨立绘与 503 段语音复制到本地运行目录；不覆盖已有角色和个人设置。旧版空语音库会初始化为完整内置库。设置仍存放在被 Git 忽略的 `private-assets/`。

### GPT / Codex / Work

```powershell
npm run build:gpt
npm run gpt
```

目前窗口跟随面向 Windows Codex / Work 客户端，不能保证所有名为 ChatGPT 的客户端版本都兼容。额度来自当前客户端账号的只读接口，不代表 API 余额。读取失败会显示不可用，不推算额度。关闭到托盘与彻底退出客户端是不同状态。

此版本的浮动角色由本地伴随进程承载。MCP 内联面板源码在 `packages/chatgpt-plugin/`，宿主不支持画中画时仍为内联；它不是 ChatGPT 官方 Pets 集成。

### DeepSeek Harness

```powershell
npm run build:dsh -- --local-assets
```

构建产物为 `dist/dsh-murasame-local/`，插件 ID 保持 `dsh-whale-widget` 以兼容上游。可通过 DSH 本地插件管理加载构建目录；已有原版安装可用 `node scripts/install-dsh.mjs <插件绝对目录>`。该安装器先核对上游文件哈希并备份；遇到其他修改会拒绝覆盖。升级本项目安装时使用上次 receipt 的 `--upgrade` 路径，不能强行跳过校验。加载后重启 DSH 才生效。

### 更换素材

在角色菜单导入图片；在语音页展开“语音库”，选择一整套文件。单库上限 512 MB；支持格式取决于 Chromium 解码支持。导入文件保存在该应用本地 IndexedDB；GPT 与 DSH 的存储互相独立，不会自动同步。删除库会删除该应用内的副本，原文件不受影响。建议先备份素材。

若希望构建时自带自己的图片，可替换本地 `private-assets/character.png`。不要把个人模型、游戏素材、账号文件或日志提交到 GitHub。

## 测试范围与限制

`npm test` 是逻辑与静态约束测试；集成安装测试需要先有固定上游和本地构建，缺少时会跳过。`scripts/verify-dsh-ui.mjs` 和 `scripts/verify-gpt-desktop.mjs --parity` 是隔离夹具中的 UI 验证；使用本地完整素材的回归与空库公开版不是相同场景。视频中的额度为测试数据，不能视为真实账号读数。音频解码测试不等同于逐段人工试听。

本次完整发布包含丛雨立绘及 503 段语音，不包含 TTS 权重、个人账号与聊天记录。角色和声音素材不适用 MIT 程序许可。也可以自行更换角色和整套语音库。此工具不修改宿主安装文件。

## 来源与许可

代码基于两个 MIT 上游，固定提交和原许可见 [UPSTREAM.md](docs/UPSTREAM.md) 与 `licenses/`。本项目代码增量按 MIT 提供。丛雨角色、《千恋＊万花》相关图像和声音权利属于相应权利方，不因本项目代码许可而获得授权。非 YUZUSOFT、OpenAI 或 DeepSeek 官方项目。

介绍视频采用用户本地 LemonQu/Murasame_SoVITS 模型生成的日语合成旁白，中文字幕为人工编写的对应译文；TTS 模型另有其发布者的使用条件，未包含在仓库内。
