---
title: (1 条消息) berts-vits2声音克隆+roop换脸+sadtalker声音驱动嘴型（原创）
date: "2023-12-07 00:00:00"
updated: "2023-12-07 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/berts-vits2声音克隆-roop换脸-sadtalker声音驱动嘴型(原创)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/670203996
---


先看效果视频，这是中国影视演员朱一龙的脸加上原神中上野的语音。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1aff68820312.jpg)01:07

换脸+声音克隆+语音驱动嘴型

这里用到了以下三个开源项目，（1）声音的克隆bert-vits2，（2）换脸 roop，（3）语音驱动嘴型。

一、首先是语音克隆项目，bert-vits2，这个项目的语音克隆效果较为不错。可惜的是只有中文和日语，没有英文的克隆。来感受下bert-vits2的效果。

下面是原神一名女生的原始语音：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a44f60505c23.jpg)00:05

然后是bert-vits2的克隆声音

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_642500a44288.jpg)00:11

下面介绍利用bert-vits2来进行语音克隆的步骤，即如何通过特定人物的声音训练一个语音模型：

（1）安装好所有的CUDA、pytorch环境，安装好bert-vits2工程，这个过程网上都有教程，不再赘述。

（2）下载bert-vits2依赖的bert模型，一共有三个，分别是deberta-v2-large-japanese、deberta-v3-large、chinese-roberta-wwm-ext-large，把这三个模型从huggingface网站下载下来，放到bert-vits2-master/bert/文件夹里。另外，最好下载底模，供后续训练使用。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_241938185d26.jpg)

（模型地址：

中文模型：[https://huggingface.co/hfl/chinese-roberta-wwm-ext-large/tree/main](https://link.zhihu.com/?target=https%3A//huggingface.co/hfl/chinese-roberta-wwm-ext-large/tree/main)

英文模型：[https://huggingface.co/microsoft/deberta-v3-large/tree/main](https://link.zhihu.com/?target=https%3A//huggingface.co/microsoft/deberta-v3-large/tree/main)

日文模型：[https://huggingface.co/ku-nlp/deberta-v2-large-japanese/tree/main](https://link.zhihu.com/?target=https%3A//huggingface.co/ku-nlp/deberta-v2-large-japanese/tree/main)

底模地址：https://openi.pcl.ac.cn/Stardust_minus/Bert-VITS2/modelmanage/model_readme_tmpl?name=Bert-VITS2%E4%B8%AD%E6%97%A5%E5%BA%95%E6%A8%A1

）

（3）下载训练的音频数据，这里用的是《原神》这款游戏的人物语音数据集。原始的数据集长下面这样子。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a6cc4f5a494f.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8cb3ca249553.jpg)

每一个人物一个文件夹，然后每个人物文件夹里分别对应一个wav文件和lab文件，wav文件是人物的说话语音文件，lab文件是语音文件的标注文字。例如下图是lab文件的内容。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_22cc79e36cf0.jpg)

lab文件的内容（4）然后，我们要开始根据这些训练数据集。首先我们要把训练数据集中的lab文件转换成bert-vits2要求的训练格式。bert-vits2要求的格式参考bert-vits2-master/filelists目录下的esd.list,里面的内容如下：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_643a1fcfc36c.jpg)

文件名称|说话人物名称|语言（例如中文就是ZH）|说话的内容

原始的训练数据，存放在 bert-vits2/raw/yuanshen 目录下，把生成的新标注文件放在bert-vits2-master/filelists目录下，名称为genshin_out.txt。

标注的代码如下：

import os

out_file = f"filelists/genshin_out.txt"

```python
def process():
    rootPathName='./raw/yuanshen'
    dirNames = os.listdir(rootPathName)
    with open(out_file,'w' , encoding="Utf-8") as wf:
        for ch_name in dirNames:
            ch_language = 'ZH'
            path = f"./raw/yuanshen/{ch_name}"
            files = os.listdir(path)
            for f in files:
                if f.endswith(".lab"):
                    with open(os.path.join(path,f),'r', encoding="utf-8") as perFile:
                        line = perFile.readline() 
                        result = f"./resampled/yuanshen/{ch_name}/{f.split('.')[0]}.wav|{ch_name}|{ch_language}|{line}"
                        wf.write(f"{result}\n")
```


