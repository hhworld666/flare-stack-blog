# HH's Blog 内容迁移暂存区

这里暂存从旧 Astro 项目整理的 Markdown 内容，供新站首次迁移使用。Flare Stack Blog 不会读取本目录；新站发布后的文章会由网页后台保存到 Cloudflare D1。

## 当前内容

- `markdown/`：旧站的 6 篇文章。`site-technology-stack.md` 已按 Flare Stack Blog 和 Cloudflare Workers 重写；其他文章仍保留原文，导入前会检查链接和旧技术名词。
- `../public/images/site-architecture.svg`、`../public/images/site-release-flow.svg`：新版技术架构与发布流程图，供技术文章使用。

迁移时计划先在 Flare 后台创建为草稿，检查排版、图片、分类和标签后再发布。正文里的 `/images/...` 图片由新站公开静态资源提供；若改用后台媒体库，则上传后会存入 R2。

## 从零开始的数据范围

新站使用全新的 D1、用户和评论数据。旧 Supabase 的账号、访客资料、评论和浏览量都不导入。旧站继续保留，直到测试子域名上的 Flare 站点通过检查。

本目录是一次性迁移材料，不是新站日常写作位置。以后写文章直接登录 Flare 后台，不需要编辑 Markdown 或推送 GitHub。
