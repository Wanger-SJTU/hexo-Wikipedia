---
title: (2 条消息) 鸿蒙NEXT如何保证应用安全：详解鸿蒙NEXT数字签名和证书机制
date: "2025-04-09 00:00:00"
updated: "2025-04-09 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/鸿蒙NEXT如何保证应用安全-详解鸿蒙NEXT数字签名和证书机制/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/1893267164884080586
---


**本文由美团技术团队张晨分享，原题“鸿蒙应用签名实操及机制探究”，下文进行了排版优化和内容修订。
### 1、引言**

华为鸿蒙单框架操作系统HarmonyOS NEXT已于2024年10月23日正式发布Release版。HarmonyOS NEXT仅支持鸿蒙原生应用，不再兼容安卓。

<strong>本文对鸿蒙NEXT公开资料进行了深入分析和解读，梳理了鸿蒙单框架应用的签名机制，拆解每一步的实操过程和背后的实现原理，并对源码分析整理签名的校验机制。从中管中窥豹，探究鸿蒙系统的安全设计思路，给从事鸿蒙研发的同学提供一些借鉴。</strong>

成文过程中特别参考了OpenHarmony 5.0.0-Release版的文档和源码，详见：[OpenHarmony 5.0.0 Release](https://link.zhihu.com/?target=https%3A//gitee.com/openharmony/docs/blob/OpenHarmony-5.0.0-Release/zh-cn/release-notes/OpenHarmony-v5.0.0-release.md)。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_00e70c5acd0d.jpg)

### <strong>2、签名机制</strong>

签名相关的代码在[developtools_hapsigner源码仓库](https://link.zhihu.com/?target=https%3A//gitee.com/openharmony/developtools_hapsigner/tree/OpenHarmony-v5.0.0-Release/)里，<strong>签名流程梳理如下：</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_0619f07de448.jpg)

<strong>签名步骤可按如下分组：</strong>

- *<strong>1）</strong>*生成开发者签名证书，包括①、② 、③；
- *<strong>2）</strong>*生成Profile文件，包括④ 、⑤ ；
- *<strong>3）</strong>*生成签名的App，包括⑥ 、⑦。

### <strong>3、生成开发者签名证书</strong>

#### <strong>3.1 生成开发者公私钥</strong>

通过华为的DevEco-Studio工具可以直接生成包含开发者公私钥的p12文件，操作步骤：[鸿蒙NEXT官方指南-生成密钥和证书请求文件](https://link.zhihu.com/?target=https%3A//developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/ide-signing-V5%23section462703710326)。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_41fcd1b91705.jpg)

笔者示例生成的p12文件（保存为my.p12）是标准的PKCS#12格式（定义在[RFC 7292](https://link.zhihu.com/?target=https%3A//datatracker.ietf.org/doc/html/rfc7292)），用来存储一组或多组公钥证书（里面包含公钥）和其对应的私钥（用localKeyID字段进行匹配公私钥的匹配），使用ASN.1来定义其数据结构，并采用DER编码规则将这些结构编码为二进制形式。

<strong>可以通过openssl命令解析其结构，或者直接查看公钥证书和私钥信息：</strong>

**openssl asn1parse -in my.p12 -inform DER //解码DER和解析ASN.1
openssl pkcs12 -info -in my.p12 //查看公钥证书和私钥信息笔者用于示例生成的p12文件里包含的公钥证书如下：**

**-----BEGIN CERTIFICATE-----
MIIBqTCCAU+gAwIBAgIIKG2ih6j2GSswCgYIKoZIzj0EAwIwSTEJMAcGA1UEBhMA
MQkwBwYDVQQIEwAxCTAHBgNVBAcTADEJMAcGA1UEChMAMQkwBwYDVQQLEwAxEDAO
BgNVBAMTB3Rlc3RzY3IwHhcNMjQwOTIzMTI1NjM3WhcNNDkwOTE3MTI1NjM3WjBJ
MQkwBwYDVQQGEwAxCTAHBgNVBAgTADEJMAcGA1UEBxMAMQkwBwYDVQQKEwAxCTAH
BgNVBAsTADEQMA4GA1UEAxMHdGVzdHNjcjBZMBMGByqGSM49AgEGCCqGSM49AwEH
A0IABD28s78rF8+X1JWgkQcfHB2Gy20MCT51Oue6eG5ZbPsUKlZrPx0aRX0einL2
E5WsE3st0zI4yvj0KzhdEwksCWCjITAfMB0GA1UdDgQWBBRtCEWMjEr+bnXoAqSC
fjmk1btJQDAKBggqhkjOPQQDAgNIADBFAiAAiMtQXgCMUxrKtaPKvGqllswi1FRU
h1brCAbJ1t81FgIhAMXbzmeJlA7/zxZDULLRW0rCY6CU3KMDHr8N38EmuDug
-----END CERTIFICATE-----公钥证书的表示是遵循Privacy Enhanced Mail（PEM）协议（定义在[RFC 7468](https://link.zhihu.com/?target=https%3A//datatracker.ietf.org/doc/html/rfc7468)）的文本文件，其格式如下：**

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_34dfe981f96e.jpg)

PEM 文件的label用于指示文件的内容类型。

<strong>以下是一些常见的 PEM header和footer</strong>（后面会陆续见到）：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_66dd652f6250.jpg)

<strong>解析具体公钥证书信息可以采用如下命令（将公钥证书以文本的形式保存为my.pem文件）：</strong>

<strong>openssl x509 -in my.pem -text -noout解析得到如下输出（重要部分加了注释）：</strong>

**Certificate:
    Data:
        Version: 3 (0x2) //证书的版本号
        Serial Number: 2913163237517564203 (0x286da287a8f6192b) //证书的序列号，用于唯一标识证书
        Signature Algorithm: ecdsa-with-SHA256
        Issuer: C = , ST = , L = , O = , OU = , CN = testscr //证书颁发者的信息
        Validity公钥信息（包括公钥算法、公钥位数、公钥值等）属于结构化数据并且较长，不利于识别和比较，所以需要用一个简短的字符串来标识公钥唯一性。常用做法是使用公钥指纹（Public Key Pin，也叫公钥Pin），计算方式是对DER编码的公钥进行SHA-256计算并进行Base64编码。

这里需要注意的是，在X509扩展字段里包括了Subject Key Identifier（SKID）字段，也是证书持有者的标识。那标识公钥的唯一性为什么不直接使用证书里自带的SKID，还要自己算一遍呢，根据[RFC 3280-4.2.1.2章节](https://link.zhihu.com/?target=https%3A//datatracker.ietf.org/doc/html/rfc3280%23section-4.2.1.2)中对SKID的定义：

> For CA certificates, subject key identifiers SHOULD be derived from the public key or a method that generates unique values.
Two common methods for generating key identifiers from the public key are:
(1) The keyIdentifier is composed of the 160-bit SHA-1 hash of the value of the BIT STRING subjectPublicKey (excluding the tag, length, and number of unused bits).
(2) The keyIdentifier is composed of a four bit type field with the value 0100 followed by the least significant 60 bits of the SHA-1 hash of the value of the BIT STRING subjectPublicKey (excluding the tag, length, and number of unused bit string bits).

SKID的计算可以通过公钥得到，但计算方式并不唯一，也可以通过任意的算法得到，只要保证唯一性就可以了。定义里推荐了两种基于SHA-1的算法，openssl采用的算法（详见v3_skid.c的[ossl_x509_pubkey_hash函数](https://link.zhihu.com/?target=https%3A//github.com/openssl/openssl/blob/master/crypto/x509/v3_skid.c)，是对DER编码的公钥进行SHA-1计算。

如果采用SKID来进行公钥的唯一性校验，那么攻击者可以伪造一个证书，里面的SKID和你的一样（SHA-1碰撞，或者直接照抄一下也行），这样的证书也是合法的，就可以轻易绕过对公钥的校验。所以SKID一般只用于在证书链中寻找父子关系，并不用于公钥的唯一性标识。

另外，还有Authority Key Identifier（AKID）字段用于标识证书的颁发者。当验证一个证书链时，验证程序会检查每个证书的AKID和上一个证书的SKID是否匹配，确保它们形成一个连续的信任链。

使用如下命令可以从PEM协议的公钥证书中提取PEM协议的公钥：**

<strong>openssl x509 -in my.pem -pubkey -noout输出如下：</strong>

**-----BEGIN PUBLIC KEY----- //公钥标头
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE95zFs5cFHauzIYEuuw3g2R75a1ir
qEW0JWP9qAKkyVCizN0nnzcn/Fo5oeSZR1iPUnJvjlnpNvZL9BcQbLqa7g==
-----END PUBLIC KEY-----使用如下命令可以继续转换成DER编码并计算SHA-256和Base64编码：**

<strong>openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64所以结合使用如下命令可以直接从符合PEM协议的公钥证书文件中得到对应的公钥指纹：</strong>

<strong>openssl x509 -in my.pem -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64最终笔者示例的公钥证书计算得到的公钥指纹为：</strong>

**fzyRjPvTPElBAj0VlYlVA74M3RMtUh5ljKbOYf1NDA0=
#### 3.2 生成证书签名请求**

同样通过DevEco-Studio可以直接生成证书签名请求Certificate Signing Request（CSR）文件（[操作步骤](https://link.zhihu.com/?target=https%3A//developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/ide-signing-V5%23section462703710326)）。

<strong>得到的CSR内容示例如下：</strong>

**-----BEGIN NEW CERTIFICATE REQUEST----- //CSR标头
MIIBMzCB2wIBADBJMQkwBwYDVQQGEwAxCTAHBgNVBAgTADEJMAcGA1UEBxMAMQkw
BwYDVQQKEwAxCTAHBgNVBAsTADEQMA4GA1UEAxMHdGVzdHNjcjBZMBMGByqGSM49
AgEGCCqGSM49AwEHA0IABD28s78rF8+X1JWgkQcfHB2Gy20MCT51Oue6eG5ZbPsU
KlZrPx0aRX0einL2E5WsE3st0zI4yvj0KzhdEwksCWCgMDAuBgkqhkiG9w0BCQ4x
ITAfMB0GA1UdDgQWBBRtCEWMjEr+bnXoAqSCfjmk1btJQDAKBggqhkjOPQQDAgNH
ADBEAiAlzkRf0AHKh59/deFGo/4JHQRSbw6P+Q7qsiiMMWHT7wIgGugWrCm7tFLh
mRjEEyJNOpen9kfhyOanSRrwtBlEFc0=
-----END NEW CERTIFICATE REQUEST-----生成的CSR文件是标准的PKCS#10格式（定义在[RFC 2986](https://link.zhihu.com/?target=https%3A//datatracker.ietf.org/doc/html/rfc2986)），用于向证书颁发机构（CA）请求签发数字证书的文件，包含申请者的公钥和一些身份信息，这些信息将包含在颁发的证书中。

可以看到CSR文件也是遵循PEM协议的，可以如下命令解析CSR文件的内容（保存为my.csr文件）：**

<strong>openssl req -text -noout -verify -in my.csr输出示例（重要部分加了注释）：</strong>

**Certificate request self-signature verify OK //表明CSR的自签名已成功验证
Certificate Request:
    Data:
        Version: 1 (0x0)
        Subject: C = , ST = , L = , O = , OU = , CN = testscr //证书申请者的信息
        Subject Public Key Info:
            Public Key Algorithm: id-ecPublicKey
                Public-Key: (256 bit)
                pub: //证书申请者的公钥值，和上面my.pem里的公钥值相同
                    04:3d:bc:b3:bf:2b:17:cf:97:d4:95:a0:91:07:1f:
                    1c:1d:86:cb:6d:0c:09:3e:75:3a:e7:ba:78:6e:59:
                    6c:fb:14:2a:56:6b:3f:1d:1a:45:7d:1e:8a:72:f6:
                    13:95:ac:13:7b:2d:d3:32:38:ca:f8:f4:2b:38:5d:
                    13:09:2c:09:60
                ASN1 OID: prime256v1
                NIST CURVE: P-256
        Attributes:
            Requested Extensions:
                X509v3 Subject Key Identifier: //证书申请者的标识
                    6D:08:45:8C:8C:4A:FE:6E:75:E8:02:A4:82:7E:39:A4:D5:BB:49:40
    Signature Algorithm: ecdsa-with-SHA256
    Signature Value:
        30:44:02:20:25:ce:44:5f:d0:01:ca:87:9f:7f:75:e1:46:a3:
        fe:09:1d:04:52:6f:0e:8f:f9:0e:ea:b2:28:8c:31:61:d3:ef:
        02:20:1a:e8:16:ac:29:bb:b4:52:e1:99:18:c4:13:22:4d:3a:
        97:a7:f6:47:e1:c8:e6:a7:49:1a:f0:b4:19:44:15:cd注意到其中证书申请者的公钥值和上面p12文件中的公钥值是一样的，说明CSR中包含了我们的公钥信息。

使用如下命令也可以直接从CSR文件中得到公钥指纹：**

<strong>openssl req -in my.csr -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64示例生成的CSR计算得到的公钥指纹为：</strong>

**fzyRjPvTPElBAj0VlYlVA74M3RMtUh5ljKbOYf1NDA0=和通过公钥证书计算得到的公钥指纹相同。

#### 3.3 生成开发者签名叶子证书**

<strong>证书的作用可以抽象概括为：</strong>

**颁发者（Issuer）说：持有者（Subject）的公钥是某某某。证书一般分为三级：根证书（Root Certificate）、中间证书（Intermediate Certificate）、叶子证书（Leaf Certificate）。

分别是：**

- *<strong>1）</strong>*叶子证书由中间证书颁发（即叶子证书的Issuer+AKID和中间证书的Subject+SKID相同）；
- *<strong>2）</strong>*中间证书由根证书颁发（即中间证书的Issuer+AKID和根证书的Subject+SKID相同）；
- *<strong>3）</strong>*根证书由自己颁发（也就是自签名，根证书的Issuer和Subject相同）。
![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d2284a25e56b.jpg)

我们需要的是用于给我们App签名的开发者签名叶子证书，这需要华为的开发者签名中间证书来帮我们颁发。

<strong>叶子证书分为调试证书和发布证书，我们以发布证书为例</strong>（[操作步骤](https://link.zhihu.com/?target=https%3A//developer.huawei.com/consumer/cn/doc/app/agc-help-add-releasecert-0000001946273961)）：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_9ead4001fe72.jpg)

<strong>需要上传我们的CSR文件，得到的证书文件内容示例如下：</strong>

**-----BEGIN CERTIFICATE-----
MIICGjCCAaGgAwIBAgIIShhpn519jNAwCgYIKoZIzj0EAwMwUzELMAkGA1UEBhMC
Q04xDzANBgNVBAoMBkh1YXdlaTETMBEGA1UECwwKSHVhd2VpIENCRzEeMBwGA1UE
AwwVSHVhd2VpIENCRyBSb290IENBIEcyMB4XDTIwMDMxNjAzMDQzOVoXDTQ5MDMx
NjAzMDQzOVowUzELMAkGA1UEBhMCQ04xDzANBgNVBAoMBkh1YXdlaTETMBEGA1UE
CwwKSHVhd2VpIENCRzEeMBwGA1UEAwwVSHVhd2VpIENCRyBSb290IENBIEcyMHYw
EAYHKoZIzj0CAQYFK4EEACIDYgAEWidkGnDSOw3/HE2y2GHl+fpWBIa5S+IlnNrs
GUvwC1I2QWvtqCHWmwFlFK95zKXiM8s9yV3VVXh7ivN8ZJO3SC5N1TCrvB2lpHMB
wcz4DA0kgHCMm/wDec6kOHx1xvCRo0IwQDAOBgNVHQ8BAf8EBAMCAQYwDwYDVR0T
AQH/BAUwAwEB/zAdBgNVHQ4EFgQUo45a9Vq8cYwqaiVyfkiS4pLcIAAwCgYIKoZI
zj0EAwMDZwAwZAIwMypeB7P0IbY7c6gpWcClhRznOJFj8uavrNu2PIoz9KIqr3jn
BlBHJs0myI7ntYpEAjBbm8eDMZY5zq5iMZUC6H7UzYSix4Uy1YlsLVV738PtKP9h
FTjgDHctXJlC5L7+ZDY=
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIDATCCAoigAwIBAgIIXmuDXbWpOB8wCgYIKoZIzj0EAwMwUzELMAkGA1UEBhMC
Q04xDzANBgNVBAoMBkh1YXdlaTETMBEGA1UECwwKSHVhd2VpIENCRzEeMBwGA1UE
AwwVSHVhd2VpIENCRyBSb290IENBIEcyMB4XDTIwMDcwOTAyMDQyNFoXDTMwMDcw
NzAyMDQyNFowYjELMAkGA1UEBgwCQ04xDzANBgNVBAoMBkh1YXdlaTETMBEGA1UE
CwwKSHVhd2VpIENCRzEtMCsGA1UEAwwkSHVhd2VpIENCRyBEZXZlbG9wZXIgUmVs
YXRpb25zIENBIEcyMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAE65LdoIZh1hlpZ2gP
bJ6gPhHsvYSRe22KETgdqeVeYnrbRHI9wsPT6RGYS+pU4mPl6wxzgDMqN6SY/BoZ
luhkE1PzaHoPoNIWIq0O33hpyKyyYwAacIUEjYurkw1E9r9no4IBGDCCARQwHwYD
VR0jBBgwFoAUo45a9Vq8cYwqaiVyfkiS4pLcIAAwHQYDVR0OBBYEFNtek7Ij6NDk
/nF6Zumkc0dbf/NeMEYGA1UdIAQ/MD0wOwYEVR0gADAzMDEGCCsGAQUFBwIBFiVo
dHRwOi8vY3BraS1jYXdlYi5odWF3ZWkuY29tL2Nwa2kvY3BzMBIGA1UdEwEB/wQI
MAYBAf8CAQAwDgYDVR0PAQH/BAQDAgEGMGYGA1UdHwRfMF0wW6BZoFeGVWh0dHA6
Ly9jcGtpLWNhd2ViLmh1YXdlaS5jb20vY3BraS9zZXJ2bGV0L2NybEZpbGVEb3du
LmNybD9jZXJ0eXBlPTEwJi9yb290X2cyX2NybC5jcmwwCgYIKoZIzj0EAwMDZwAw
ZAIwWO1X5q2MdfpR1Q237GpUHGbL1C13rGyFg2p3AYo44FpZ2/A9ss0wOHKM4KDl
ZPqdAjBLkf8NPZy7KVog98+iCTLq35DJ2ZVxkCxknA9YhiHVyXf4HPm4JlT7rW7o
Q+FzM3c=
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIICujCCAkGgAwIBAgIOY8ui/vvwxqFf+kFokYUwCgYIKoZIzj0EAwMwYjELMAkG
A1UEBgwCQ04xDzANBgNVBAoMBkh1YXdlaTETMBEGA1UECwwKSHVhd2VpIENCRzEt
MCsGA1UEAwwkSHVhd2VpIENCRyBEZXZlbG9wZXIgUmVsYXRpb25zIENBIEcyMB4X
DTI0MDkyMzEyNTgwNFoXDTI3MDkyMzEyNTgwNFowazELMAkGA1UEBhMCQ04xDzAN
BgNVBAoMBuW8oOaZqDEcMBoGA1UECwwTMTI4OTY3Njc4NjA2NTQ5NDk3NzEtMCsG
A1UEAwwk5byg5pmoKDEyODk2NzY3ODYwNjU0OTQ5NzcpXCxSZWxlYXNlMFkwEwYH
KoZIzj0CAQYIKoZIzj0DAQcDQgAEPbyzvysXz5fUlaCRBx8cHYbLbQwJPnU657p4
blls+xQqVms/HRpFfR6KcvYTlawTey3TMjjK+PQrOF0TCSwJYKOB0TCBzjAMBgNV
HRMBAf8EAjAAMFkGA1UdHwRSMFAwTqBMoEqGSGh0dHA6Ly9oNWhvc3RpbmctZHJj
bi5kYmFua2Nkbi5jbi9jY2g1L2NybC9oZHJjYWcyL0h1YXdlaUNCR0hEUkcyY3Js
LmNybDAfBgNVHSMEGDAWgBTbXpOyI+jQ5P5xembppHNHW3/zXjAdBgNVHQ4EFgQU
bQhFjIxK/m516AKkgn45pNW7SUAwDgYDVR0PAQH/BAQDAgeAMBMGA1UdJQQMMAoG
CCsGAQUFBwMDMAoGCCqGSM49BAMDA2cAMGQCMFzNlsafNs7ad5xelZOzCebdRofE
VaQZJW0o5QAdTX0t9Ij1o/zUm0bXIf8ZZTJLYgIwKuuZu+LeLCLZJFEM7tYKDhIK
TegCiesP1THuMgiZhZYOYl1kIZBPVrEB8O1wtxEm
-----END CERTIFICATE-----可以看到叶子证书文件里也包括了中间证书和根证书，分别解析证书信息如下。

根证书：**

**Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number: 5339133492510690512 (0x4a18699f9d7d8cd0)
        Signature Algorithm: ecdsa-with-SHA384
        Issuer: C = CN, O = Huawei, OU = Huawei CBG, CN = Huawei CBG Root CA G2
        Validity
            Not Before: Mar 16 03:04:39 2020 GMT
            Not After : Mar 16 03:04:39 2049 GMT
        Subject: C = CN, O = Huawei, OU = Huawei CBG, CN = Huawei CBG Root CA G2
        Subject Public Key Info:
            Public Key Algorithm: id-ecPublicKey
                Public-Key: (384 bit)
                pub:
                    04:5a:27:64:1a:70:d2:3b:0d:ff:1c:4d:b2:d8:61:
                    e5:f9:fa:56:04:86:b9:4b:e2:25:9c:da:ec:19:4b:
                    f0:0b:52:36:41:6b:ed:a8:21:d6:9b:01:65:14:af:
                    79:cc:a5:e2:33:cb:3d:c9:5d:d5:55:78:7b:8a:f3:
                    7c:64:93:b7:48:2e:4d:d5:30:ab:bc:1d:a5:a4:73:
                    01:c1:cc:f8:0c:0d:24:80:70:8c:9b:fc:03:79:ce:
                    a4:38:7c:75:c6:f0:91
                ASN1 OID: secp384r1
                NIST CURVE: P-384
        X509v3 extensions:
            X509v3 Key Usage: critical
                Certificate Sign, CRL Sign
            X509v3 Basic Constraints: critical
                CA:TRUE
            X509v3 Subject Key Identifier:
                A3:8E:5A:F5:5A:BC:71:8C:2A:6A:25:72:7E:48:92:E2:92:DC:20:00
    Signature Algorithm: ecdsa-with-SHA384
    Signature Value:
        30:64:02:30:33:2a:5e:07:b3:f4:21:b6:3b:73:a8:29:59:c0:
        a5:85:1c:e7:38:91:63:f2:e6:af:ac:db:b6:3c:8a:33:f4:a2:
        2a:af:78:e7:06:50:47:26:cd:26:c8:8e:e7:b5:8a:44:02:30:
        5b:9b:c7:83:31:96:39:ce:ae:62:31:95:02:e8:7e:d4:cd:84:
        a2:c7:85:32:d5:89:6c:2d:55:7b:df:c3:ed:28:ff:61:15:38:
        e0:0c:77:2d:5c:99:42:e4:be:fe:64:36中间证书：**

**Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number: 6803676100576229407 (0x5e6b835db5a9381f)
        Signature Algorithm: ecdsa-with-SHA384
        Issuer: C = CN, O = Huawei, OU = Huawei CBG, CN = Huawei CBG Root CA G2
        Validity
            Not Before: Jul  9 02:04:24 2020 GMT
            Not After : Jul  7 02:04:24 2030 GMT
        Subject: C = CN, O = Huawei, OU = Huawei CBG, CN = Huawei CBG Developer Relations CA G2
        Subject Public Key Info:
            Public Key Algorithm: id-ecPublicKey
                Public-Key: (384 bit)
                pub:
                    04:eb:92:dd:a0:86:61:d6:19:69:67:68:0f:6c:9e:
                    a0:3e:11:ec:bd:84:91:7b:6d:8a:11:38:1d:a9:e5:
                    5e:62:7a:db:44:72:3d:c2:c3:d3:e9:11:98:4b:ea:
                    54:e2:63:e5:eb:0c:73:80:33:2a:37:a4:98:fc:1a:
                    19:96:e8:64:13:53:f3:68:7a:0f:a0:d2:16:22:ad:
                    0e:df:78:69:c8:ac:b2:63:00:1a:70:85:04:8d:8b:
                    ab:93:0d:44:f6:bf:67
                ASN1 OID: secp384r1
                NIST CURVE: P-384
        X509v3 extensions:
            X509v3 Authority Key Identifier:
                A3:8E:5A:F5:5A:BC:71:8C:2A:6A:25:72:7E:48:92:E2:92:DC:20:00
            X509v3 Subject Key Identifier:
                DB:5E:93:B2:23:E8:D0:E4:FE:71:7A:66:E9:A4:73:47:5B:7F:F3:5E
            X509v3 Certificate Policies:
                Policy: X509v3 Any Policy
                  CPS: [url=[http://cpki-caweb.huawei.com/cpki/cps](https://link.zhihu.com/?target=http%3A//cpki-caweb.huawei.com/cpki/cps)][http://cpki-caweb.huawei.com/cpki/cps](https://link.zhihu.com/?target=http%3A//cpki-caweb.huawei.com/cpki/cps)[/url]
            X509v3 Basic Constraints: critical
                CA:TRUE, pathlen:0
            X509v3 Key Usage: critical
                Certificate Sign, CRL Sign
            X509v3 CRL Distribution Points:
                Full Name:
                  URI:[url=[http://cpki-caweb.huawei.com/cpki/servlet/crlFileDown.crl?certype=10&/root_g2_crl.crl](https://link.zhihu.com/?target=http%3A//cpki-caweb.huawei.com/cpki/servlet/crlFileDown.crl%3Fcertype%3D10%26/root_g2_crl.crl)][http://cpki-caweb.huawei.com/cpk](https://link.zhihu.com/?target=http%3A//cpki-caweb.huawei.com/cpk) ... 10&/root_g2_crl.crl[/url]
    Signature Algorithm: ecdsa-with-SHA384
    Signature Value:
        30:64:02:30:58:ed:57:e6:ad:8c:75:fa:51:d5:0d:b7:ec:6a:
        54:1c:66:cb:d4:2d:77:ac:6c:85:83:6a:77:01:8a:38:e0:5a:
        59:db:f0:3d:b2:cd:30:38:72:8c:e0:a0:e5:64:fa:9d:02:30:
        4b:91:ff:0d:3d:9c:bb:29:5a:20:f7:cf:a2:09:32:ea:df:90:
        c9:d9:95:71:90:2c:64:9c:0f:58:86:21:d5:c9:77:f8:1c:f9:
        b8:26:54:fb:ad:6e:e8:43:e1:73:33:77叶子证书：**

**Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number:
            63:cb:a2:fe:fb:f0:c6:a1:5f:fa:41:68:91:85
        Signature Algorithm: ecdsa-with-SHA384
        Issuer: C = CN, O = Huawei, OU = Huawei CBG, CN = Huawei CBG Developer Relations CA G2
        Validity
            Not Before: Sep 23 12:58:04 2024 GMT
            Not After : Sep 23 12:58:04 2027 GMT
        Subject: C = CN, O = \E5\BC\A0\E6\99\A8, OU = 1289676786065494977, CN = "\E5\BC\A0\E6\99\A8(1289676786065494977)\\,Release"
        Subject Public Key Info:
            Public Key Algorithm: id-ecPublicKey
                Public-Key: (256 bit)
                pub:
                    04:3d:bc:b3:bf:2b:17:cf:97:d4:95:a0:91:07:1f:
                    1c:1d:86:cb:6d:0c:09:3e:75:3a:e7:ba:78:6e:59:
                    6c:fb:14:2a:56:6b:3f:1d:1a:45:7d:1e:8a:72:f6:
                    13:95:ac:13:7b:2d:d3:32:38:ca:f8:f4:2b:38:5d:
                    13:09:2c:09:60
                ASN1 OID: prime256v1
                NIST CURVE: P-256
        X509v3 extensions:
            X509v3 Basic Constraints: critical
                CA:FALSE
            X509v3 CRL Distribution Points:
                Full Name:
                  URI:[url=[http://h5hosting-drcn.dbankcdn.cn/cch5/crl/hdrcag2/HuaweiCBGHDRG2crl.crl](https://link.zhihu.com/?target=http%3A//h5hosting-drcn.dbankcdn.cn/cch5/crl/hdrcag2/HuaweiCBGHDRG2crl.crl)][http://h5hosting-drcn.dbankcdn.c](https://link.zhihu.com/?target=http%3A//h5hosting-drcn.dbankcdn.c) ... aweiCBGHDRG2crl.crl[/url]
            X509v3 Authority Key Identifier:
                DB:5E:93:B2:23:E8:D0:E4:FE:71:7A:66:E9:A4:73:47:5B:7F:F3:5E
            X509v3 Subject Key Identifier:
                6D:08:45:8C:8C:4A:FE:6E:75:E8:02:A4:82:7E:39:A4:D5:BB:49:40
            X509v3 Key Usage: critical
                Digital Signature
            X509v3 Extended Key Usage:
                Code Signing
    Signature Algorithm: ecdsa-with-SHA384
    Signature Value:
        30:64:02:30:5c:cd:96:c6:9f:36:ce:da:77:9c:5e:95:93:b3:
        09:e6:dd:46:87:c4:55:a4:19:25:6d:28:e5:00:1d:4d:7d:2d:
        f4:88:f5:a3:fc:d4:9b:46:d7:21:ff:19:65:32:4b:62:02:30:
        2a:eb:99:bb:e2:de:2c:22:d9:24:51:0c:ee:d6:0a:0e:12:0a:
        4d:e8:02:89:eb:0f:d5:31:ee:32:08:99:85:96:0e:62:5d:64:
        21:90:4f:56:b1:01:f0:ed:70:b7:11:26注意到：**颁发下来的叶子证书里Subject和我们申请时所使用的CSR里的Subject不同，

<strong>叶子证书里是：</strong>

<strong>Subject: C = CN, O = \E5\BC\A0\E6\99\A8, OU = 1289676786065494977, CN = "\E5\BC\A0\E6\99\A8(1289676786065494977)\\,Release"CSR里是：</strong>

**Subject: C = , ST = , L = , O = , OU = , CN = testscr说明华为在颁发叶子证书的时候，并没有使用我们CSR里的Subject，而是根据我们在开发者平台网站上登陆的账号信息，对Subject进行了填充。其中OU字段跟账号信息有关（类似iOS的Team ID，但在华为开发者网站上没有找到直接查看的地方）。叶子证书里的公钥信息还是和CSR保持一致，计算得到的公钥指纹也一样。

另外，华为目前给叶子证书的有效期是3年，3年以后需要续期成新证书。当然，如果续期新证书的时候使用的CSR不变，那么新证书的公钥指纹也依然会保持不变。

### 4、生成Profile文件**

#### <strong>4.1 登记App信息</strong>

这里主要是在华为开发者平台上登记一下App的各项信息（[操作步骤](https://link.zhihu.com/?target=https%3A//developer.huawei.com/consumer/cn/doc/app/agc-help-harmonyos-releaseapp-0000001914554900)）。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a54b77346f33.jpg)

<strong>需要注意的是：</strong>包名填写的时候，平台会在线检查一下是否和已经存在的包名有重复（包括其他人申请的包名）。

<strong>申请成功以后，会分配一个唯一的APP ID：</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8de22a412507.jpg)

这个APP ID用来在网站上标识APP的唯一性。后面文章中会出现类似的名称，为了消除歧义，相似的字段用括号内容区分，这里称为APP ID（网站）。

#### <strong>4.2 生成Profile文件</strong>

Profile文件是描述App的包名、签名、申请的权限列表、安装包类型、可安装设备等信息的文件（类似iOS的Provisioning Profile），签名后保存为Cryptographic Message Syntax格式（CMS，扩展的PKCS#7/格式，CMS定义在[RFC 5652](https://link.zhihu.com/?target=https%3A//datatracker.ietf.org/doc/html/rfc5652)，PKCS#7定义在[RFC 2315](https://link.zhihu.com/?target=https%3A//datatracker.ietf.org/doc/html/rfc2315)）。

跟着[操作步骤](https://link.zhihu.com/?target=https%3A//developer.huawei.com/consumer/cn/doc/app/agc-help-add-releaseprofile-0000001914714796)，选择之前的APP ID（网站）和证书，<strong>可以得到对应的Profile文件：</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_a29aa5f722fe.jpg)

Profile也分为发布和调试两种，发布只能选择发布证书，调试只能选择调试证书。这里继续以发布类型为例，生成的Profile文件（保存为my.p7b）被华为签名后， <strong>通过如下命令可以查看里面的所有信息：</strong>

<strong>openssl pkcs7 -in my.p7b -print -inform DER主要包括配置信息和签名信息两部分，也可以通过如下命令分别查看配置信息和签名信息：</strong>

**openssl smime -verify -in my.p7b -inform DER -noverify //查看配置信息
openssl pkcs7 -in my.p7b -print_certs  -inform DER //查看证书信息得到的示例配置信息如下（*为手动打码）：**

**{
    "version-name": "2.0.0",
    "version-code": 2,
    "app-distribution-type": "app_gallery",
    "uuid": "234e1d73-**<strong>-</strong><strong>-</strong>**-f81e2598d0ff",
    "validity": {
        "not-before": 1727096284,
        "not-after": 1821704284
    },
    "type": "release",
    "bundle-info": {
        "developer-id": "300**********7916",
        "distribution-certificate": "-----BEGIN CERTIFICATE-----\nMIICujCCAkGgAwIBAgIOY8ui/vvwxqFf+kFokYUwCgYIKoZIzj0EAwMwYjELMAkG\nA1UEBgwCQ04xDzANBgNVBAoMBkh1YXdlaTETMBEGA1UECwwKSHVhd2VpIENCRzEt\nMCsGA1UEAwwkSHVhd2VpIENCRyBEZXZlbG9wZXIgUmVsYXRpb25zIENBIEcyMB4X\nDTI0MDkyMzEyNTgwNFoXDTI3MDkyMzEyNTgwNFowazELMAkGA1UEBhMCQ04xDzAN\nBgNVBAoMBuW8oOaZqDEcMBoGA1UECwwTMTI4OTY3Njc4NjA2NTQ5NDk3NzEtMCsG\nA1UEAwwk5byg5pmoKDEyODk2NzY3ODYwNjU0OTQ5NzcpXCxSZWxlYXNlMFkwEwYH\nKoZIzj0CAQYIKoZIzj0DAQcDQgAEPbyzvysXz5fUlaCRBx8cHYbLbQwJPnU657p4\nblls+xQqVms/HRpFfR6KcvYTlawTey3TMjjK+PQrOF0TCSwJYKOB0TCBzjAMBgNV\nHRMBAf8EAjAAMFkGA1UdHwRSMFAwTqBMoEqGSGh0dHA6Ly9oNWhvc3RpbmctZHJj\nbi5kYmFua2Nkbi5jbi9jY2g1L2NybC9oZHJjYWcyL0h1YXdlaUNCR0hEUkcyY3Js\nLmNybDAfBgNVHSMEGDAWgBTbXpOyI+jQ5P5xembppHNHW3/zXjAdBgNVHQ4EFgQU\nbQhFjIxK/m516AKkgn45pNW7SUAwDgYDVR0PAQH/BAQDAgeAMBMGA1UdJQQMMAoG\nCCsGAQUFBwMDMAoGCCqGSM49BAMDA2cAMGQCMFzNlsafNs7ad5xelZOzCebdRofE\nVaQZJW0o5QAdTX0t9Ij1o/zUm0bXIf8ZZTJLYgIwKuuZu+LeLCLZJFEM7tYKDhIK\nTegCiesP1THuMgiZhZYOYl1kIZBPVrEB8O1wtxEm\n-----END CERTIFICATE-----\n",
        "bundle-name": "com.***.test",
        "apl": "normal",
        "app-feature": "hos_normal_app",
        "app-identifier": "576************2509"
    },
    "baseapp-info": {},
    "permissions": {},
    "acls": {},
    "issuer": "app_gallery"
}具体每个字段的含义可以参考官方文档和源码中的定义：

- 官方文档：**[app-provision-structure.md](https://link.zhihu.com/?target=https%3A//gitee.com/openharmony/docs/blob/OpenHarmony-v5.0.0-Release/zh-cn/application-dev/security/app-provision-structure.md)
- <strong>源码定义：</strong>[provision_verify.cpp](https://link.zhihu.com/?target=https%3A//gitee.com/openharmony/security_appverify/blob/OpenHarmony-v5.0.0-Release/interfaces/innerkits/appverify/src/provision/provision_verify.cpp)
<strong>其中重点字段解析如下：</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_405926aa4a01.jpg)

<strong>得到的示例证书内容如下：</strong>

**subject=C = CN, O = Huawei, OU = Huawei CBG, CN = Huawei CBG Root CA G2
issuer=C = CN, O = Huawei, OU = Huawei CBG, CN = Huawei CBG Root CA G2
-----BEGIN CERTIFICATE-----
MIICGjCCAaGgAwIBAgIIShhpn519jNAwCgYIKoZIzj0EAwMwUzELMAkGA1UEBhMC
Q04xDzANBgNVBAoMBkh1YXdlaTETMBEGA1UECwwKSHVhd2VpIENCRzEeMBwGA1UE
AwwVSHVhd2VpIENCRyBSb290IENBIEcyMB4XDTIwMDMxNjAzMDQzOVoXDTQ5MDMx
NjAzMDQzOVowUzELMAkGA1UEBhMCQ04xDzANBgNVBAoMBkh1YXdlaTETMBEGA1UE
CwwKSHVhd2VpIENCRzEeMBwGA1UEAwwVSHVhd2VpIENCRyBSb290IENBIEcyMHYw
EAYHKoZIzj0CAQYFK4EEACIDYgAEWidkGnDSOw3/HE2y2GHl+fpWBIa5S+IlnNrs
GUvwC1I2QWvtqCHWmwFlFK95zKXiM8s9yV3VVXh7ivN8ZJO3SC5N1TCrvB2lpHMB
wcz4DA0kgHCMm/wDec6kOHx1xvCRo0IwQDAOBgNVHQ8BAf8EBAMCAQYwDwYDVR0T
AQH/BAUwAwEB/zAdBgNVHQ4EFgQUo45a9Vq8cYwqaiVyfkiS4pLcIAAwCgYIKoZI
zj0EAwMDZwAwZAIwMypeB7P0IbY7c6gpWcClhRznOJFj8uavrNu2PIoz9KIqr3jn
BlBHJs0myI7ntYpEAjBbm8eDMZY5zq5iMZUC6H7UzYSix4Uy1YlsLVV738PtKP9h
FTjgDHctXJlC5L7+ZDY=
-----END CERTIFICATE-----
 
subject=C = CN, O = Huawei, OU = HOS AppGallery, CN = HOS Profile Management
issuer=C = CN, O = Huawei, OU = Huawei CBG, CN = Huawei CBG Software Signing Service CA
-----BEGIN CERTIFICATE-----
MIIC7TCCAnOgAwIBAgIIV5nKqt2oGmwwCgYIKoZIzj0EAwMwZDELMAkGA1UEBhMC
Q04xDzANBgNVBAoMBkh1YXdlaTETMBEGA1UECwwKSHVhd2VpIENCRzEvMC0GA1UE
AwwmSHVhd2VpIENCRyBTb2Z0d2FyZSBTaWduaW5nIFNlcnZpY2UgQ0EwHhcNMjMw
NDI0MDYyNjMxWhcNMjgwNDI0MDYyNjMxWjBYMQswCQYDVQQGDAJDTjEPMA0GA1UE
CgwGSHVhd2VpMRcwFQYDVQQLDA5IT1MgQXBwR2FsbGVyeTEfMB0GA1UEAwwWSE9T
IFByb2ZpbGUgTWFuYWdlbWVudDBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABDdY
3RoPqb6WD8UpXJiavZLN48iamektKUKZHFl9xwr1Siu77z3lI86cREa3Flw50uKc
xkMNKM4FWBRMd3CDhI+jggEZMIIBFTAfBgNVHSMEGDAWgBT69fe+IFZdXdTabfEU
FTwdCduyNDAdBgNVHQ4EFgQU0a99kztpYeCetotz0YIduJ2I2VcwRgYDVR0gBD8w
PTA7BgRVHSAAMDMwMQYIKwYBBQUHAgEWJWh0dHA6Ly9wa2kuY29uc3VtZXIuaHVh
d2VpLmNvbS9jYS9jcHMwDgYDVR0PAQH/BAQDAgeAMEwGA1UdHwRFMEMwQaA/oD2G
O2h0dHA6Ly9wa2kuY29uc3VtZXIuaHVhd2VpLmNvbS9jYS9jcmwvc29mdF9zaWdu
X3Nydl9jcmwuY3JsMBMGA1UdJQQMMAoGCCsGAQUFBwMDMBgGDCsGAQQBj1sCgngB
AwQIMAYCAQEKAQEwCgYIKoZIzj0EAwMDaAAwZQIwRYOlQ6Qq2SF8LHQ78xpNYh47
zMemerx5oG4F6Uq/3ARPfowvdrEu5Ss+njPMG0FFAjEA0s7YhO7Ktm60mkuHuxQS
46fqIHh/PAPJ2ozg1yDSD771bAGn7mDeGjaAFXEtKzU5
-----END CERTIFICATE-----
 
subject=C = CN, O = Huawei, OU = Huawei CBG, CN = Huawei CBG Software Signing Service CA
issuer=C = CN, O = Huawei, OU = Huawei CBG, CN = Huawei CBG Root CA G2
-----BEGIN CERTIFICATE-----
MIIDADCCAoegAwIBAgIIJGDixWQS3MkwCgYIKoZIzj0EAwMwUzELMAkGA1UEBhMC
Q04xDzANBgNVBAoMBkh1YXdlaTETMBEGA1UECwwKSHVhd2VpIENCRzEeMBwGA1UE
AwwVSHVhd2VpIENCRyBSb290IENBIEcyMB4XDTIwMDMxNjEyMzIzOVoXDTQwMDMx
NjEyMzIzOVowZDELMAkGA1UEBhMCQ04xDzANBgNVBAoMBkh1YXdlaTETMBEGA1UE
CwwKSHVhd2VpIENCRzEvMC0GA1UEAwwmSHVhd2VpIENCRyBTb2Z0d2FyZSBTaWdu
aW5nIFNlcnZpY2UgQ0EwdjAQBgcqhkjOPQIBBgUrgQQAIgNiAASsEz7cwYkzFh9b
xIwKfXx5qHGjl5WITy0teGnNWqv+jYCceeixHqErvK7YRn2hVPIqhRqKWeANHZUK
G0qxi+NIpmSmQS8/63CLz1QAcxfv2Xl3/V82dF0v9lm16ehMsN+jggEVMIIBETAf
BgNVHSMEGDAWgBSjjlr1WrxxjCpqJXJ+SJLiktwgADAdBgNVHQ4EFgQU+vX3viBW
XV3U2m3xFBU8HQnbsjQwDwYDVR0TAQH/BAUwAwEB/zBGBgNVHSAEPzA9MDsGBFUd
IAAwMzAxBggrBgEFBQcCARYlaHR0cDovL2Nwa2ktY2F3ZWIuaHVhd2VpLmNvbS9j
cGtpL2NwczAOBgNVHQ8BAf8EBAMCAQYwZgYDVR0fBF8wXTBboFmgV4ZVaHR0cDov
L2Nwa2ktY2F3ZWIuaHVhd2VpLmNvbS9jcGtpL3NlcnZsZXQvY3JsRmlsZURvd24u
Y3JsP2NlcnR5cGU9MTAmL3Jvb3RfZzJfY3JsLmNybDAKBggqhkjOPQQDAwNnADBk
AjBrAQQxUlNgqhYkcEm5eksnPxDkPJSY/qNd2BDgbvEydiLwPSvB7Z9lipxz8ikZ
EeUCMGppWcaV//SIG1y5tEwthLwWeEaF613vUILWQLir8+CA3RZGsRBqtE8xSqfz
yafLYQ==
-----END CERTIFICATE-----这里依然是完整的三级证书链，注意，根证书和之前申请到的开发者签名证书的根证书一样，但中间证书和叶子证书均不一样，比较如下（红色底色表示内容相同）：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_d615c2c3cc51.jpg)

### 5、生成签名的APP**

#### <strong>5.1 得到签名的APP包</strong>

将生成的Profile文件、叶子证书文件等配置到项目的signingConfigs里，使用华为的IDE可以直接得到签名后的App包。如下图所示。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_8cbb76265845.jpg)

或者参考[命令](https://link.zhihu.com/?target=https%3A//gitee.com/openharmony/developtools_hapsigner%23%25E4%25BD%25BF%25E7%2594%25A8%25E8%25AF%25B4%25E6%2598%258E)手动给未签名的App包进行签名。

得到的签名的App包只是用于提供给华为商店进行审核和后续的拆包，并不能直接安装到手机上运行。App包实际上就是标准的ZIP格式，可以修改后缀为.zip进行解压（如下图所示）。

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_00236cddd355.jpg)

可以看到里面包括了.hap包和描述App一些信息的[http://pack.info](https://link.zhihu.com/?target=http%3A//pack.info)文件。

那么对App包进行签名的内容以及Profile文件在哪里呢？根据对源码里VerifyHap.java类的[verifyHap函数](https://link.zhihu.com/?target=https%3A//gitee.com/openharmony/developtools_hapsigner/blob/OpenHarmony-v5.0.0-Release/hapsigntool/hap_sign_tool_lib/src/main/java/com/ohos/hapsigntool/hap/verify/VerifyHap.java)进行分析，发现鸿蒙上的签名机制类似Android V3，签名信息和Profile文件存储在自定义的HapSigningBlock区，放到了ZIP格式Central Directory区的前面。

<strong>其结构如下：</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_05c871d4740e.jpg)

<strong>HapSigningBlock区的魔数（转成string也就是）：</strong>

<strong>/</strong>
 * The value of lower 8 bytes of magic word
 */
public static final long HAP_SIG_BLOCK_MAGIC_LO_V3 = 0x676973207061683cL;
 
/**
 * The value of higher 8 bytes of magic word
 */
public static final long HAP_SIG_BLOCK_MAGIC_HI_V3 = 0x3e6b636f6c62206eL;
 
/**
 * Size of hap signature block header
 */
public static final int HAP_SIG_BLOCK_HEADER_SIZE = 32;通过hex工具直接打开App包也可以在Central Directory区前面找到：**

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_cd4c167f2f66.jpg)

<strong>其中SignatureSchemeBlock区存放了CMS格式的Hap包签名信息，而Profile文件就存储在SigningBlock区，Type是0x20000002：</strong>

<strong>/</strong>
 * ID of profile block
 */
public static final int HAP_PROFILE_BLOCK_ID = 0x20000002;通过如下[hap-sign-tool.jar](https://link.zhihu.com/?target=https%3A//gitee.com/openharmony/developtools_hapsigner/tree/OpenHarmony-v5.0.0-Release/dist)的命令可以导出存储在App包或Hap包里的签名证书和Profile文件：

1java -jar hap-sign-tool.jar verify-app -inFile my-signed.app -outCertChain

#### 5.2 签名校验、拆包、重签名**

提供给华为应用市场审核的App包在经过签名校验，确认是开发者的应用以及应用的完整性以后，华为会取出App包SigningBlock区的Profile文件，解压出Hap包，把Profile文件或Profile文件内的配置（下一章节展开描述区别）重新放到Hap包的SigningBlock区里，并用Hap的签名叶子证书对Hap包进行重新签名，签名方式和给App包签名一样。最终真正通过应用市场下发到手机上的是经过重签名的Hap包（类似iOS的双层签名机制）。

<strong>解析出签名证书如下：</strong>

**CN=HOS AppGallery Application Release, OU=HOS AppGallery, O=Huawei, C=CN
-----BEGIN CERTIFICATE-----
MIIC+TCCAn+gAwIBAgIIWXsBFAJOQzIwCgYIKoZIzj0EAwMwZDELMAkGA1UEBhMC
Q04xDzANBgNVBAoMBkh1YXdlaTETMBEGA1UECwwKSHVhd2VpIENCRzEvMC0GA1UE
AwwmSHVhd2VpIENCRyBTb2Z0d2FyZSBTaWduaW5nIFNlcnZpY2UgQ0EwHhcNMjMw
NDI0MDYyMjA1WhcNMjgwNDI0MDYyMjA1WjBkMQswCQYDVQQGDAJDTjEPMA0GA1UE
CgwGSHVhd2VpMRcwFQYDVQQLDA5IT1MgQXBwR2FsbGVyeTErMCkGA1UEAwwiSE9T
IEFwcEdhbGxlcnkgQXBwbGljYXRpb24gUmVsZWFzZTBZMBMGByqGSM49AgEGCCqG
SM49AwEHA0IABIokjn9tVRpgEC6b1AR9chiiejUGBiF83Lzm1giyZX9XKVzTPkHq
RRuML+zhRtT1JESEMOUggPyJbe9+rt3k9CijggEZMIIBFTAfBgNVHSMEGDAWgBT6
9fe+IFZdXdTabfEUFTwdCduyNDAdBgNVHQ4EFgQUFzRtDLYZ7zX/idRsHYmJZ734
vwgwRgYDVR0gBD8wPTA7BgRVHSAAMDMwMQYIKwYBBQUHAgEWJWh0dHA6Ly9wa2ku
Y29uc3VtZXIuaHVhd2VpLmNvbS9jYS9jcHMwDgYDVR0PAQH/BAQDAgeAMEwGA1Ud
HwRFMEMwQaA/oD2GO2h0dHA6Ly9wa2kuY29uc3VtZXIuaHVhd2VpLmNvbS9jYS9j
cmwvc29mdF9zaWduX3Nydl9jcmwuY3JsMBMGA1UdJQQMMAoGCCsGAQUFBwMDMBgG
DCsGAQQBj1sCgngBAwQIMAYCAQEKAQAwCgYIKoZIzj0EAwMDaAAwZQIxAJofyGQW
4ZVDW64qTeiVQVn5w7iRhejP6YFqYX9h/5mNXKMQ8ZuQCFT7EaqhVblWlQIwWIPB
xC+YhPz6JmDMSZDynZINnXi0T3k9UvbcCybbd2k2PWHYvYqQdKAuYGcNc2Ho
-----END CERTIFICATE-----
CN=Huawei CBG Software Signing Service CA, OU=Huawei CBG, O=Huawei, C=CN
-----BEGIN CERTIFICATE-----
MIIDADCCAoegAwIBAgIIJGDixWQS3MkwCgYIKoZIzj0EAwMwUzELMAkGA1UEBhMC
Q04xDzANBgNVBAoMBkh1YXdlaTETMBEGA1UECwwKSHVhd2VpIENCRzEeMBwGA1UE
AwwVSHVhd2VpIENCRyBSb290IENBIEcyMB4XDTIwMDMxNjEyMzIzOVoXDTQwMDMx
NjEyMzIzOVowZDELMAkGA1UEBhMCQ04xDzANBgNVBAoMBkh1YXdlaTETMBEGA1UE
CwwKSHVhd2VpIENCRzEvMC0GA1UEAwwmSHVhd2VpIENCRyBTb2Z0d2FyZSBTaWdu
aW5nIFNlcnZpY2UgQ0EwdjAQBgcqhkjOPQIBBgUrgQQAIgNiAASsEz7cwYkzFh9b
xIwKfXx5qHGjl5WITy0teGnNWqv+jYCceeixHqErvK7YRn2hVPIqhRqKWeANHZUK
G0qxi+NIpmSmQS8/63CLz1QAcxfv2Xl3/V82dF0v9lm16ehMsN+jggEVMIIBETAf
BgNVHSMEGDAWgBSjjlr1WrxxjCpqJXJ+SJLiktwgADAdBgNVHQ4EFgQU+vX3viBW
XV3U2m3xFBU8HQnbsjQwDwYDVR0TAQH/BAUwAwEB/zBGBgNVHSAEPzA9MDsGBFUd
IAAwMzAxBggrBgEFBQcCARYlaHR0cDovL2Nwa2ktY2F3ZWIuaHVhd2VpLmNvbS9j
cGtpL2NwczAOBgNVHQ8BAf8EBAMCAQYwZgYDVR0fBF8wXTBboFmgV4ZVaHR0cDov
L2Nwa2ktY2F3ZWIuaHVhd2VpLmNvbS9jcGtpL3NlcnZsZXQvY3JsRmlsZURvd24u
Y3JsP2NlcnR5cGU9MTAmL3Jvb3RfZzJfY3JsLmNybDAKBggqhkjOPQQDAwNnADBk
AjBrAQQxUlNgqhYkcEm5eksnPxDkPJSY/qNd2BDgbvEydiLwPSvB7Z9lipxz8ikZ
EeUCMGppWcaV//SIG1y5tEwthLwWeEaF613vUILWQLir8+CA3RZGsRBqtE8xSqfz
yafLYQ==
-----END CERTIFICATE-----注意这里给Hap的签名证书和我们之前申请的开发者签名证书不一样，Hap签名证书和对应的私钥都是华为的，跟我们的应用没有关系，而且签名证书链里不包含根证书的信息。

这里再和之前的证书对比一下**（红色和黄色底色表示内容分别相同）：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_3adc1ec6f513.jpg)

三者的根证书都一样，Profile签名证书和Hap签名证书的中间证书一样，三者的叶子证书均不一样。

<strong>另外，如果在上架应用市场的时候，勾选了加密：</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_ccc1a1d133fe.jpg)

根据《[鸿蒙生态应用安全技术白皮书](https://link.zhihu.com/?target=https%3A//developer.huawei.com/consumer/cn/doc/guidebook/harmonyecoappsecurity-guidebook-0000001808819033)》描述，只是对Hap包里的代码做加密，然后重新签名，所以证书和Profile文件的解析均不受影响。

### <strong>6、校验机制</strong>

签名相关的代码在[security_appverify源码仓库](https://link.zhihu.com/?target=https%3A//gitee.com/openharmony/security_appverify/tree/OpenHarmony-v5.0.0-Release/)里，签名校验流程梳理如下（图上所有判断条件在失败情况下均会导致签名校验失败，为了直观不画出此流程）：

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_c45bf401496e.jpg)

<strong>签名校验步骤可以分成三组，分别是：</strong>

- *<strong>1）</strong>*SignatureSchemeBlock区校验；
- *<strong>2）</strong>*Profile校验和解析；
- *<strong>3）</strong>*Hap包完整性校验。

### <strong>7、SignatureSchemeBlock区校验</strong>

校验Hap包时首先在ZIP的Central Directory区前32个字节寻找是否有HapSigningBlock区的Header，找到以后定位到SignatureSchemeBlock区，解析其CMS格式，并校验SignatureSchemeBlock区证书链的完整性。

<strong>证书链完整性校验流程如下：</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_4bdfbee2eccd.jpg)

校验叶子证书时，需要按证书指定算法重新计算证书的hash，并使用上一级证书（中间证书）的公钥对叶子证书里的证书签名进行解密，与重新计算的hash比对是否相同，相同则认为证书可信。中间证书继续通过根证书的公钥校验自己的证书签名。根证书用自己的公钥校验自己。

<strong>上一章说到，SignatureSchemeBlock区的证书链不包括根证书，所以这一步需要使用到根证书其实是内置在鸿蒙系统里的，存放地址是：</strong>

#### <strong>/system/etc/security/trusted_root_ca.json</strong>

<strong>具体内容如下：</strong>

**{
    "C=CN, O=Huawei, OU=Huawei CBG, CN=Huawei CBG Root CA G2":"-----BEGIN CERTIFICATE-----\nMIICGjCCAaGgAwIBAgIIShhpn519jNAwCgYIKoZIzj0EAwMwUzELMAkGA1UEBhMC\nQ04xDzANBgNVBAoMBkh1YXdlaTETMBEGA1UECwwKSHVhd2VpIENCRzEeMBwGA1UE\nAwwVSHVhd2VpIENCRyBSb290IENBIEcyMB4XDTIwMDMxNjAzMDQzOVoXDTQ5MDMx\nNjAzMDQzOVowUzELMAkGA1UEBhMCQ04xDzANBgNVBAoMBkh1YXdlaTETMBEGA1UE\nCwwKSHVhd2VpIENCRzEeMBwGA1UEAwwVSHVhd2VpIENCRyBSb290IENBIEcyMHYw\nEAYHKoZIzj0CAQYFK4EEACIDYgAEWidkGnDSOw3/HE2y2GHl+fpWBIa5S+IlnNrs\nGUvwC1I2QWvtqCHWmwFlFK95zKXiM8s9yV3VVXh7ivN8ZJO3SC5N1TCrvB2lpHMB\nwcz4DA0kgHCMm/wDec6kOHx1xvCRo0IwQDAOBgNVHQ8BAf8EBAMCAQYwDwYDVR0T\nAQH/BAUwAwEB/zAdBgNVHQ4EFgQUo45a9Vq8cYwqaiVyfkiS4pLcIAAwCgYIKoZI\nzj0EAwMDZwAwZAIwMypeB7P0IbY7c6gpWcClhRznOJFj8uavrNu2PIoz9KIqr3jn\nBlBHJs0myI7ntYpEAjBbm8eDMZY5zq5iMZUC6H7UzYSix4Uy1YlsLVV738PtKP9h\nFTjgDHctXJlC5L7+ZDY=\n-----END CERTIFICATE-----\n"
}可以看到这个根证书就是上一章解析出来的根证书，所以这里可以校验通过。

在确认证书链可信以后，根据叶子证书的Subject判断Hap包的安装来源，具体代码在trusted_source_manager.cpp的[MatchTrustedSource函数](https://link.zhihu.com/?target=https%3A//gitee.com/openharmony/security_appverify/blob/OpenHarmony-v5.0.0-Release/interfaces/innerkits/appverify/src/init/trusted_source_manager.cpp)里，也就是和内置的Hap签名证书列表进行比较，看匹配到哪一个。

内置的Hap签名证书列表存放地址是：**

<strong>/system/etc/security/trusted_apps_sources.json具体内容如下：</strong>

**{
    "version": "1.0.1",
    "release-time":"2021-06-03 10:06:00",
    "trust-app-source":[
        {
            "name":"huawei app gallery",
            "app-signing-cert":"C=CN, O=Huawei, OU=HOS AppGallery, CN=HOS AppGallery Application Release",
            "profile-signing-certificate":"C=CN, O=Huawei, OU=HOS AppGallery, CN=HOS Profile Management",
            "profile-debug-signing-certificate":"C=CN, O=Huawei, OU=HOS AppGallery, CN=HOS Profile Management Debug",
            "issuer-ca":"C=CN, O=Huawei, OU=Huawei CBG, CN=Huawei CBG Software Signing Service CA",
            "root-ca": "C=CN, O=Huawei, OU=Huawei CBG, CN=Huawei CBG Root CA G2",
            "max-certs-path":3,
            "critialcal-cert-extension":["keyusage","huawei-signing-capability"]
        },
        {
            "name":"huawei system apps",
            "app-signing-cert":"C=CN, O=Huawei CBG, OU=HOS Development Team, CN=HOS Application Provision Release",
            "profile-signing-certificate":"C=CN, O=Huawei CBG, OU=HOS Development Team, CN=HOS Application Provision Profile Release",
            "profile-debug-signing-certificate":"C=CN, O=Huawei CBG, OU=HOS Development Team, CN=HOS Application Provision Profile Release_Debug",
            "issuer-ca":"C=CN, O=Huawei, OU=Huawei CBG, CN=Huawei CBG Software Signing Service CA",
            "root-ca": "C=CN, O=Huawei, OU=Huawei CBG, CN=Huawei CBG Root CA G2",
            "max-certs-path":3,
            "critialcal-cert-extension":["keyusage","huawei-signing-capability"]
        },
        {
            "name":"third_party app preload",
            "app-signing-cert":"C=CN, O=Huawei, OU=HOS Open Platform, CN=HOS Preload Service",
            "profile-signing-certificate":"",
            "profile-debug-signing-certificate":"",
            "issuer-ca":"C=CN, O=Huawei, OU=Huawei CBG, CN=Huawei CBG Software Signing Service CA",
            "root-ca": "C=CN, O=Huawei, OU=Huawei CBG, CN=Huawei CBG Root CA G2",
            "max-certs-path":3,
            "critialcal-cert-extension":["keyusage","huawei-signing-capability"]
        }
   ]
}这里有“huawei app gallery（应用市场）”、“huawei system apps（系统应用）”、“third_party app preload（三方预装）”三组。每一组包括对应的Hap签名证书Subject、Profile签名证书Subject等信息。

我们走应用市场分发的Hap包会匹配到“huawei app gallery”这个证书。

### 8、Profile解析和校验**

接下来在SigningBlock区寻找Profile，这里注意到不同Hap包签名方式会影响Profile的存储格式。对于走应用市场分发的Hap包，Profile是直接把其配置以字符串的格式保存，而对于其他情况，则是用CMS的格式保存。那么应用市场分发的Hap包也就不需要Profile的文件签名校验了。

对于其他情况，首先会使用Profile里保存的叶子证书公钥校验Profile的文件签名，然后会校验叶子证书Subject是否和匹配的同组内Profile签名证书Subject相同。

<strong>校验通过后解析Profile里的配置信息，根据type不同走不同的校验逻辑：</strong>

- *<strong>1）</strong>*发布，会校验是否为允许的安装来源，根据hap_verify_v2.cpp的[IsAppDistributedTypeAllowInstall函数](https://link.zhihu.com/?target=https%3A//gitee.com/openharmony/security_appverify/blob/OpenHarmony-v5.0.0-Release/interfaces/innerkits/appverify/src/verify/hap_verify_v2.cpp)，允许的来源包括企业签名、MDM、众包测试等分发场景；
- *<strong>2）</strong>*调试，会校验待安装的设备UDID是否在Profile的device-ids列表中。
都校验通过后，再继续看Profile文件签名证书和Hap的签名正式是否相同，并继续对Profile配置的字段规则合法性进行检测。走完这一步，就可以认为Profile是可信的。

随后会生成App ID（公钥）和Fingerprint两个新的字段和验证结果一并返回。其中APP ID（公钥）是根据Profile配置里开发者签名证书公钥生成的（详见[GenerateAppId函数](https://link.zhihu.com/?target=https%3A//gitee.com/openharmony/security_appverify/blob/OpenHarmony-v5.0.0-Release/interfaces/innerkits/appverify/src/verify/hap_verify_v2.cpp)），fingerprint是根据Profile配置里开发者签名证书直接计算整个证书的指纹（注意不是上一章的公钥指纹，详见[GenerateFingerprint函数](https://link.zhihu.com/?target=https%3A//gitee.com/openharmony/security_appverify/blob/OpenHarmony-v5.0.0-Release/interfaces/innerkits/appverify/src/verify/hap_verify_v2.cpp)）。至此完成Profile的解析和校验。

<strong>另外，在鸿蒙</strong>[SignatureInfo API](https://link.zhihu.com/?target=https%3A//developer.huawei.com/consumer/cn/doc/harmonyos-references-V5/js-apis-bundlemanager-bundleinfo-V5%23signatureinfo)<strong>中，会返回三个参数：</strong>

![](/images/collections/0.raw/zhihu/%E6%88%91%E7%9A%84%E6%94%B6%E8%97%8F/asset/img_145947c68ff0.jpg)

其中API返回的appId为了消除歧义，这里称为APP ID（接口）。

根据包管理子系统bundle_install_checker.cpp的[ParseHapFiles函数](https://link.zhihu.com/?target=https%3A//gitee.com/openharmony/bundlemanager_bundle_framework/blob/OpenHarmony-v5.0.0-Release/services/bundlemgr/src/bundle_install_checker.cpp)、inner_bundle_info.h的[SetProvisionId函数](https://link.zhihu.com/?target=https%3A//gitee.com/openharmony/bundlemanager_bundle_framework/blob/OpenHarmony-v5.0.0-Release/services/bundlemgr/include/inner_bundle_info.h)和这个[PR](https://link.zhihu.com/?target=https%3A//gitee.com/openharmony/bundlemanager_bundle_framework/pulls/52/files)来看：

**// bundle_install_checker.cpp
    newInfo.SetProvisionId(provisionInfo.appId);
 
// inner_bundle_info.h
    void SetProvisionId(const std::string &provisionId)
{
        baseBundleInfo_->appId = baseBundleInfo_->name + Constants::FILE_UNDERLINE + provisionId;
    }APP ID（接口）的值实际上是APP ID（公钥）加上了{bundleName}_的前缀。

### 9、Hap包完整性校验**

这一步的过程和Hap包签名类似，将ZIP包中数据和HapSigningBlock区里非SignatureSchemeBlock的部分拼接，重新计算hash，与使用Hap签名叶子证书公钥解密SignatureSchemeBlock区签名后的hash比较，相同则认为Hap包未被篡改。具体可以参考hap_signing_block_utils.cpp的[VerifyHapIntegrity函数](https://link.zhihu.com/?target=https%3A//gitee.com/openharmony/security_appverify/blob/OpenHarmony-v5.0.0-Release/interfaces/innerkits/appverify/src/util/hap_signing_block_utils.cpp)，这里就不展开了。

### <strong>10、本文小结</strong>

从鸿蒙单框架应用的签名和校验机制的种种细节中可以看出，HarmonyOS NEXT的安全设计非常务实，融合了Anroid和iOS双端的特性，有借鉴Android成熟的部分（签名格式），但更多的是参考了iOS的设计思路（双层签名机制），甚至更加严格。期待HarmonyOS NEXT给我们带来一个新的未来。

感谢华为同学对本文的大力支持。

### <strong>11、相关资料</strong>

[1] [即时通讯安全篇（三）：常用加解密算法与通讯安全讲解](https://link.zhihu.com/?target=http%3A//www.52im.net/thread-219-1-1.html)

[2] [即时通讯安全篇（六）：非对称加密技术的原理与应用实践](https://link.zhihu.com/?target=http%3A//www.52im.net/thread-653-1-1.html)

[3] [一篇读懂HTTPS：加密原理、安全逻辑、数字证书等](https://link.zhihu.com/?target=http%3A//www.52im.net/thread-2446-1-1.html)

[4] [即时通讯初学者必知必会的20个网络编程和通信安全知识点](https://link.zhihu.com/?target=http%3A//www.52im.net/thread-4783-1-1.html)

[5] [微信新一代通信安全解决方案：基于TLS1.3的MMTLS详解](https://link.zhihu.com/?target=http%3A//www.52im.net/thread-310-1-1.html)

[6] [微信技术分享：揭秘微信后台安全特征数据仓库的架构设计](https://link.zhihu.com/?target=http%3A//www.52im.net/thread-4374-1-1.html)

[7] [来自阿里OpenIM：打造安全可靠即时通讯服务的技术实践分享](https://link.zhihu.com/?target=http%3A//www.52im.net/thread-215-1-1.html)

<strong>技术交流：</strong> 

- 移动端IM开发入门文章：《[新手入门一篇就够：从零开发移动端IM](https://link.zhihu.com/?target=http%3A//www.52im.net/thread-464-1-1.html)》 

- 开源IM框架源码：[https://github.com/JackJiang2011/MobileIMSDK](https://link.zhihu.com/?target=https%3A//github.com/JackJiang2011/MobileIMSDK)（[备用地址点此](https://link.zhihu.com/?target=https%3A//gitee.com/jackjiang/MobileIMSDK)） 

[（本文已同步发布于：http://www.52im.net/thread-4801-1-1.html）](https://link.zhihu.com/?target=http%3A//www.52im.net/thread-4801-1-1.html)