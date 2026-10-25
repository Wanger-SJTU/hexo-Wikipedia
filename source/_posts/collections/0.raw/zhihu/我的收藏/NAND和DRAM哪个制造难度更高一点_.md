---
title: (2 条消息) NAND和DRAM哪个制造难度更高一点?
date: "2026-04-17 00:00:00"
updated: "2026-04-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/NAND和DRAM哪个制造难度更高一点_/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://www.zhihu.com/question/400623480/answer/25628328546
---


注：本篇内容主要参考自Hong Xiao的《3D IC devices, technologies, and manufacturing》

DRAM根据其不同的技术节点采用了不同的器件结构，因此不同技术代之间的工艺流程也具有较大差异。本篇文章将以2x-nm节点采用的BWL型DRAM为例，从FEOL-MEOL-BEOL完整地讲解DRAM的结构和主要的Process Flow。图1展示了BWL型DRAM的存储阵列区主要的工艺步骤和相对应的mask，接下来将按照每个工艺步骤进行详细的介绍。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_82dfedaca056.jpg)![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0a0031833ae0.webp)

图1 BWL结构DRAM需要的Mask与CMOS逻辑工艺相同的是，BWL型DRAM的制造工艺也是从晶圆清洗开始的。在清洗结束之后会在炉管中生长一层Pad Oxide，然后通过LPCVD工艺生长一层Nitride作为STI刻蚀的Hard Mask，同时它也可以作为STI Oxide CMP的停止层，接下来就进入到了Active Area的工艺流程。

### 1. Active Area

Active Area简称AA，是DRAM存储阵列区域最关键的Pattern之一，我们通常所说的DRAM处于2x-nm等技术节点，就是代表了AA之间的距离，它是DRAM中间距最小的图案。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c8fc26a16b3f.jpg)

图2 不同工艺节点对应的光刻技术在光刻机曝光的过程中，光刻机的分辨率决定了单次曝光形成图案的最小间距，当需要形成的图案间距小于光刻机的分辨率时，就需要用到多重曝光技术。对于目前市场上采用193nm光源波长的浸润式光刻机，其单次曝光的极限分辨率约为80nm，因此对于间距小于80nm的图案就需要采用多重曝光技术。图2展示了不同工艺节点需要的光刻技术，从图中可以看到，对于2x-nm的DRAM技术节点，由于其AA half-pitch（hp）处于20nm~40nm的区间，需要用到SADP等双重曝光技术。当hp伴随着DRAM的微缩进一步减小时，甚至需要用到SAQP或者EUV技术。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f5ad6fe8698c.jpg)

图3 用于形成AA的两张mask:（a）AA-1和（b）AA-2LELE也是一种常用的多重曝光方法，接下来首先介绍通过LELE技术形成AA图案的方法。图3展示了采用LELE双重曝光技术形成AA所需要的两张mask，通过这两张mask的结合，可以形成图4(a)所示的AA图形。但这两张mask之间的套刻误差十分关键，如果在y方向上产生偏移，则会影响后续contact层的对准误差空间，而如果在x方向上产生偏移，则会使得AA之间的STI沟槽宽窄不均，如图4(b)所示。而较窄的STI沟槽容易在CVD oxide填充时形成空洞，继而影响后续的BWL沟槽刻蚀工艺。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_344d522f7689.jpg)

图4（a）结合AA-1和AA-2最终的AA图形（b）当AA-2与AA-1在x方向上存在套刻偏移的情况采用LELE的方式形成AA图案的完整工艺流程如图5所示，其基本原理是通过两次相隔半间距的光刻，形成一半间距的图案。LELE由两次光刻工序组成，每次光刻工序都包括了前烘，旋涂光刻胶，曝光，显影，后烘和量测等多道工艺步骤，如果量测时发现形成的图形不达标，则该道光刻工序可以重新进行。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_390d17efeeb6.jpg)

图5 通过LELE形成AA图案的完整流程除了LELE技术之外，AA的图形也可以通过SADP技术实现，它是一种通过spacer形成一半间距图形的技术。图6对比了LELE与SADP的工艺流程和双重曝光形成图案的基本原理。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e88b02969bbf.jpg)

