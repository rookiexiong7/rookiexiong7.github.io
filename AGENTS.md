# Blog 写作规则

修改或新增 `site/posts/` 下的博文时，遵守以下长期偏好；当前用户的明确要求优先。

- 每篇博文必须独立、完整，读者无需阅读本站其他博文即可理解。正文不引用、不链接本站其他博文，也不使用“前文”“上一篇”“已有解读”等依赖其他文章的表达。需要的背景直接在本篇说明。
- `References` 只列实际引用的论文条目，优先使用论文标题、原始论文链接、版本和发布日期。不要额外列“论文全文与图表”、项目主页、模型主页、GitHub 代码仓库、数据集主页或“代码与公开材料”等资源入口。
- 配图的原论文来源可以保留在对应图注中；这不需要在 `References` 重复添加全文或图表入口。
- 沿用现有文章的元数据、作者与单位、Motivation → Insight → Method → Experiments → Conclusion → References 结构。核对原文版本、实验条件、数字和局限，区分论文结果与推测。
- 完成后运行 `npm run check` 和 `npm run build`，检查正文中没有其他博文链接，References 中没有上述资源入口。
- 博客首页是“精选”，文章仅在用户选定后才设置 `featured: true`；新增文章默认只进入所属栏目。栏目使用加入博客的 `date` 进行日期筛选，保留标签和关键词筛选能力。
- 标签统一使用“Embodied AI”“Agents & Self-Improvement”“World Models”“Vision & Spatial Understanding”“Image & Video Generation”五类，每篇按主要问题选择 1–2 个。不要把模型名、工具名、任务细节或同义术语新增为标签；这些写入不展示的 `keywords` 元数据供搜索使用。只有用户明确要求扩展主题分类时才新增标签。

写作模板为 `site/posts/writing-template.md`，本地预览与发布流程见 `README.md`。
