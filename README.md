# Zhixiong Zhang · Homepage & Blog

主页源文件仍是 `index.html` 和 `jemdoc.css`。Blog 使用 Eleventy 将 Markdown 构建为静态 HTML，发布在 `/blog/`。Git 只保存源码；生成的页面与 KaTeX 字体通过 GitHub Actions artifact 部署，不提交到仓库。

Blog 共用主页的 `jemdoc.css`，顶部导航在构建时从 `index.html` 复用。列表和正文使用居中单栏布局，不显示个人资料侧栏；`site/assets/blog.css` 补充文章、分类和搜索的样式。

## 本地预览

需要 Node.js 22 或更新版本。

```sh
npm ci
npm run dev
```

打开终端显示的本地地址，首页导航的最后一项 Blog 直接进入 `/blog/`。主页不展示文章列表；Blog 需要通过构建预览。

```sh
npm test       # 实际构建验证：分页、草稿、公式、链接、索引、附件限制
npm run build # 发布内容在 _site/，不会进入 Git
```

## 写一篇文章

复制 `site/posts/writing-template.md`，使用英文短横线文件名，例如 `site/posts/2026/reading-sec.md`。可以按年份分目录，但文件名在整个 posts 目录下必须唯一。URL 始终是 `/blog/posts/reading-sec/`，移动年份目录不会改变链接。

```yaml
---
title: "SeC：从概念构建到视频分割"
date: "2026-10-07"
category: papers
summary: "用一两句话介绍这篇笔记讨论的问题。"
tags: [Segmentation, Vision-Language Models]
draft: true
paper: https://arxiv.org/abs/2507.15852
# cover: /blog/assets/reading-sec/cover.webp
---
```

- `category` 使用 `papers`（论文解读）、`research`（研究笔记）或 `notes`（随记）。
- `date` 是加入博客的日期；论文另填 `paperDate: "2026-09-28"`，记录本文所引用版本的发布日期。列表先按加入日期倒序，同一天再按论文发布日期倒序；未填写论文日期的排在当天已填写的文章之后，日期相同则按文件名排序。总列表、分类、搜索和 RSS 共用这一顺序。
- 完成正文后改为 `draft: false`。草稿和未来日期不会生成文章页面，也不会进入列表、分类、搜索或 RSS。日期按 UTC 判断；未来文章需要到日期后再次运行构建才会发布。
- 不要将秘密或私人材料提交到公开仓库；草稿只是不发布网页，Git 中的源码仍可见。
- 支持 Markdown 表格、代码块、标题锚点和 `$...$` / `$$...$$` 公式；公式在构建时渲染。正文中的原始 HTML 默认禁用。
- 首页仅在导航中提供 Blog 入口；总列表和分类每页 10 篇。搜索按需加载标题、摘要和标签，正文不打包进搜索索引。RSS 保留最新 20 篇。
- 论文笔记存放在 `site/posts/2026/`；写作模板默认是草稿，不会进入文章列表。

## 控制仓库体积

文章数量与 Git 体积不是一回事：例如 1,000 篇每篇 20 KB 的 Markdown，正文总量约 20 MB；1,000 份每份 10 MB 的 PDF 则约 10 GB，修改后的二进制版本还会继续累积在历史中。

| 内容 | 存放位置 | 限制 / 原则 |
| --- | --- | --- |
| Markdown 正文 | `site/posts/`，可按年份分目录 | 每篇不超过 256 KB |
| 封面、小图 | `site/assets/<文章名>/` | 图片不超过 300 KB；SVG 不超过 100 KB；优先 WebP / AVIF |
| 论文原文 | arXiv、DOI、会议官网原始链接 | 不复制 PDF 进 Blog |
| 视频、大图、附件 | 外部对象存储，例如 R2 / OSS / S3；发布附件也可用 GitHub Releases | 在文章里引用稳定的公开 HTTPS URL；Releases 不作为图片 CDN |
| 临时论文、原图 | `blog-local/` | 已忽略，仅供本地整理，不会构建或部署 |
| HTML、搜索索引、依赖字体 | `_site/` | 已忽略，仅部署 artifact，不写回 Git 分支 |
| Node 依赖 | `node_modules/` | 已忽略，只提交版本锁定文件 |

`npm run check` 和 CI 会拒绝 Blog 中的 PDF、视频、压缩包、模型权重、超限图片及已跟踪的构建目录。检查范围是新 Blog，不改动既有论文项目。CI 失败不会清除已经提交的大文件历史；提交前请先运行检查。

本次检查中，现有 `projects/SeC/assets/demo.mp4` 约 46 MB，`projects/SetCon/setcon.png` 约 18 MB，Git 对象约 154 MB。它们是现有仓库体积的主要来源之一，本次没有搬迁或重写历史。之后如要瘦身，可先迁移视频、压缩大图；仅删除工作区文件不会缩小已有 Git 历史。历史清理需要单独安排，避免影响现有 clone 和协作。

暂时无需 Git LFS、数据库或单独内容仓库。未来若需要高频批量发布、独立权限或上万篇文章，可把 `site/posts/` 拆到单独内容仓库，在 CI 中浅克隆到该目录；不要把完整生成站点提交到主页仓库。只有真正拆分存储和历史才会隔离 Git 成本，单纯换分支不会。

## GitHub Pages 发布

首次启用时，将仓库 **Settings → Pages → Build and deployment → Source** 设为 **GitHub Actions**。提交这些改动后，`main` 上的推送会运行 `.github/workflows/pages.yml`：检查、测试、构建，再发布 `_site/`。PR 只做构建检查，不部署。也可以在 Actions 中手动运行 “Build and deploy website”。

原有 Google Scholar 引用更新 workflow 保持独立。发布只复制主页、原有 `data/`、`projects/`、`static/`、`cv.pdf` 和 Blog 构建结果，不会把本地简历草稿、`tmp/`、写作指南或未发布的 Markdown 带到站点。

本地修改不等于线上发布：需将提交推送到远端，并完成上述 Pages 设置。

## 依赖检查记录

本次构建与功能测试通过。Markdown 和 KaTeX 已更新到检查时的当前版本；`npm audit` 仍报告 Eleventy 上游构建依赖的 9 项告警（5 high、4 moderate），涉及文件匹配及格式字符串处理。它们用于本地 / CI 构建，不随静态站点部署；构建输入应来自可信的仓库源码。审计工具建议的强制降级不是兼容修复，因此没有执行。后续可随 Eleventy 更新重新检查。