图6 LELE与SADP的原理和区别图7展示了使用SADP技术形成AA图案的工艺过程，采用SADP实现AA图案的工艺流程，首先需要在晶圆上依次沉积Pad Oxide，Nitride Hard Mask和Dummy层，然后通过光刻和刻蚀在Dummy层形成图7(b)中的mandrel，此时的截面图对应图6(f)。然后通过自对准形成图7(c)和图6(g)中的侧墙spacer，再将Dummy层去除，从而定义出图7(d)和图6(h)所示的半间距的图案。随后通过图7(e)所示的图形将图7(d)形成的AA图案切开，从而得到图7(f)所示的最终AA图案。

采用SADP技术需要比LELE技术更多的工艺步骤，但其优势在于能够更好的控制图形尺寸并且能够避免LELE技术中由于套刻对准问题引起的图4(b)所示的STI宽窄不均现象。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_5ce3ac3ebef8.jpg)

图7 采用SADP技术形成AA的工艺流程在AA的图案形成之后，就要进行Implant的注入。首先是Array区的Well Implant，由于Array区的晶体管都是N型晶体管，因此需要在Array区先注入P+形成Pwell，如图8(a)中左侧的亮黄色区域所示，这样就形成了Well junction。随后进行N型Source/Drain的Implant注入，如图8(a)中左侧的绿色区域所示，这样就形成了Source/Drain junction。在Array区域的Implant完成后，就要开始进行Periphery区域的Implant。首先是在P管区域进行Nwell的掺杂，如图8(b)中右侧的浅绿色区域所示。然后是在N管区域进行Pwell的掺杂，如图8(c)中间的亮黄色区域所示。由于Array区域采用的是BWL结构的晶体管，而Periphery区域采用的是平面的晶体管，因此Periphery区域的Source/Drain Implant需要在gate形成之后再进行。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_03e00ba7495e.jpg)

图8 Array和Periphery区域的Implant示意图接下来的工序是形成BWL结构，通过图9所示的mask形成BWL的沟槽。这一步会同时刻蚀单晶Si和SiO2，需要对两种材料的刻蚀速度和刻蚀速度的均匀性有良好的控制，其具体的工艺步骤包括：

- BWL沟槽刻蚀
- 清洗
- 氧化或沉积栅极氧化层
- 沉积栅极TiN
- CVD沉积栅极W
- 栅极W回刻
- CVD沉积SiO2
- SiO2 CMP
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7fedf5da61d3.jpg)

图9 用于形成BWL图形的mask将AA的图形和BWL的图形叠放在一起就可以得到图10，可以观察到每个AA上方都有两根WL从而可以形成两个DRAM选通晶体管，而每个AA中间的部分是两个晶体管共用的Source端，后续会连接到BL上，而在每个AA的两端则分别是两个晶体管的Drain端，后续会连接到两个电容的SN节点上。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_546c750d981c.jpg)

图10 AA图形与BWL图形如图11(a)所示，在平面晶体管和RG(Recess Gate)晶体管时代，DRAM普遍采用存储单元尺寸为8F2的版图，如图中蓝色矩形所示，这里的F是指最密集的图形中最小间距的一半。随着DRAM的不断微缩，DRAM的存储单元尺寸逐渐从图11(a)中的8F2演变为图11(b)中的6F2，如图中的蓝色平行四边形所示。图11(b)中的图案明显比图11(a)更加紧密，因此可以实现更高的存储密度。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_85ef68fe0863.jpg)

图11 存储单元尺寸分别为 (a)8F2 和 (b)6F2 的DRAM版图图10和图11中的红色线条描绘了BWL的图形是怎样形成的，接下来介绍形成BWL结构的具体工艺过程。首先是利用已经定义好的BWL图形进行trench的刻蚀，如图12所示。图12(a)对应着图12(b)中黑色虚线的横截面，即AA区域的剖面图，而图12(c)对应着图12(b)中蓝色实线的横截面，即STI区域的剖面图。由于该阶段只是形成Array区域的BWL结构，因此Periphery区域被保护起来不被刻蚀，此时Array和Periphery区域的截面图如图12(d)所示。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ca5936060565.jpg)