if __name__ == "__main__":
    process()`

查看生成后的标注文件genshin_out.txt，里面的内容如下：

./resampled/yuanshen/上野/vo_EQYX001_5_ueno_05.wav|上野|ZH|这不是鳐鱼三番队的著名怪人矢部吗？
./resampled/yuanshen/上野/vo_EQYX001_5_ueno_06.wav|上野|ZH|你别把自己搭上了。到时候还得让我们出人力去救你。
./resampled/yuanshen/上野/vo_EQYX001_7_ueno_01.wav|上野|ZH|在下名叫上野，是剑鱼一番队的代理队长。这次是下来保护伤员撤离，同时尽力辅助这位调查渊下宫异状的。
./resampled/yuanshen/上野/vo_EQYX001_7_ueno_02.wav|上野|ZH|之后剑鱼一番队会稍作休整，然后开始行动。那么我先告退了。
./resampled/yuanshen/公主/vo_YYWQ003_6_princess_01.wav|公主|ZH|难道策士并不像他吹嘘的有手段，可现在我又该用什么计谋保卫王国平安？
./resampled/yuanshen/公主/vo_YYWQ005_1_princess_06.wav|公主|ZH|你的话语的确有理，且待我将他们的言行逐一回忆。
./resampled/yuanshen/公主/vo_YYWQ001_3_princess_01.wav|公主|ZH|为了守护王国，我将亲自讨伐这吞噬梦想的恶龙。
./resampled/yuanshen/公主/vo_YYWQ001_3_princess_02.wav|公主|ZH|是什么让您出尔反尔，忘记您曾经的教诲：不要放弃崇高）`

（5）打开bert-vits2-master下的config.ymal文件，里面的内容如下：

# 全局配置
# 对于希望在同一时间使用多个配置文件的情况，例如两个GPU同时跑两个训练集：通过环境变量指定配置文件，不指定则默认为./config.yml

# 拟提供通用路径配置，统一存放数据，避免数据放得很乱
# 每个数据集与其对应的模型存放至统一路径下，后续所有的路径配置均为相对于datasetPath的路径
# 不填或者填空则路径为相对于项目根目录的路径
dataset_path: "./"

# 模型镜像源，默认huggingface，使用openi镜像源需指定openi_token
mirror: ""
openi_token: ""  # openi token

# resample 音频重采样配置
# 注意， “:” 后需要加空格
resample:
  # 目标重采样率
  sampling_rate: 44100
  # 音频文件输入路径，重采样会将该路径下所有.wav音频文件重采样
  # 请填入相对于datasetPath的相对路径
  in_dir: "raw/yuanshen" # 相对于根目录的路径为 /datasetPath/in_dir
  # 音频文件重采样后输出路径
  out_dir: "resampled/yuanshen"

# preprocess_text 数据集预处理相关配置
# 注意， “:” 后需要加空格
preprocess_text:
  # 原始文本文件路径，文本格式应为{wav_path}|{speaker_name}|{language}|{text}。
  transcription_path: "filelists/genshin_out.txt"
  # 数据清洗后文本路径，可以不填。不填则将在原始文本目录生成
  cleaned_path: ""
  # 训练集路径
  train_path: "filelists/train.list"
  # 验证集路径
  val_path: "filelists/val.list"
  # 配置文件路径
  config_path: "configs/config.json"
  # 每个speaker的验证集条数
  val_per_spk: 4
  # 验证集最大条数，多于的会被截断并放到训练集中
  max_val_total: 8
  # 是否进行数据清洗
  clean: true

# bert_gen 相关配置
# 注意， “:” 后需要加空格
bert_gen:
  # 训练数据集配置文件路径
  config_path: "configs/config.json"
  # 并行数
  num_processes: 4
  # 使用设备：可选项 "cuda" 显卡推理，"cpu" cpu推理
  # 该选项同时决定了get_bert_feature的默认设备
  device: "cuda"
  # 使用多卡推理
  use_multi_device: false

