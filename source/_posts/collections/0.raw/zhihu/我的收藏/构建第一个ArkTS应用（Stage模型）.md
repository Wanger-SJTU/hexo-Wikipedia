---
title: (2 条消息) 构建第一个ArkTS应用（Stage模型）
date: "2024-06-20 00:00:00"
updated: "2024-06-20 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/构建第一个ArkTS应用(Stage模型)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/704562553
---


### 构建第一个ArkTS应用（Stage模型）

#### 创建ArkTS工程

-  若首次打开<strong>DevEco Studio</strong>，请点击<strong>Create Project</strong>创建工程。如果已经打开了一个工程，请在菜单栏选择<strong>File</strong> > <strong>New</strong> > <strong>Create Project</strong>来创建一个新工程。** 
-  选择Application<strong>应用开发（本文以应用开发为例，Atomic Service对应为原子化服务开发），选择模板“</strong>Empty Ability<strong>”，点击</strong>Next<strong>进行下一步配置。</strong> 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c95824cf8630.jpg)

点击放大

- 进入配置工程界面，Compile SDK<strong>选择“</strong>4.1.0(11)**”，其他参数保持默认设置即可。
其中<strong>Node</strong>用来配置当前工程运行的Node.js版本，可选择使用已有的Node.js或下载新的Node.js版本。


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e33eb13f6f9d.jpg)

点击放大

- 点击Finish**，工具会自动生成示例代码和相关资源，等待工程创建完成。

#### ArkTS工程目录结构（Stage模型）


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_96ed76f8a5a2.jpg)

img