图12 BWL沟槽刻蚀示意图在BWL沟槽刻蚀完成之后，就要进行栅极的沉积。首先会在沟槽中沉积一层较薄的TiN，它的作用主要是防止栅极的W扩散到SiO2或者Si中。随后通过CVD进行W的沉积，将栅极的W填充在BWL的沟槽中，此时对应的Array和Periphery区域的截面图如图13(d)所示。然后还要进行一道W和TiN的回刻，以去除表面的W和TiN，使得W和TiN只填充在BWL的沟槽中，最后形成的结构俯视图如图13(b)所示。在图13(b)中的黑色虚线处，即沿着AA方向的横截面如图13(a)所示，而图13(c)对应着图13(b)中的蓝色实线处，即AA之间的横截面示意图。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d865c146fa02.jpg)

图13 BWL沟槽填充示意图在BWL结构形成之后，为了将WL与上方结构进行电学隔离，需要通过CVD在WL上方沉积一层SiOx作为电介质，如图14所示。其中图14(a)就是图14(b)中的黑色虚线处所示的晶体管截面图，由于晶体管的栅极，即WL埋在晶圆表面下方的沟槽中，因此这种结构得名Burried WL结构。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f54c0511321f.jpg)

图14 在介质层沉积之后的结构示意图图15(a)是沿着BWL结构沿着WL方向的截面图，在BWL沟槽刻蚀过程中，由于对STI中的Oxide刻蚀速率远高于AA，因此最终会形成TiN和W包裹着AA即Si沟道的器件结构，如图15(a)中的黄色凸起处所示。这一结构与三栅的FinFET十分相似，通过采用这样的器件结构，可以在投影面积不变的情况下增加栅长，从而缩小晶体管漏电，这对于DRAM来说至关重要。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1ace172bae81.jpg)

图15 BWL结构DRAM沿着WL方向的截面图为了更好地与之前的DRAM晶体管结构进行对比，图16(a)和(b)分别展示了采用了RG晶体管结构和采用平面晶体管结构的DRAM沿着WL方向的截面图，可以看到在相同的特征尺寸下，BWL晶体管由于其三栅的结构而具有最长的栅长。RG晶体管和平面晶体管的栅极都是由Poly和W构成的。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_12f4355ea4c2.jpg)

图16 (a) 采用RG晶体管的DRAM的横截面示意图 (b)采用平面结构晶体管的横截面示意图在DRAM存储阵列区的存储单元晶体管形成之后，会把外围电路区域上方覆盖的Oxide去除，并在晶圆清洗之后通过热氧化和远程等离子氮化来形成外围电路区域的栅介质，即SiON，采用SiON的目的是将栅介质的k值即介电常数提升到5左右。接着会在整片晶圆上沉积一层n型重掺杂的Poly作为NMOS的栅极。在此基础上，对于PMOS区域，需要对Poly进行极高剂量的p型掺杂，从而将原本n型掺杂的Poly转变为p型掺杂，以用作PMOS的栅极。随后通过刻蚀工艺去除存储阵列区域沉积的Poly，并清洗整片晶圆，为后续的位线接触（BL Contact, BLC）做准备。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_92b2f5488bae.jpg)

图17 位线接触(BLC)的mask图17展示了BLC的mask，它是用来形成存储单元晶体管的源极或漏极与BL之间的接触的。图18将BLC的mask叠加在了AA和BWL的图案上。值得注意的是，BLC总是位于每个AA图案的中间。BLC的mask在DRAM存储阵列区域的所有mask之中具有最低的孔图案密度。由于覆盖在AA上的Oxide层很薄，通常厚度低于30nm，BLC接触孔的深宽比通常很低，在1:2左右，因此BLC的刻蚀工艺相对于其他的高深宽比刻蚀工艺而言，工艺挑战相对较低。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9606e322ee7b.jpg)

图18 在AA(绿色)和BWL(红色)图案的基础上叠加BLC(黑色)的图案除了图17和图18所示的方法之外，还有一种方法可以在DRAM存储阵列区域形成BLC的图案。在多晶硅沉积和掺杂之后，可以采用BLC的mask对存储阵列区域的Poly和oxide进行刻蚀，形成BLC的孔洞。在晶圆清洗之后沉积TiN/W/SiN的叠层，然后使用BL的mask形成BL和外围电路区域的栅极图案。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_09b9cdde84f2.jpg)