# train 训练配置
# 注意， “:” 后需要加空格
train_ms:
  # 需要加载的环境变量，多显卡训练时RANK请手动在环境变量填写
  # 环境变量对应名称环境变量不存在时加载，也就是说手动添加的环境变量优先级更高，会覆盖本配置文件
  env:
    MASTER_ADDR: "localhost"
    MASTER_PORT: 10086
    WORLD_SIZE: 1
    RANK: 0
    # 可以填写任意名的环境变量
    # THE_ENV_VAR_YOU_NEED_TO_USE: "1234567"
  # 底模设置
  base:
    use_base_model: true
    repo_id: "Stardust_minus/Bert-VITS2"
    model_image: "Bert-VITS2中日英底模-fix" # openi网页的模型名
  # 训练模型存储目录：与旧版本的区别，原先数据集是存放在logs/model_name下的，现在改为统一存放在Data/你的数据集/models下
  model: "models"
  # 配置文件路径
  config_path: "configs/config.json"

# webui webui配置
# 注意， “:” 后需要加空格
webui:
  # 推理设备
  device: "cuda"
  # 模型路径
  model: "models/G_20000.pth"
  # 配置文件路径
  config_path: "configs/config.json"
  # 端口号
  port: 7860
  # 是否公开部署，对外网开放
  share: false
  # 是否开启debug模式
  debug: false
  # 语种识别库，可选langid, fastlid
  language_identification_library: "langid"

# server api配置
# 注意， “:” 后需要加空格
# 注意，本配置下的所有配置均为相对于根目录的路径
server:
  # 端口号
  port: 5000
  # 模型默认使用设备：但是当前并没有实现这个配置。
  device: "cuda"
  # 需要加载的所有模型的配置
  # 注意，所有模型都必须正确配置model与config的路径，空路径会导致加载错误。
  models:
    - # 模型的路径
      model: ""
      # 模型config.json的路径
      config: ""
      # 模型使用设备，若填写则会覆盖默认配置
      device: "cuda"
      # 模型默认使用的语言
      language: "ZH"
      # 模型人物默认参数
      # 不必填写所有人物，不填的使用默认值
      # 暂时不用填写，当前尚未实现按人区分配置
      speakers:
        - speaker: "科比"
          sdp_ratio: 0.2
          noise_scale: 0.6
          noise_scale_w: 0.8
          length_scale: 1
        - speaker: "五条悟"
          sdp_ratio: 0.3
          noise_scale: 0.7
          noise_scale_w: 0.8
          length_scale: 0.5
        - speaker: "安倍晋三"
          sdp_ratio: 0.2
          noise_scale: 0.6
          noise_scale_w: 0.8
          length_scale: 1.2
    - # 模型的路径
      model: ""
      # 模型config.json的路径
      config: ""
      # 模型使用设备，若填写则会覆盖默认配置
      device: "cpu"
      # 模型默认使用的语言
      language: "JP"
      # 模型人物默认参数
      # 不必填写所有人物，不填的使用默认值
      speakers: [ ] # 也可以不填

