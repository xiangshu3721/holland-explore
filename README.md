# 霍兰德兴趣探索

从你自然喜欢的事情里，发现自己与世界互动的方式。

纯静态 H5（HTML / CSS / 原生 JS），GitHub Pages 从 `main` 根目录发布。不调用任何 AI 接口，不含任何 Key。作答和历史仍在本机浏览器。结果出来后会自动把结构化兴趣结果提交一次；「分享结果」只复制 `https://xiangshu3721.github.io/mindtest-web/r/#{id}.{secret}`。开放题原文（第 1 题和「其他」填写）不上传。

## 文件
- `index.html` 页面结构（首页含昵称 / 作答说明 / 作答 / 三个探索问题 / 结果 / 历史）
- `js/questions.js` 题库 V2.0（60 项，逐字照规则，`{id, dimension, text, block, version:"RIASEC_V2"}`）
- `js/content.js` **全部文案**（规则原文 + 补写内容，以后改字只改这里）
- `js/engine.js` 计分与结构判断（自定阈值写在文件头注释里）
- `js/report.js` 按结果 + 第 3 题生成动态报告模型
- `js/render.js` 页面渲染（自绘 SVG 图标、六边形、雷达图）
- `js/export.js` Canvas 导出长图
- `js/app.js` 流程、进度保存、历史、导出
- `js/cloud-config.js` 报告服务公开地址（无密钥）
- `js/cloud-client.js` 提交号、短链、失败后重试
- `js/cloud-payload.js` 云端协议。作答是题库顺序 Q01–Q60 的 60 个整数，不含开放题
- `js/cloud-share.js` 结果页自动提交一次，「分享结果」复制短链
- `js/cloud-payload.test.mjs`、`js/cloud-share.test.mjs` 协议与分享行为

更新资源后记得同步修改 `index.html` 里的 `?v=` 版本号。