图18 BLC工艺流程示意图图18详细地描述了BLC工艺的主要流程，由于形成BL的mask同时也会用于形成外围电路区域CMOS的栅极，因此会涉及几次在存储阵列区域和外围电路区域的薄膜沉积和去除工艺。图18(a)展现的是去除外围电路区域Oxide层后的截面图。随后，通过热氧化形成栅极氧化层并沉积多晶硅，此时的截面图如图18(b)所示。紧接着，去除存储阵列区域的多晶硅，得到图18(c)所示的截面图，然后如图18(d)所示，通过光刻和刻蚀在存储阵列区域形成BLC的孔洞。最后，在BLC孔洞中填充多晶硅，然后依次沉积TiN、W或者WSix和SiN，这几层薄膜既形成了存储阵列区域的BL，同时也构成了外围电路区域的栅极叠层。其中多晶硅是外围电路区域MOSFET的栅极，TiN作为W或者WSi的阻挡层和黏附层，W或者WSix作为导电层来降低BL的电阻以及外围电路互连线的电阻，而SiN则是作为后续用来形成BL和外围电路栅极图案的硬掩模HM。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2c0aea7b21f2.jpg)

图19 BL Mask图案在形成BLC并沉积BL金属层之后，接下来就是形成BL和外围电路晶体管栅极的图案，其中BL的Mask图案如图19所示。图20展现了将BL Mask叠加在AA、BWL、BLC图案上的效果，此时一个个存储单元晶体管已经初具雏形。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3a7ce18a3b06.jpg)

图20 将BL Mask叠加在AA、BWL、BLC图案上套刻误差Overlay形成BL图案的一个重大挑战。由于W或者WSix层不透光，而套刻时需要对准的两层图案其中底层是位于W层下方的BLC图案，而顶层是位于W层上方在SiN硬掩模上由光刻胶PR形成的BL图案，因此很难直接通过光学手段量测这两层之间的对准误差，只有在经过BL图案的刻蚀并清洗完光刻胶之后才能测量出BL和BLC图形之间的对准误差，这种测量方式称为after clean inspection，即ACI。

通常在BL图形的刻蚀之后，还会通过一道重新氧化的工艺来修复刻蚀过程中对栅极氧化层造成的损伤并降低栅极漏电，此时外围电路区域的截面图如图21(a)所示。随后，在存储阵列区域的下一道maks之前，在外围电路区域还需要几张mask，其中两张mask分别用来进行外围电路区域NMOS和PMOS的S/D extension(SDE) 区域的离子注入。此外，还需要两张mask用来完成图21所示的工艺步骤，其中第一张maks用来通过LPCVD沉积共形的SiN，如图21(b)所示，另一张mask用来垂直刻蚀，形成SiN侧墙Spacer，如图21(c)所示，这一道刻蚀同时也会在存储阵列区域形成BL的图形。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b2b39f36f0eb.jpg)

图21 侧墙Spacer和自对准接触的形成过程侧墙Spacer和BL叠层上方的SiN是为了防止BL与后续形成的SNC短路，同时它们也被广泛用于形成SNC结构，这与早期技术代的DRAM器件中的自对准接触十分相似。如图21(d)所示，先在晶圆上沉积一层Oxide并进行CMP磨平，然后图21(e)所示，通过刻蚀Oxide形成接触孔。由于刻蚀Oxide的过程对Nitride的选择比很高，因此这一道对Nitride的损伤很小，因此可以借助前面形成的SiN侧墙spacer通过自对准刻蚀形成接触图案。在这道工艺之后，紧接着需要通过两张mask分别在外围电路的NMOS和PMOS区域进行重掺杂的S/D，在经过快速热退火RTA对掺杂离子进行激活之后，就形成了外围电路的MOSFET器件。图22展示了BL和外围电路器件形成过程的主要工艺步骤。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_828f223e0263.jpg)