# 百度翻译开放平台 api配置
# api接入文档 https://api.fanyi.baidu.com/doc/21
# 请不要在github等网站公开分享你的app id 与 key
translate:
  # 你的APPID
  "app_key": ""
  # 你的密钥
  "secret_key": ""`

几个比较重要的参数需要配置，dataset_path设置为""或"./"

resample表示音频重采样，里面的in_dir要输入原始音频的路径，我的原始音频放在工程根目录bert-vits2-master的raw/yuanshen目录下，所以in_dir:"raw/yuanshen"。out_dir表示重采样输出后的音频目录，路径为"resampled/yuanshen"。采样率默认44100。

然后在根目录下运行 python resample.py，在resampled/yuanshen目录下的每个人物目录里面会有重采样的音频文件。

preprocess_text是生成训练需要的train.txt和val.txt，同时对数据进行清理。transcription_path设置为"filelists/genshin_out.txt"，clean设置为true。

然后在根目录下运行 python preprocess_text.py，在bert-vits2-master的filelists目录下会生成genshin_out.txt.cleaned、train.txt和val.txt。train.txt和val.txt的内容如下：

./resampled/yuanshen/上野/vo_EQYX001_5_ueno_05.wav|上野|ZH|这不是鳐鱼三番队的著名怪人矢部吗?|_ zh e b u sh ir y ao y v s an f an d ui d e zh u m ing g uai r en sh ir b u m a ? _|0 4 4 2 2 4 4 2 2 2 2 1 1 1 1 4 4 5 5 4 4 2 2 4 4 2 2 3 3 4 4 5 5 0 0|1 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 1 1
./resampled/yuanshen/公主/vo_YYWQ005_1_princess_02.wav|公主|ZH|恶龙定下的期限就要过去,而我却没有达成此行的目的.|_ EE e l ong d ing x ia d e q i x ian j iu y ao g uo q v , EE er w o q ve m ei y ou d a ch eng c i0 x ing d e m u d i . _|0 4 4 2 2 4 4 4 4 5 5 1 1 4 4 4 4 4 4 4 4 5 5 0 2 2 3 3 4 4 2 2 3 3 2 2 2 2 3 3 2 2 5 5 4 4 5 5 0 0|1 2 2 2 2 2 2 2 2 2 2 2 1 2 2 2 2 2 2 2 2 2 2 2 2 1 1
./resampled/yuanshen/公主/vo_YYWQ001_7_princess_02.wav|公主|ZH|哦!看来是我愚钝,对这样的流行从未听闻.|_ OO o ! k an l ai sh ir w o y v d un , d ui zh e y ang d e l iu x ing c ong w ei t ing w en . _|0 5 5 0 4 4 2 2 4 4 3 3 2 2 4 4 0 4 4 4 4 4 4 5 5 2 2 2 2 2 2 4 4 1 1 2 2 0 0|1 2 1 2 2 2 2 2 2 1 2 2 2 2 2 2 2 2 2 2 1 1
./resampled/yuanshen/公主/vo_YYWQ003_6_princess_04.wav|公主|ZH|而本该在岗的守卫也影踪全无,城门大开竟无人守护.|_ EE er b en g ai z ai g ang d e sh ou w ei y E y ing z ong q van w u , ch eng m en d a k ai j ing w u r en sh ou h u . _|0 2 2 3 3 1 1 4 4 3 3 5 5 3 3 4 4 2 2 3 3 1 1 2 2 2 2 0 2 2 2 2 4 4 1 1 4 4 2 2 2 2 3 3 4 4 0 0|1 2 2 2 2 2 2 2 2 2 2 2 2 2 1 2 2 2 2 2 2 2 2 2 1 1
./resampled/yuanshen/公主/vo_YYWQ003_3_princess_02.wav|公主|ZH|多亏忠诚的侍从早早把握了恶龙的行踪,我们这才掌握了主动.|_ d uo k ui zh ong ch eng d e sh ir c ong z ao z ao b a w o l e EE e l ong d e x ing z ong , w o m en zh e c ai zh ang w o l e zh u d ong . _|0 1 1 1 1 1 1 2 2 5 5 4 4 2 2 2 2 3 3 3 3 4 4 5 5 4 4 2 2 5 5 2 2 1 1 0 3 3 5 5 4 4 2 2 3 3 4 4 5 5 3 3 4 4 0 0|1 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 1 2 2 2 2 2 2 2 2 2 1 1
./resampled/yuanshen/公主/vo_YYWQ005_1_princess_03.wav|公主|ZH|富有盛名的勇者们轮番向恶龙发起挑战,到头来各个都无功而返.|_ f u y ou sh eng m ing d e y ong zh e m en l un f an x iang EE e l ong f a q i t iao zh an , d ao t ou l ai g e g e d ou w u g ong EE er f an . _|0 4 4 3 3 4 4 2 2 5 5 2 2 3 3 5 5 2 2 1 1 4 4 4 4 2 2 1 1 3 3 3 3 4 4 0 4 4 2 2 2 2 4 4 5 5 1 1 2 2 1 1 2 2 3 3 0 0|1 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 1 2 2 2 2 2 2 2 2 2 2 1 1`

