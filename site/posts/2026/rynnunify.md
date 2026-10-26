---
title: "RynnUnify：把具身理解、视频预测与机器人控制接到同一基础模型上"
date: "2026-10-26"
paperDate: "2026-10-23"
category: papers
summary: "RynnUnify 用一个 8B 自回归推理器与一个 8B 视频生成器连接具身理解和长时程视觉规划，再分别通过强化学习与机器人后训练扩展到按需视频推演和动作控制。本文梳理这三种模型形态、跨片段记忆与 self-forcing 的作用，并核对视觉规划、生成增强推理及机器人实验真正支持了哪些结论。"
tags: ["Embodied AI", "World Models"]
keywords: ["RynnUnify", "Unified Multimodal Models", "Visual Planning", "Generation-Enhanced Understanding", "World-Action Model", "Robot Control", "Video-Language Reasoning"]
draft: false
paper: https://arxiv.org/abs/2610.32965v1
cover: /blog/assets/rynnunify/overview.webp
---

作者：Minghao Zhu、Bohan Hou、Kun Xiang、Zixuan Wang、Yinzhou Tang、Yifei Yang、Zhikai Wang、Tianyi Zhang、Kehan Li、Haoyu Zhao、Siteng Huang、Leigang Qu、Sicong Leng、Dongchi Huang、Mingxiu Chen、Shijian Lu、Yue Wang、Xiaodan Liang、Zhenyu Zeng、Deli Zhao、Chengju Liu、Jianfei Yang、Xin Li

**单位：** DAMO Academy, Alibaba Group、Hupan Lab

## 1. Motivation：具身模型需要预测世界，还是只需要学会行动？

面对“把鼠标和笔记本装进包里”这样的多步任务，模型不仅要识别物体和当前状态，还要决定先做什么、预测操作后的场景，再据此规划下一步。语言规划可以给出合理步骤，却不一定保留物体位置、遮挡和状态变化；视频世界模型可以展示未来，却未必知道哪段未来与任务有关；动作策略能够直接控制机器人，又可能缺少显式的长时程任务分解。

RynnUnify 的研究问题是：能否让**理解、视觉预测和行动共享同一组基础表示**？论文先构建一个 16B 统一多模态模型，将 8B 自回归推理器与 8B 视频生成器连接起来；随后沿两条不同路径扩展它：

1. 额外训练一个 8B agent，让它判断问题应直接回答，还是调用冻结的视频生成器先“看一段可能的未来”；
2. 将完整模型后训练为 World-Action Model（WAM），让动作头读取视频生成器的内部特征并输出机器人动作。

这三种形态不能混为一个结果。基础 RynnUnify 负责理解与视觉规划，agentic extension 负责选择性生成辅助推理，WAM extension 则经过专门机器人数据与动作监督后负责控制。论文展示的是同一基础模型可以被这两类扩展利用，而不是一个完全不经适配的 16B 模型同时完成所有任务。

[![RynnUnify 覆盖具身理解、长时程视觉规划、生成增强推理与机器人控制](/blog/assets/rynnunify/overview.webp)](/blog/assets/rynnunify/overview.webp)

*图 1. RynnUnify 的四组能力与代表性结果。图源：原论文 Figure 1。*

## 2. Insight：视频预测的价值不在于“多想一步”，而在于生成可被后续推理读取的状态

### 2.1 规划与视频必须交替，而不是各做一次

如果先生成完整语言计划，再一次性生成长视频，后半段无法利用前面实际生成出的场景变化。RynnUnify 改为逐子任务循环：推理器根据目标、初始观察、当前观察和历史步骤提出下一个子任务，同时写出视觉变化描述与预计时长；生成器预测这一步的视频；视频末帧再成为下一轮规划的当前观察。

这使视频不只是展示结果，而是进入下一步决策的中间状态。不过，它也引入新的误差链：一次生成中的物体漂移或几何错误，会被下一轮当作事实继续推理。论文的跨片段记忆和 self-forcing 都是在处理这种闭环分布偏移。