图22 BL和外围电路区域的形成过程在形成BL和外围电路器件之后，存储阵列区域使用到的下一张mask是用来形成SNC的，即连接AA和存储电容的图案。首先沉积一层Oxide，这层Oxide需要填满BL之间的沟槽并且不能留下空洞，否则在SNC刻蚀之后，SNC孔之间可能会被Oxide层下方的孔洞连接在一起，在TiN/W的CVD沉积之后，SNC之间就会被沉积的金属连通。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ad5de2949d1f.jpg)

图23 用于形成SNC图案的Mask在沉积完Oxide并进行CMP之后，会沉积一层刻蚀停止层，然后使用图23所示的SNC mask。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b2851aeca9f9.jpg)

图24 用于放松SNC图案间距的两张Mask对于2x-nm技术节点而言，图23所示的mask对于单次曝光来说图案密度过高，因此需要图24所示的两张mask来降低图形间距并通过LELE双重曝光来形成SNC阵列的图案。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_f8fef19530fa.jpg)

图25 用于形成SNC图案的两张Mask另一种通过双重曝光技术形成这种通孔阵列图案的mask如图25所示，这种情况下需要两层不一样的HM材料。第一道刻蚀过程在顶部的HM上形成line-space图案并停止在底部的HM上，如图26(a)所示。在去除掉上一道刻蚀工艺的PR之后，再通过第二道PR形成第二次刻蚀的图案，第二此刻蚀主要是对底部的HM进行刻蚀，而对顶部的HM和Oxide层几乎不进行刻蚀，因此只有位于图25中两道mask交叉点处的底部HM会被刻蚀，如图26(b)所示。在此基础上对暴露出的区域再进行j介电层ILD1的刻蚀，就可以形成SNC的图案，如图26(c)所示。由于光刻的圆角效应，最终形成的SNC图案会更接近于圆形而不是方形。采用图25所示的两张line-space mask来形成SNC的孔洞图案的优势在于，对于图25(a)的mask来说只有y方向的overlay需要严格控制，而对于图25(b)的mask来说只有x方向的overlay需要严格控制，相比较之下，图24采用的两张mask在x和y方向上都需要严格控制overlay。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_358b1b8e8352.jpg)

图26 通过两层HM实现SNC图形的方法图27展示了将SNC的mask叠加在BL、BLC、BWL以及AA的图形上的效果，可以观察到SNC的孔位于WL和BL形成的空隙之中，并且位于每个AA的两端。BL的spacer和BL上的覆盖层使得BLC孔的刻蚀能够以自对准的方式进行。在BLC刻蚀和清洗之后，沉积一层共形的SiN然后再将SNC孔底部的SiN去除，这道工艺与前面通过侧墙spacer形成的工艺非常相似，SNC侧墙的SiN能够为防止SNC和BL的短路提供额外的保护。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3e39c1a03fea.jpg)

图27 将SNC mask与BL、BLC、BWL以及AA的图形叠加对于一些外围电路器件而言，这两道mask也能够用来形成外围电路区域的接触孔。在刻蚀形成的SNC孔中沉积Ti、TiN和W并进行CMP之后，存储阵列区域的SNC工艺就完成了。随后，沉积一层Oxide作为介电层ILD2，再使用M1的mask在外围电路区域形成第一层金属互连层，如图28所示。在刻蚀，清洗PR和沉积Ti/TiN/W之后，就可以进行后续的工艺步骤了。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ace7577c48ae.jpg)

图28 存储阵列区域的SNC、外围电路区域的接触和M1的形成过程接下来会在晶圆上沉积一层SiN作为刻蚀停止层，再沉积一层1.5~2um厚的Oxide作为介电层，以及一层SiN作为覆盖层，然后通过图29所示的SN mask形成SN的图案。在存储阵列区域，SN的图形和SNC的mask几乎一致<strong>（需要注意的是，这一点在目前相对先进的DRAM节点并不成立，因为电容普遍采用蜂巢状排布，因此SN的图形与SNC并不一致）</strong>。对于SNC层来说，接触孔的刻蚀，金属层的沉积以及金属的CMP在存储阵列区域和外围电路区域是同时进行的。而对于SN层来说，所有的工艺步骤都只在存储阵列区域进行。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a905eb7f80e7.jpg)