然后是bert_gen的参数配置，将config_path设置为训练的配置文件config.json所在的路径，一般是“config/config.json”。如果有英伟达显卡，device设置为"CUDA"，否则设置为"CPU"。我们打开bert-vits2-master下的config文件夹下的config.json文件。找到"data"字段内容如下：

  "data": {
    "training_files": "filelists/train.list",
    "validation_files": "filelists/val.list",
    "max_wav_value": 32768.0,
    "sampling_rate": 44100,
    "filter_length": 2048,
    "hop_length": 512,
    "win_length": 2048,
    "n_mel_channels": 128,
    "mel_fmin": 0.0,
    "mel_fmax": null,
    "add_blank": true,
    "n_speakers": 5,
    "cleaned_text": true,

```text
    "spk2id": {
      "上野": 0,
      "公主": 1,
      "勤奋的武士": 2,
      "卡莉娜": 3,
      "麦娜尔": 4
    }
  },`
```


其中，trainning_files和validation_files的内容就是之前preprocess_text环节生成的train.txt和val.txt路经。

"spk2id"里面输入说话人的名字，注意，这些名字必须和你的训练集里面的创建的人物文件夹的名字保持一致。最后是n_speakers参数，表示一共有几个人的语音数据集，必须和"spk2id"里面的人物数量保持一致。

配置完这个config.json文件后，运行python bert_gen.py。在resampled/yuanshen的每个人物的文件夹内有.pt文件。如下图：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e4dfb48172b8.jpg)

接着是train_ms阶段，在base字段里，选择要不要使用底模（这个底模相当于深度学习种的预训练模型），如何需要设置use_base_model为true，并填写底模的路径地址。 model字段设置为 "models"，表示生成的模型保存在bert-vits2-master/models路径下。运行python train_ms.py 完成训练。训练的时间有点久，5个人物语音用P40需要半天时间。

训练完成后，在bert-vits2-master/models路径下会保存 ".pth"文件。如下图所示，我们需要用到的是G_数字.pth文件。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_40f2508b07f8.jpg)

保存的训练文件

最后是webui阶段。我们配置如下：

webui:
  # 推理设备
  device: "cuda"
  # 模型路径
  model: "models/G_20000.pth"
  # 配置文件路径
  config_path: "configs/config.json"
  # 端口号
  port: 7860
  # 是否公开部署，对外网开放
  share: false
  # 是否开启debug模式
  debug: false
  # 语种识别库，可选langid, fastlid
  language_identification_library: "langid"`

我们可以在bert-vits2根目录下运行python webui.py，会弹出网页。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_bfc1546a8e18.jpg)

语音克隆的网页端页面可以输入文本，选择人物，让人物说话了。

二、roop换脸

用摄像头拍一段自己的视频，最好是正脸，嘴巴微微张开一点点。从github上下载roop工程[https://github.com/s0md3v/roop](https://link.zhihu.com/?target=https%3A//github.com/s0md3v/roop)

准备好原始视频，例如myface.avi，放在roop工程目录下。

准备好人脸突破，例如 朱一龙.jpg，放在roop工程目录下。

生成的视频名称为 output.avi

在roop工程目录下运行

python run.py -s     朱一龙.jpg    -t myface.avi -o output.avi，就能工程目录下生成output.avi。

三、SadTalker-Video-Lip-Sync-master 声音驱动嘴型

从github上下载SadTalker-Video-Lip-Sync-master。[https://github.com/Zz-ww/SadTalker-Video-Lip-Sync](https://link.zhihu.com/?target=https%3A//github.com/Zz-ww/SadTalker-Video-Lip-Sync)

安装好工程。

下载各类预训练的模型到checkpoints文件夹:

百度网盘：https://pan.baidu.com/s/15-zjk64SGQnRT9qIduTe2A  提取码：klfv

谷歌网盘：https://drive.google.com/file/d/1lW4mf5YNtS4MAD7ZkAauDDWp2N3_Qzs7/view?usp=sharing

夸克网盘：夸克网盘分享  提取码：zMBP

然后准备好（1）说话人的语音文件，audio.wav，（2）原始人物的视频video.mp4

在工程目录下运行

```text
python inference.py --driven_audio  \

                    --source_video  \

                    --enhancer  \  #(默认lip)

                    --use_DAIN \ #(使用该功能会占用较大显存和消耗较多时间)

             		--time_step 0.5 #(插帧频率，默认0.5，即25fps—>50fps;0.25,即25fps—>100fps)
```


就能在results文件夹下生成最终的结果了。