### 2.2 “总是生成”并不比直接推理更可靠

生成视频会增加计算量，也可能制造错误证据。Rynn-GEU 实验中，BAGEL、RxBrain 与 Cosmos 3 Nano 加入 interleaved rollout 后，平均分分别从 11.9、31.4、37.3 降至 10.8、28.6、33.5。视频预测只有在动力学、几何和任务相关性足够可靠时才可能帮助回答。

因此，agent 的关键能力不是会调用生成器，而是学习**何时值得调用**。论文让 direct branch 与 generation-assisted branch 回答同一批问题，用两条路径的平均奖励差训练软路由；推理时 agent 自主选择直接回答或生成视频后再回答。这比固定的“先生成再推理”更接近工具使用问题。

### 2.3 WAM 使用的是预测表征，不是把渲染视频当成动作脚本

WAM 中，推理器输出连续的子任务 latent，生成器据此建模未来视频，动作头再通过 cross-attention 读取生成器 36 层的隐藏状态。推理时系统只做一次视频去噪步骤来提取特征，复用这些特征完成动作采样；它并不是先渲染一段完整视频，再把视频逐帧翻译成动作。

这一区别决定了实验能够支持的结论：结果说明视频预测网络的内部表示可以为动作头提供有效条件，但不能单独证明“可观看的视频规划”本身就是机器人成功率提升的原因。

## 3. Method：从统一模型到按需推演，再到动作控制

### 3.1 16B 基础模型：推理器与生成器通过联合注意力连接

RynnUnify 沿用 Cosmos 3 的 Mixture-of-Transformers 架构，由参数独立的自回归推理器和 rectified-flow 视频生成器组成，两者通过 joint attention 交互。推理器处理语言、图像和视频，输出具身理解、空间推理、物理预测、空间定位，以及子任务与视频提示；生成器接收这些文本表示和视觉条件，预测连续视频 latent。

[![RynnUnify 的统一架构与跨片段场景记忆](/blog/assets/rynnunify/architecture.webp)](/blog/assets/rynnunify/architecture.webp)

*图 2. 统一架构、三种生成模式与跨片段场景记忆。图源：原论文 Figure 2。*

为保持长时程一致性，生成器同时接收两类历史：

- **稀疏场景记忆：** 四张独立编码的参考帧，包括固定的初始观察、两张历史关键帧和最近步骤参考；
- **连续运动前缀：** 上一视频片段的尾部，直接放在当前视频时间轴开头，保留最近动作与交互上下文。

模型支持 I2V、首尾帧约束的 FL2V，以及跨片段自回归续写。训练时首先微调推理器，监督具身理解、空间定位、子任务预测和结构化视频提示；随后冻结推理器，只训练生成器。按共享片段只计一次、时长不含重复训练曝光的表内口径，视频生成数据共 1,083,458 个片段、约 1,370.1 小时，覆盖人类与机器人操作、空间和物理推理等来源。

仅用真值历史训练，会让生成器在测试时不适应自己的错误输出。论文采用三种 self-forcing 条件扰动：给起始帧加噪声或模糊；用离线生成片段的末帧替换真值起点；同时用生成结果替换历史视频和当前起点。当前片段的未来真值仍作为监督目标，因此这里的 self-forcing 是让条件更接近推理时分布，而不是让模型直接以自己的未来作为标签。

### 3.2 Agentic RL：同时学习两条推理路径和 D/G 路由

[![Agent 在直接回答与调用冻结视频生成器之间选择](/blog/assets/rynnunify/agentic-rl.webp)](/blog/assets/rynnunify/agentic-rl.webp)

*图 3. Agentic RL 同时优化路径内推理和 Direct/Generate 路由，只更新额外的 8B agent。图源：原论文 Figure 4。*

论文从微调后的 8B 推理器初始化 agent，并提出 Branch-Conditional Policy Optimization（BCPO）。对于可路由问题，每次采样四条直接回答轨迹与四条生成辅助轨迹：路径内部用序列级 GSPO 比较奖励，路径之间则根据平均奖励 $mu_G-mu_D$ 构造调用生成器的软目标：