图29 SN的Mask图形与SNC maks类似，在2x-nm技术节点，图29所示的mask对于单次曝光来说图案密度过高，因此需要图30所示的两张mask来降低图形间距并通过LELE双重曝光来形成SNC阵列的图案。此外，也可以通过图25所示的两张line-space mask来形成SN的图形。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_e6d06f3fcb83.jpg)

图30 用于放松SN图案间距的两张Mask图31展示了将SN的mask叠加在SNC、BL、BLC、BWL以及AA的图形上的效果，可以观察到SN mask是和SNC mask对准的，这样才能使得后续刻蚀的SN孔落在SNC上。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0c17fd167a90.jpg)

图31 将SN mask与SNC、BL、BLC、BWL以及AA的图形叠加SN孔的刻蚀是整个IC制造工艺中最具挑战的工艺之一，其图形密度高，图形CD小，刻蚀孔的深宽比达到50:1甚至可能高达100:1。在刻蚀过程中，图32展示了几种常见的缺陷可能影响产品的良率：

- Under-etch，即刻蚀不完全，SN孔未打通，这将导致电容无法连接到晶体管上；
- 底部残留，即刻蚀过程中可能有副产物残留在SN孔底部，也会使得电容无法连接到晶体管无法形成良好的接触；
- Overlay shift，即套刻偏差，它可能会降低SN电容与晶体管的接触面积从而增大接触电阻，甚至有可能导致相邻的两个SN电容通过SNC形成短路通道；
- Bow，即SN孔的CD在中间深度处较大的现象，它可能会导致两个相邻的SN电容短接在一起，图中的SN孔深宽比为10:1，实际器件中会更高；
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_2a4a86ceff4b.jpg)

图32 SN孔的刻蚀及刻蚀过程中常见的几种缺陷在SN孔刻蚀和清洗之后，会沉积一层10nm厚的TiN作为电容的底电极，同时也将电容连接到存储单元晶体管上。随后在wafer表面形成一层PR填充SN孔洞，然后回刻PR使得TiN暴露在wafer的上表面，如图34(c)所示。接下来通过刻蚀移除wafer表面的TiN，而位于SN孔侧壁的TiN则被PR包裹保护得以保留。采用图33(a)所示的SiN slot mask来去除所有外围电路区域的SiN和部分存储阵列区域的SiN。图33(b)展现了SiN slot mask与SN、SNC、BL、BLC、BWL、AA的图形的叠加效果。这层位于顶部的SiN是用来在后续移除厚Oxide介电层之后，起到支撑电容柱的作用的。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a1645ce507e3.jpg)

图33 SiN slot mask图形及其与SN、SNC、BL、BLC、BWL、AA的图形的叠加效果在SiN slot刻蚀之后，会通过外围电路区域的开口和存储阵列区域刻蚀出的slot，采用HF来去除厚Oxide介电层来暴露出TiN。SiN覆盖层的作用就是将电容柱固定，防止结构坍塌，如果没有顶部的SiN层的话，电容高柱很容易倒塌并相互短接，尤其是在湿法刻蚀和清洗的工艺时有液体表面张力的作用下。

Oxide刻蚀完毕，在wafer清洗之后，接下来就是沉积电容的High-k电介质叠层，例如ZrO和AlO的叠层。通常会将总厚度小于10nm的High-k电介质叠层沉积在TiN底电极上，然后再沉积一层厚度小于10nm的TiN作为电容的顶电极，包裹电容柱的内侧壁和外侧壁。如果不对Oxide进行回刻，那么电容的顶电极就只能形成在电容柱的内侧壁，此时电极的面积约为\pi\cdot CD\cdot h，其中CD为SN孔的直径，h为SN孔的深度。通过回刻Oxide暴露出电容柱的外侧壁，并覆盖TiN顶电极，可以在不增加SN孔深度的情况下，使得电极面积翻倍，或者等价于在CD缩小一半的情况下保持总的电极面积不变。在沉积完一层共形的TiN顶电极之后，通常会采用一层导电的且具有良好填充能力的SiGe来填充SN孔的剩余部分以及SN电容间的空隙，至此SN Loop的工艺就结束了。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_7d64dca7eafc.jpg)

