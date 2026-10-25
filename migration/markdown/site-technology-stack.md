---
title: "本站的新技术架构：Flare Stack Blog 与 Cloudflare"
description: "记录 HH's Blog 从 Astro 静态站迁移到 Flare Stack Blog 后，文章编辑、数据存储和部署各由什么负责。"
pubDate: 2026-10-25
category: "网站与技术"
tags: ["Flare Stack Blog", "Cloudflare Workers", "建站记录"]
---

你好，这篇文章介绍本站的新技术架构。旧站使用 Astro、Cloudflare Pages 和 Supabase；新站改为使用 [Flare Stack Blog](https://github.com/du2333/flare-stack-blog)，由 Cloudflare Workers 运行网站和后台。

简单来说：我在网页后台写文章，Flare 将文章保存在 Cloudflare D1；访客访问时由 Worker 生成页面；图片放在 R2，缓存和异步通知由 Cloudflare 的其他服务配合处理。

## 一张图看懂新站

![HH's Blog 新站架构：后台编辑器与访客浏览器通过 Cloudflare Worker 访问 D1、R2、KV 和 Queues](/images/site-architecture.svg)

网站的主体是一套运行在 **Cloudflare Workers** 上的全栈应用。它同时处理公开页面、文章后台和数据接口，因此新站不再由 Astro 在本地预先生成所有文章页面。

## 写文章与发布

文章正文使用 TipTap 富文本编辑器编写。标题、摘要、分类、标签等信息在后台管理；未发布的内容先保存为草稿。点击发布后，系统生成公开内容快照，并更新站内搜索和公开缓存。

![在 Flare 后台编辑文章、发布到 D1，再由 Cloudflare Worker 向读者提供页面的流程](/images/site-release-flow.svg)

日常发布文章不需要修改网站代码，也不需要推送 GitHub。GitHub 保存的是博客程序和主题配置；文章内容由后台写入新站的数据库。

## 每个服务负责什么

| 部分 | 在本站的用途 |
| --- | --- |
| React、TanStack Start | 网站前台、管理后台和服务端渲染 |
| TipTap | 网页中的富文本文章编辑器，支持常用排版、图片、代码块和公式 |
| Cloudflare Workers | 运行页面、后台和数据接口 |
| Cloudflare D1 | 保存文章、用户、评论、分类、标签和搜索索引 |
| Cloudflare R2 | 保存文章图片、头像等媒体文件 |
| Cloudflare KV | 缓存公开内容及文章热度等数据 |
| Cloudflare Queues | 异步处理邮件和 Webhook 通知 |
| Durable Objects | 处理需要协调的请求限流等任务 |
| Better Auth | 提供账号注册、登录和 GitHub 登录 |

文章正文与读者互动数据都由新站的 Cloudflare 数据资源处理。旧 Supabase 中的读者账号、访客资料、评论和浏览量不会带到新站；读者需要在新站重新注册，评论也从零开始。新站评论会在提交后直接显示。

## 网站代码怎样更新

我会在自己的 GitHub 仓库中保存 Flare 程序。代码推送到生产分支后，Cloudflare Workers Builds 会运行构建和部署命令，再更新 Worker。这个流程用于更新网站程序；平常发表文章则直接在后台完成。

新站会先部署到测试子域名。确认首页、文章、账号、图片和评论都正常后，才会把 `hhworld666.com` 切换到新站。

## 为什么换成这套方案

- 可以直接在网页后台写作和发布，不必为了每篇文章修改 Markdown 文件或推送代码。
- 后台、账号、评论、搜索和媒体管理已经整合在一个系统中。
- 使用 Cloudflare 的托管服务，不需要自己维护一台常开服务器。
- 文章和媒体分别保存在 D1 与 R2，应用代码继续由 GitHub 管理。

这套方案的代价是网站不再是纯静态站：Cloudflare Worker、D1、R2 等资源都需要配置；系统更新时也需要关注 Flare 项目的版本说明。具体费用会受到 Cloudflare 套餐和资源用量影响。

以后我会在文章后台继续记录建站过程，也会逐步补上关于页面和其他个人内容。