$$
q_G(x)=\operatorname{sigmoid}\left(\frac{\mu_G-\mu_D}{T_{\mathrm{route}}}\right).
$$

奖励同时要求交互格式有效和最终答案正确。训练使用 22,007 个问题，执行一个 epoch；视频生成器和参考策略保持冻结。这样可以把“是否生成”与“怎样提出生成请求、怎样解释结果”放进同一个最终答案反馈中，但奖励并没有直接验证生成视频是否物理正确。

### 3.3 WAM：用视频隐藏状态预测动作块

[![RynnUnify 通过视频生成器的内部状态连接动作头](/blog/assets/rynnunify/wam.webp)](/blog/assets/rynnunify/wam.webp)

*图 4. WAM 从任务、视觉历史和当前多视角观察得到子任务 latent、视频表征与动作块。图源：原论文 Figure 5。*

机器人适配使用 RoboCasa365 约 1,600 小时原子任务轨迹和 177 小时复合任务轨迹，分三阶段训练：先用子任务与技能标注训练推理器；再冻结推理器，以视频和原生动作监督训练生成器；最后保持推理器与原动作输出层冻结，联合训练生成器和新的 18-block 动作头，并加入相机位姿辅助监督。

动作头预测 $48\times12$ 的动作块，覆盖 2.4 秒；推理时用 16 次 Euler 步采样，并只执行前 16 个动作后重新观察。视觉历史最多包含 12 张图像，因此这里的闭环来自动作块执行后的重新决策，而不是一次性完成整个长任务。

## 4. Experiments：系统级提升清楚，组件归因仍有限

### 4.1 基础理解：在统一多模态模型中领先，不是所有模型中最高

基础 RynnUnify 不调用生成器或 RL agent，在 10 个具身认知与定位指标上的无权平均分为 57.9，高于 Cosmos 3 Nano 的 53.2，并在 10 项中的 6 项领先其他统一多模态模型。若把专门理解模型也纳入比较，RynnBrain-8B 的平均分为 61.2；因此论文支持的是“所比较 UMM 中最高”，不能扩大为所有具身模型中的绝对最好。

### 4.2 长时程视觉规划：提高了任务进展，但评估仍是 simulator-free

Rynn-VP 包含 200 个手工收集的第一视角任务。模型从初始图像与任务指令出发，最多生成 15 个步骤。GPT-6-sol 在 Codex harness 中依据保留的成功演示和子任务标注，对 Planning Intelligence（PI）、Visual Realization（VR）和 Visual Quality（VQ）评分，综合分为：

$$
\mathrm{Score}_{\mathrm{Rynn\text{-}VP}}=0.5\,\mathrm{PI}+0.4\,\mathrm{VR}+0.1\,\mathrm{VQ}.
$$

| 方法 | 输出 | PI | VR | VQ | 综合分 |
| --- | --- | ---: | ---: | ---: | ---: |
| GPT-5.6 Terra + MiniMax-H3 | 视频 | 59.82 | 69.56 | 79.73 | 65.71 |
| Cosmos 3 Nano | 视频 | 30.50 | 54.58 | 79.69 | 45.05 |
| RynnUnify | 视频 | 45.66 | 60.54 | 77.53 | 54.80 |

RynnUnify 相比 Cosmos 3 Nano 提升 9.75 分，主要来自 PI 的 +15.16 和 VR 的 +5.96，VQ 反而低 2.16 分。这说明优势不只是单帧画质。但它仍低于组合系统的 65.71，BAGEL 与 RxBrain 又输出步骤图而非视频，输出模态并不完全一致。更重要的是，Rynn-VP 不在模拟器中执行计划；它测量生成轨迹中的可见进展与一致性，不能直接等同于物理任务成功率。

### 4.3 生成增强推理：平均提升 6 分，细粒度几何并未同步变好