图34 SN孔的刻蚀形成过程图34(a)为BWL型DRAM沉积完SN电介质层的截面图，从下往上依次为SiN刻蚀停止层，较厚的Oxide层和顶部SiN层。图34(b)为SN孔刻蚀完成和PR清洗之后的截面图，图中红色虚线处的横截面如图中插图所示。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ab9694cd351a.jpg)

图34 SN孔的TiN底电极形成过程图34(c)为wafer顶部的TiN被去除后的截面图，填充在SN孔中的PR可以起到保护侧壁TiN的作用，如图中的插图所示。图34(d)为厚Oxide层去除后的截面图，此时TiN柱立在SNC上，底部受到ILD2的支撑，顶部受到SiN覆盖层的支撑，TiN的内部和外部都是空的。在一些DRAM工艺中也会采用两层SiN来提供支撑，其中一层位于顶部，另一层大致位于顶部下方150 nm高度处。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_b0d76f42aa65.jpg)

图34 SN孔的High-k电介质层和TiN顶电极形成过程图34(e)展示了沉积完high-k电介质层，TiN顶电极和导电填充层，形成完整的SN电容结构后的截面图。DRAM中常用的high-k电介质叠层为ALD沉积的 ZrO_{2}/Al_{2}O_{3}/ZrO_{2} ,通常也可以缩写为ZAZ，常用的顶电极为TiN，常用的导电填充材料为SiGe。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ab5316819f0f.jpg)

图35 (a) 外围电路区域金属刻蚀至此，BWL型DRAM制造工艺的前道(Front End of Line，FEOL)部分就已经结束了。后道(Back End of Line，BEOL)工艺主要在外围电路区域进行。如图35(a)所示，首先会通过一张mask对存储阵列区域进行保护，刻蚀掉外围电路区域沉积的金属层。在PR清洗之后，会沉积一层很厚的Oxide会作为ILD3并进行CMP使晶圆平坦化，如图35(b)所示。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_de0df73244d3.jpg)

图35 (b) ILD3介质层的沉积以及CMP随后如图35(c)所示，会采用Via1的mask进行V1孔的刻蚀，使得V1落在M1上。虽然由于SN电容的高度限制，这些V1孔的深度高达2~3um，但由于V1的CD比SN孔的CD大，并且间距也相对于SN孔放宽很多，因此相对于形成SN孔的图案，形成V1孔的图案在CD和套刻误差以及刻蚀形貌等方面的控制难度有所降低。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9b51c9c669bc.jpg)

图35 (c) V1孔的刻蚀过程紧接着如图35(d)所示，在形成的V1孔中依次填充Ti/TiN/W，然后通过CMP工艺去除wafer表面的W/TiN/Ti，只留下填充在V1孔中的部分。需要注意的是，存储阵列区域的V1也是在这一道工艺中同时形成的，其作用主要是将存储电容的上极板引出。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_42cd06512e89.jpg)

图35 (d) V1孔的填充过程在V1孔形成之后，需要通过Cu单大马士革金属化工艺形成M2。首先如图36(a)所示，在V1上方沉积一层刻蚀停止层和ILD4。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ece5136f3501.jpg)

图36 (a) 刻蚀停止层和ILD4的沉积随后如图36(b)所示，通过M2的mask对对ILD4和刻蚀停止层进行刻蚀，同时在存储阵列区域和外围电路区域形成M2的图案。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3871ff6bce15.jpg)

图36 (b) 通过M2的mask对ILD4和刻蚀停止层进行刻蚀紧接着在刻蚀形成的凹槽中沉积扩散阻挡层和Cu种子层，随后进行Cu的电化学镀、退火以及CMP工艺，最终形成如图36(c)所示的M2结构。通常采用PVD沉积的TaN或金属Ta作为扩散阻挡层，以方式Cu向介质层中扩散。电化学镀过程通常采用wafer作为阴极，纯Cu板作为阳极，在CuSO_{4}溶液中的Cu^{2+}离子经过还原后就会沉积在加负压的wafer表面。在电化学镀的过程中，通常还会在电镀溶液中加入促进剂、抑制剂、矫平剂等添加剂来加速Cu在孔或沟槽底部的沉积，抑制Cu在角落处的沉积并使Cu的表面平整。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_1a94b11f78e8.jpg)