- AppScope > app.json5**：应用的全局配置信息。
- <strong>entry</strong>：HarmonyOS工程模块，编译构建生成一个HAP包。
- <strong>src > main > ets</strong>：用于存放ArkTS源码。
- <strong>src > main > ets > entryability</strong>：应用/服务的入口。
- <strong>src > main > ets > pages</strong>：应用/服务包含的页面。
- <strong>src > main > resources</strong>：用于存放应用/服务所用到的资源文件，如图形、多媒体、字符串、布局文件等。关于资源文件，详见[资源分类与访问](https://link.zhihu.com/?target=https%3A//developer.huawei.com/consumer/cn/doc/harmonyos-guides/resource-categories-and-access-0000001774119914)。
- <strong>src > main > module.json5</strong>：模块配置文件。主要包含HAP包的配置信息、应用/服务在具体设备上的配置信息以及应用/服务的全局配置信息。具体的配置文件说明，详见[module.json5配置文件](https://link.zhihu.com/?target=https%3A//developer.huawei.com/consumer/cn/doc/harmonyos-guides/module-configuration-file-0000001820879553)。
- <strong>build-profile.json5</strong>：当前的模块信息 、编译信息配置项，包括buildOption、targets配置等。
- <strong>hvigorfile.ts</strong>：模块级编译构建任务脚本，开发者可以自定义相关任务和代码实现。
- <strong>obfuscation-rules.txt</strong>：混淆规则文件。混淆开启后，在使用Release模式进行编译时，会对代码进行编译、混淆及压缩处理，保护代码资产。详见[开启代码混淆](https://link.zhihu.com/?target=https%3A//developer.huawei.com/consumer/cn/doc/harmonyos-guides-V4/ide-build-obfuscation-0000001731754312-V4)。
- <strong>oh_modules</strong>：用于存放三方库依赖信息。
- <strong>build-profile.json5</strong>：应用级配置信息，包括签名signingConfigs、产品配置products等。其中products中可配置当前运行环境，默认为HarmonyOS。
- <strong>hvigorfile.ts</strong>：应用级编译构建任务脚本。

#### 构建第一个页面

- 使用文本组件。
工程同步完成后，在“<strong>Project</strong>”窗口，点击“<strong>entry > src > main > ets > pages</strong>”，打开“<strong>Index.ets</strong>”文件，可以看到页面由Text组件组成。“<strong>Index.ets</strong>”文件的示例如下：

// Index.ets   
@Entry    
@Component    

```text
struct Index {      
```

 @State message: string = 'Hello World'
 build() {
   Row() {

```text
     Column() {
       Text(this.message)
         .fontSize(50)
         .fontWeight(FontWeight.Bold)
     }
     .width('100%')
   }
   .height('100%')
 }
```

}  `

- 添加按钮。
在默认页面基础上，我们添加一个Button组件，作为按钮响应用户点击，从而实现跳转到另一个页面。“<strong>Index.ets</strong>”文件的示例如下：

// Index.ets    
@Entry    
@Component    

```text
struct Index {      
```

 @State message: string = 'Hello World'
 build() {
   Row() {

```text
     Column() {
       Text(this.message)
         .fontSize(50)
         .fontWeight(FontWeight.Bold)
       // 添加按钮，以响应用户点击
       Button() {
         Text('Next')
           .fontSize(30)
           .fontWeight(FontWeight.Bold)
       }
       .type(ButtonType.Capsule)
       .margin({
         top: 20
       })
       .backgroundColor('#0D9FFB')
       .width('40%')
       .height('5%')
     }
     .width('100%')
   }
   .height('100%')
 }   
```

}`

- 在编辑窗口右上角的侧边工具栏，点击Previewer，打开预览器。第一个页面效果如下图所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fa9c48d333c2.jpg)

img

#### 构建第二个页面

-  创建第二个页面。
 
-  新建第二个页面文件。在“Project<strong>”窗口，打开“</strong>entry > src > main > ets<strong>”，右键点击“</strong>pages<strong>”文件夹，选择“</strong>New > ArkTS File<strong>”，命名为“</strong>Second<strong>”，点击“</strong>Finish<strong>”。可以看到文件目录结构如下：</strong> 
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0d3981267ea5.jpg)

img
 说明
 开发者也可以在右键点击“pages<strong>”文件夹时，选择“</strong>New > Page** **> Empty Page<strong>”，则无需手动配置相关页面路由。</strong> 配置第二个页面的路由。在“Project”窗口，打开“entry > src > main > resources > base > profile”，在main_pages.json文件中的“src”下配置第二个页面的路由“pages/Second”。示例如下：  

json  {    "src": [      "pages/Index",      "pages/Second"    ]  }

-  添加文本及按钮。
 
参照第一个页面，在第二个页面添加Text组件、Button组件等，并设置其样式。“Second.ets**”文件的示例如下：

 // Second.ets    
@Entry    
@Component    

```text
struct Second {      
```

 @State message: string = 'Hi there'
 build() {
   Row() {

```text
     Column() {
       Text(this.message)
         .fontSize(50)
         .fontWeight(FontWeight.Bold)
       Button() {
         Text('Back')
           .fontSize(25)
           .fontWeight(FontWeight.Bold)
       }
       .type(ButtonType.Capsule)
       .margin({
         top: 20
       })
       .backgroundColor('#0D9FFB')
       .width('40%')
       .height('5%')
     }
     .width('100%')
   }
   .height('100%')
 }
}  
```


#### 实现页面间的跳转

页面间的导航可以通过[页面路由router](https://link.zhihu.com/?target=https%3A//developer.huawei.com/consumer/cn/doc/harmonyos-references/js-apis-router-0000001820880773)来实现。页面路由router根据页面url找到目标页面，从而实现跳转。使用页面路由请导入router模块。

如果需要实现更好的转场动效，推荐使用[Navigation](https://link.zhihu.com/?target=https%3A//developer.huawei.com/consumer/cn/doc/harmonyos-guides/arkts-navigation-navigation-0000001774120150)。

- 第一个页面跳转到第二个页面。
在第一个页面中，跳转按钮绑定onClick事件，点击按钮时跳转到第二页。“<strong>Index.ets</strong>”文件的示例如下：

```python
// Index.ets    
// 导入页面路由模块    
import router from '@ohos.router';    
import { BusinessError } from '@ohos.base';
```

@Entry    
@Component    

```js
struct Index {      
  @State message: string = 'Hello World'
  build() {
   Row() {
     Column() {
       Text(this.message)
         .fontSize(50)
         .fontWeight(FontWeight.Bold)
       // 添加按钮，以响应用户点击
       Button() {
         Text('Next')
           .fontSize(30)
           .fontWeight(FontWeight.Bold)
       }
       .type(ButtonType.Capsule)
       .margin({
         top: 20
       })
       .backgroundColor('#0D9FFB')
       .width('40%')
       .height('5%')
       // 跳转按钮绑定onClick事件，点击时跳转到第二页
       .onClick(() => {
         console.info(`Succeeded in clicking the 'Next' button.`)
         // 跳转到第二页
         router.pushUrl({ url: 'pages/Second' }).then(() => {
           console.info('Succeeded in jumping to the second page.')

         }).catch((err: BusinessError) => {
           console.error(`Failed to jump to the second page.Code is ${err.code}, message is ${err.message}`)
         })
       })
     }
     .width('100%')
   }
   .height('100%')
 }
```

}  `


- 第二个页面返回到第一个页面。
在第二个页面中，返回按钮绑定onClick事件，点击按钮时返回到第一页。“Second.ets**”文件的示例如下：

```python
  // Second.ets    
// 导入页面路由模块    
import router from '@ohos.router';    
import { BusinessError } from '@ohos.base';
```


@Entry    
@Component    

```js
struct Second {      
  @State message: string = 'Hi there'
  build() {
   Row() {
     Column() {
       Text(this.message)
         .fontSize(50)
         .fontWeight(FontWeight.Bold)
       Button() {
         Text('Back')
           .fontSize(25)
           .fontWeight(FontWeight.Bold)
       }
       .type(ButtonType.Capsule)
       .margin({
         top: 20
       })
       .backgroundColor('#0D9FFB')
       .width('40%')
       .height('5%')
       // 返回按钮绑定onClick事件，点击按钮时返回到第一页
       .onClick(() => {
         console.info(`Succeeded in clicking the 'Back' button.`)
         try {
           // 返回第一页
           router.back()
           console.info('Succeeded in returning to the first page.')
         } catch (err) {
           let code = (err as BusinessError).code; 
           let message = (err as BusinessError).message; 
           console.error(`Failed to return to the first page.Code is ${code}, message is ${message}`)
         }
       })
     }
     .width('100%')
   }
   .height('100%')
 }
}  
```


- 打开Index.ets文件，点击预览器中的
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_00233f8de8a1.jpg)

img按钮进行刷新。效果如下图所示：


![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_fa39e6fcb6b7.jpg)

img

#### 使用真机运行应用

-  将搭载HarmonyOS系统的真机与电脑连接。具体指导及要求，可查看[使用本地真机运行应用/服务](https://link.zhihu.com/?target=https%3A//developer.huawei.com/consumer/cn/doc/harmonyos-guides/ide-run-device-0000001670539800)。
 
-  点击File<strong>></strong>Project Structure...<strong>></strong>Project<strong>></strong>SigningConfigs<strong>界面勾选“</strong>Support HarmonyOS<strong>”和“</strong>Automatically generate signature<strong>”，点击界面提示的“</strong>Sign In<strong>”，使用华为帐号登录。等待自动签名完成后，点击“</strong>OK**”即可。如下图所示：
 

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_745588cf0cf3.jpg)

点击放大

- 在编辑窗口右上角的工具栏，点击
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a4f1b49d20a5.jpg)

img按钮运行。效果如下图所示：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4037191f70f8.jpg)

点击放大