Rynn-GEU 包含空间关系、物理预测、杂乱场景连锁反应、动作推理、affordance、区域和轨迹等 10 个子集。数据构建还使用 GPT-5.6-Luna 比较“有参考未来视频”和“无未来视频”的回答，优先保留未来证据更有帮助的样例；这使基准适合测试生成辅助推理，但也意味着样例分布经过特定模型筛选。

| 设置 | 公共推理基准均分 | Rynn-GEU 均分 |
| --- | ---: | ---: |
| RynnUnify 直接回答 | 41.3 | 44.0 |
| RynnUnify + Agentic Thinking | 44.6 | 50.0 |

Agentic Thinking 将 Rynn-GEU 提高 6.0 分，其中 Area 从 35.9 升至 66.2，Mess 从 8.5 升至 29.1。与此同时，Position、Distance 和 Size 分别从 38.5、52.9、57.0 降至 36.0、51.8、56.5。论文据此承认，预测视频中的细粒度几何失真仍会误导空间判断。平均分提升证明选择性调用在这一评测上有效，却不等于每类问题都应先生成视频。

### 4.4 机器人控制：仿真和真机都有收益，但属于专门后训练后的 WAM

在 RoboCasa365 上，完整复合任务分割与论文选定的 20 个移动操作任务给出了三组成功率：

| 方法 | Composite-Seen | Composite-Unseen | Selected-20 |
| --- | ---: | ---: | ---: |
| Cosmos 3 | 49.6 | 39.0 | 45.0 |
| Xiaomi-Robotics-1 | **57.1** | 32.1 | 46.0 |
| CMA | 50.6 | 44.0 | 47.0 |
| RynnUnify-WAM | 52.0 | **50.0** | **51.5** |

Selected-20 每个任务运行 10 次，共 200 个 episode；基线的该列来自作者统一评测，而完整分割中的基线数字来自已发表报告。RynnUnify-WAM 在 Composite-Unseen 与 Selected-20 领先，但 Composite-Seen 不是最高。

真机实验使用 Astribot S1，只覆盖 Turn-and-Grasp、Block Swapping、Bowl ×3 then Spoon 三个任务，每项 20 次。RynnUnify 的完整任务成功率分别为 55%、35% 和 50%，平均 46.7%，高于 GR00T N1.7 的 26.7% 与 $\pi_{0.5}$ 的 25.0%。样本量与任务覆盖仍较小，且各阶段成功率独立计分，不能用阶段分数推算整条轨迹的可靠性。

论文没有给出足以分别隔离场景记忆、self-forcing、时长预测、相机位姿辅助监督等因素的完整消融。因此，现有数字清楚支持整个 RynnUnify/WAM 系统优于相应基线，但不能把提升精确归因到某一个组件。

## 5. Conclusion

RynnUnify 最有价值的设计不是简单把语言模型、视频模型和动作头拼在一起，而是为三者建立了两种可训练接口：推理器用结构化子任务和世界变化描述条件化视频预测，动作头则从视频生成器的内部状态读取未来相关特征。跨片段记忆与 self-forcing 处理长时程预测中的状态漂移，BCPO 进一步把视频生成变成一种可以选择、不必强制调用的推理工具。

实验也给出了明确警告：生成证据可能降低其他模型的推理分数，RynnUnify 自身在细粒度空间问题上也会退步；Rynn-VP 的视觉评分尚未验证与真实执行成功率的对应关系；WAM 的机器人结果来自额外的大规模动作监督，而不是基础统一模型的零样本能力。

下一步最值得验证的是“视觉计划是否真的可执行”。可以在相同任务上同时记录 Rynn-VP 的 PI/VR、模拟器成功率与真机成功率，测量三者相关性；再固定机器人数据和计算预算，分别移除场景记忆、self-forcing、视频损失与相机位姿监督。这样才能判断统一视频表征究竟提供了可迁移的因果与几何信息，还是主要充当了一组容量更大的动作条件特征。

## References

- [RynnUnify: Towards Unified Embodied Brain](https://arxiv.org/abs/2610.32965v1), arXiv:2610.32965v1, October 23, 2026.