图36 (c) 通过电化学镀形成M2在Cu CMP工艺形成M2之后，后续的工艺步骤主要都是在外围电路区域进行。首先，会采用Cu双大马士革金属化工艺来形成V2和M3。首先如图37(a)所示，在M2上方依次沉积刻蚀停止层、ILD5和TiN HM，然后采用M3的mask对TiN HM进行刻蚀，形成图37(b)所示的结构。在PR清洗之后，使用V2的mask对ILD5进行刻蚀，停止在刻蚀停止层，形成V2的结构。在PR清洗之后，刻蚀ILD5形成M3的沟槽，并允许V2刻蚀穿过刻蚀停止层，形成图37(c)所示的结构。进一步清洗之后，在形成的凹槽中依次沉积扩散阻挡层和Cu种子层，然后通过电化学镀、退火和CMP工艺形成V2和M3的结构，最终结构如图37(d)所示。在CMP的过程中，沉积在wafer表面的TaN或Ta扩散阻挡层以及TiN HM也会被去除。在wafer清洗之后，还会在wafer表面沉积一层覆盖层来完成V2和M3的工序。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_dde41439d234.jpg)

图37 V2和M3的形成过程接下来在wafer表面沉积一层刻蚀停止层和ILD6便开始了V3的工序，如图38(a)所示。随后如图38(b)所示，采用V3的mask对ILD6和刻蚀停止层进行刻蚀，形成V3的通孔结构。在进行晶圆清洗之后，依次沉积Ti/TiN/W并通过CMP工艺去除wafer表面的W/TiN/Ti，仅保留V3中的金属用于后续和M4接触，就可以得到图38(c)所示的V3结构。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8421d0896e9b.jpg)

图38 V3的形成过程M4是BWL型DRAM结构中的最后一层金属互连层，在M4的形成过程中，首先会在wafer表面沉积Ti/Al-Cu/TiN，如图39(a)所示。这里Ti是用来降低和V3的W之间的接触电阻的。Al-Cu是含Cu量约0.5%的铝合金，在Al中加Cu的目的是增加电迁移的阻力和改善芯片可靠性。顶部的TiN的作用是作为抗反射层降低M4图形化过程中的驻波效应。随后如图39(b)所示，通过M4的mask刻蚀沉积的金属叠层，完成M4的图形化，形成BWL型DRAM的最后一层金属互连层和pad。在PR清洗之后，依次沉积由Oxide和Nitride组成的钝化介质层会沉积在wafer表面，如图39(c)所示。然后采用最后一张mask，刻蚀钝化介质层暴露出pad，以进行后续的测试或引线封装，此时的DRAM晶圆已经完成BEOL工艺，可以进行WAT测试了，在WAT通过之后就可以进行CP测试和封装出货了。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_778cd43d3c39.jpg)

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_dd2de9d0ccdc.jpg)

图39 M4的形成过程图40展现了BWL型DRAM包括了存储阵列区域和外围电路区域的完整截面图，它包括了4层金属层，其中M1是W，M2和M3是Cu，M4是Al-Cu合金。形成图40的结构代表DRAM晶圆已经完成了所有的制造工艺步骤，可以进行WAT和CP测试了，通过这些测试可以得到DRAM的良率数据，而由于DRAM产业对成本十分敏感，良率是决定DRAM厂商竞争力的一个关键指标。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_330fdfa7fe5f.jpg)

图40 BWL型DRAM完整的截面图文章有点长，非常感谢各位读者能够耐心地看到这里，也很开心自己一点一滴的积累终于完成了这篇DRAM工艺流程的总结，希望以后也能够持续为大家带来更好的内容~

送礼物

还没有人送礼物，鼓励一下作者吧

[发布于 2024-11-07 21:17](//www.zhihu.com/question/400623480/answer/25628328546)・上海

​30 条评论​1712 ​69 ​分享

​​

收起​