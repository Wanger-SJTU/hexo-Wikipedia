---
title: (1 条消息) MediaCrawler 小红书爬虫源码分析
date: "2024-03-24 00:00:00"
updated: "2024-03-24 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/我的收藏/MediaCrawler-小红书爬虫源码分析/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/688793628
---


### 前言

MediaCrawler 是最近冲上 Github 热搜的开源多社交平台爬虫。虽然现在已删库，但还好我眼疾手快，有幸还 Fork 了一份，乘着周末，简单分析了下小红书平台的相关代码。

### 爬虫难点

一般写爬虫，都需要面对以下几个问题

- 如果 app/网页需要登录，如何获取登录态（cookie/jwt）
- 大部分 app/网页都会对请求参数进行 sign，如果有，如何获取 sign 逻辑
- 绕过其它遇到的反爬措施
我将带着这三个问题，阅读 MediaCrawler 小红书代码，看看 MediaCrawler 是怎么处理的。

### 获取登录态

提供了三种方式

- QRCode （login_by_qrcode）
- 手机号 (login_by_mobile)
- Cookie (login_by_cookies)
登录相关代码都在 `media_platform/xhs/login.py` 文件中

#### QRCode 登录

实现代码为 `login_by_qrcode` 方法。代码为:

`async def login_by_qrcode(self):
    """Login to Xiaohongshu website and keep webdriver login state."""
    utils.logger.info("[XHSLogin.login_by_qrcode] Begin login to Xiaohongshu by QR code...")
    qrcode_img_selector = "xpath=//img[@class='qrcode-img']"

    # Find login QR code
    base64_qrcode_img = await utils.find_login_qrcode(
        self.context_page,
        selector=qrcode_img_selector
    )
    if not base64_qrcode_img:
        utils.logger.info("[XHSLogin.login_by_qrcode] Login failed, QR code not found, please check....")

        # If this website does not automatically popup login dialog box,
        # we will manually click login button
        await asyncio.sleep(0.5)
        login_button_ele = self.context_page.locator("xpath=//*[@id='app']/div[1]/div[2]/div[1]/ul/div[1]/button")
        await login_button_ele.click()
        base64_qrcode_img = await utils.find_login_qrcode(
            self.context_page,
            selector=qrcode_img_selector
        )
        if not base64_qrcode_img:
            sys.exit()

    # Get not logged session
    current_cookie = await self.browser_context.cookies()
    _, cookie_dict = utils.convert_cookies(current_cookie)
    no_logged_in_session = cookie_dict.get("web_session")

    # Show login QR code
    # We need to use partial function to call show_qrcode function and run in executor
    # then current asyncio event loop will not be blocked
    partial_show_qrcode = functools.partial(utils.show_qrcode, base64_qrcode_img)
    asyncio.get_running_loop().run_in_executor(executor=None, func=partial_show_qrcode)

    utils.logger.info(f"[XHSLogin.login_by_qrcode] Waiting for scan code login, remaining time is 120s")
    try:
        await self.check_login_state(no_logged_in_session)
    except RetryError:
        utils.logger.info("[XHSLogin.login_by_qrcode] Login to Xiaohongshu failed by QR code login method...")
        sys.exit()

    wait_redirect_seconds = 5
    utils.logger.info(f"[XHSLogin.login_by_qrcode] Login successful then wait for {wait_redirect_seconds} seconds redirect...")
    await asyncio.sleep(wait_redirect_seconds)

`

大致逻辑：

- 启动 headless 浏览器并且 headless 模式必须设为 `False`, 因为不会把 QRCode 显示在终端或者通过信息转发服务转发到你的手机上** 
- 通过`utils.find_login_qrcode`工具函数以及`qrcode_img_selector`获取headless 浏览器所渲染页面中的 QRCode 图片元素
 
- 如果没有获取到，则点击`login_button_ele` , 弹出登录对话框，然后再重复一次步骤2，如果依旧没有获取到，则退出爬虫，爬取失败。
 
- 如果获取到了，则等待用户扫码完成登录。
- 其中可能会出现验证码的情况，此时会提示需要手动验证，没有实现自动验证，需要人工手动操作干预。
` async def check_login_state(self, no_logged_in_session: str) -> bool:
     if "请通过验证" in await self.context_page.content():
        utils.logger.info("[XHSLogin.check_login_state] A verification code appeared during the login process, please verify manually.")`

#### 手机号登录

实现代码为 `login_by_mobile` 方法。代码为:

`async def login_by_mobile(self):
    """Login xiaohongshu by mobile"""
    utils.logger.info("[XHSLogin.login_by_mobile] Begin login xiaohongshu by mobile ...")
    await asyncio.sleep(1)
    try:
        # 小红书进入首页后，有可能不会自动弹出登录框，需要手动点击登录按钮
        login_button_ele = await self.context_page.wait_for_selector(
            selector="xpath=//*[@id='app']/div[1]/div[2]/div[1]/ul/div[1]/button",
            timeout=5000
        )
        await login_button_ele.click()
        # 弹窗的登录对话框也有两种形态，一种是直接可以看到手机号和验证码的
        # 另一种是需要点击切换到手机登录的
        element = await self.context_page.wait_for_selector(
            selector='xpath=//div[@class="login-container"]//div[@class="other-method"]/div[1]',
            timeout=5000
        )
        await element.click()
    except Exception as e:
        utils.logger.info("[XHSLogin.login_by_mobile] have not found mobile button icon and keep going ...")

    await asyncio.sleep(1)
    login_container_ele = await self.context_page.wait_for_selector("div.login-container")
    input_ele = await login_container_ele.query_selector("label.phone > input")
    await input_ele.fill(self.login_phone)
    await asyncio.sleep(0.5)

    send_btn_ele = await login_container_ele.query_selector("label.auth-code > span")
    await send_btn_ele.click()  # 点击发送验证码
    sms_code_input_ele = await login_container_ele.query_selector("label.auth-code > input")
    submit_btn_ele = await login_container_ele.query_selector("div.input-container > button")
    redis_obj = redis.Redis(host=config.REDIS_DB_HOST, password=config.REDIS_DB_PWD)
    max_get_sms_code_time = 60 * 2  # 最长获取验证码的时间为2分钟
    no_logged_in_session = ""
    while max_get_sms_code_time > 0:
        utils.logger.info(f"[XHSLogin.login_by_mobile] get sms code from redis remaining time {max_get_sms_code_time}s ...")
        await asyncio.sleep(1)
        sms_code_key = f"xhs_{self.login_phone}"
        sms_code_value = redis_obj.get(sms_code_key)
        if not sms_code_value:
            max_get_sms_code_time -= 1
            continue

        current_cookie = await self.browser_context.cookies()
        _, cookie_dict = utils.convert_cookies(current_cookie)
        no_logged_in_session = cookie_dict.get("web_session")

        await sms_code_input_ele.fill(value=sms_code_value.decode())  # 输入短信验证码
        await asyncio.sleep(0.5)
        agree_privacy_ele = self.context_page.locator("xpath=//div[@class='agreements']//*[local-name()='svg']")
        await agree_privacy_ele.click()  # 点击同意隐私协议
        await asyncio.sleep(0.5)

        await submit_btn_ele.click()  # 点击登录

        # todo ... 应该还需要检查验证码的正确性有可能输入的验证码不正确
        break

    try:
        await self.check_login_state(no_logged_in_session)
    except RetryError:
        utils.logger.info("[XHSLogin.login_by_mobile] Login xiaohongshu failed by mobile login method ...")
        sys.exit()

    wait_redirect_seconds = 5
    utils.logger.info(f"[XHSLogin.login_by_mobile] Login successful then wait for {wait_redirect_seconds} seconds redirect ...")
    await asyncio.sleep(wait_redirect_seconds)

`

大致逻辑：

- 启动 headless 浏览器
 
- 点击 `login_button_ele`  , 弹出登录对话框
- 获取phone input_ele，并填入手机号
`login_container_ele = await self.context_page.wait_for_selector("div.login-container")
input_ele = await login_container_ele.query_selector("label.phone > input")
await input_ele.fill(self.login_phone)`

- 点击`send_btn_ele`， 发送验证码
 
- 每隔 1 秒从 Redis 数据库中获取验证码。如果 120 秒后，依旧没有获取到，则退出爬虫，爬取失败
 
- 如果获取到了，则将验证码，填入验证码输入框(`sms_code_btn_ele`)，并勾选同意隐私协议按钮（`agree_privacy_ele`）以及提交按钮(`submit_btn_ele`)
 
- 因为依赖了 Redis 数据库组件，所以可以通过短信转发软件或者短信获取接口实现短信验证码输入的自动化，实现自动化手机号登录

- 代码中没有检测验证码的正确性。**
- 代码中**没有登录失败重试机制**

#### Cookie登录

实现代码为 `login_by_cookies` 方法。就是将用户提供的 `cookie(web_session)`信息放到`browser_context` 中

`async def login_by_cookies(self):
    for key, value in utils.convert_str_cookie_to_dict(self.cookie_str).items():
        if key != "web_session":  # Only set web_session cookie attribute
            continue

        await self.browser_context.add_cookies([
            {
                'name': key,
                'value': value,
                'domain': ".xiaohongshu.com",
                'path': "/"
            }
        ])

`

### Sign签名算法

小红书浏览器端接口有做`sign`验签，MediaCrawler 生成 `sign`相关参数的代码位于 `media_platform/xhs/client.py` 文件中的 `_pre_headers` 方法。代码如下:

`async def _pre_headers(self, url: str, data=None) -> Dict:
    encrypt_params = await self.playwright_page.evaluate("([url, data]) => window._webmsxyw(url,data)", [url, data])
    local_storage = await self.playwright_page.evaluate("() => window.localStorage")
    signs = sign(
        a1=self.cookie_dict.get("a1", ""),
        b1=local_storage.get("b1", ""),
        x_s=encrypt_params.get("X-s", ""),
        x_t=str(encrypt_params.get("X-t", ""))
    )

    headers = {
        "X-S": signs["x-s"],
        "X-T": signs["x-t"],
        "x-S-Common": signs["x-s-common"],
        "X-B3-Traceid": signs["x-b3-traceid"]
    }
    self.headers.update(headers)
    return self.headers
`

- 没有逆向后用 Python 重新实现`window._webmsxyw`函数，而是通过 `self.playwright_page.evaluate("([url, data]) => window._webmsxyw(url,data)", [url, data])` 直接主动调用浏览器运行时中的 `window._webmsxyw`  生成 `encrypt_params`
- 通过`self.playwright_page.evaluate("() => window.localStorage")` 获取浏览器`local_storage`对象
- 将 `cookie` 中的 `a1`, `local_storage` 中的 `b1`, `encrypt_params` 中的 `X-s`, `encrypt_params` 中的 `X_t`, 作为参数传给 `sign`函数
- `sign` 函数最终返回签名后的值`signs`
- 将 `signs` 赋值给`headers`
所以主要签名逻辑就是 `sign` 函数，深入进去看下。代码位于 `media_platform/xhs/help.py` 文件。代码如下:

`def sign(a1="", b1="", x_s="", x_t=""):
    """
    takes in a URI (uniform resource identifier), an optional data dictionary, and an optional ctime parameter. It returns a dictionary containing two keys: "x-s" and "x-t".
    """
    common = {
        "s0": 5,  # getPlatformCode
        "s1": "",
        "x0": "1",  # localStorage.getItem("b1b1")
        "x1": "3.3.0",  # version
        "x2": "Windows",
        "x3": "xhs-pc-web",
        "x4": "1.4.4",
        "x5": a1,  # cookie of a1
        "x6": x_t,
        "x7": x_s,
        "x8": b1,  # localStorage.getItem("b1")
        "x9": mrc(x_t + x_s + b1),
        "x10": 1,  # getSigCount
    }
    encode_str = encodeUtf8(json.dumps(common, separators=(',', ':')))
    x_s_common = b64Encode(encode_str)
    x_b3_traceid = get_b3_trace_id()
    return {
        "x-s": x_s,
        "x-t": x_t,
        "x-s-common": x_s_common,
        "x-b3-traceid": x_b3_traceid
    }

def get_b3_trace_id():
    re = "abcdef0123456789"
    je = 16
    e = ""
    for t in range(16):
        e += re[random.randint(0, je - 1)]
    return e

def mrc(e):
    ie = [
        0, 1996959894, 3993919788, 2567524794, 124634137, 1886057615, 3915621685,
        2657392035, 249268274, 2044508324, 3772115230, 2547177864, 162941995,
        2125561021, 3887607047, 2428444049, 498536548, 1789927666, 4089016648,
        2227061214, 450548861, 1843258603, 4107580753, 2211677639, 325883990,
        1684777152, 4251122042, 2321926636, 335633487, 1661365465, 4195302755,
        2366115317, 997073096, 1281953886, 3579855332, 2724688242, 1006888145,
        1258607687, 3524101629, 2768942443, 901097722, 1119000684, 3686517206,
        2898065728, 853044451, 1172266101, 3705015759, 2882616665, 651767980,
        1373503546, 3369554304, 3218104598, 565507253, 1454621731, 3485111705,
        3099436303, 671266974, 1594198024, 3322730930, 2970347812, 795835527,
        1483230225, 3244367275, 3060149565, 1994146192, 31158534, 2563907772,
        4023717930, 1907459465, 112637215, 2680153253, 3904427059, 2013776290,
        251722036, 2517215374, 3775830040, 2137656763, 141376813, 2439277719,
        3865271297, 1802195444, 476864866, 2238001368, 4066508878, 1812370925,
        453092731, 2181625025, 4111451223, 1706088902, 314042704, 2344532202,
        4240017532, 1658658271, 366619977, 2362670323, 4224994405, 1303535960,
        984961486, 2747007092, 3569037538, 1256170817, 1037604311, 2765210733,
        3554079995, 1131014506, 879679996, 2909243462, 3663771856, 1141124467,
        855842277, 2852801631, 3708648649, 1342533948, 654459306, 3188396048,
        3373015174, 1466479909, 544179635, 3110523913, 3462522015, 1591671054,
        702138776, 2966460450, 3352799412, 1504918807, 783551873, 3082640443,
        3233442989, 3988292384, 2596254646, 62317068, 1957810842, 3939845945,
        2647816111, 81470997, 1943803523, 3814918930, 2489596804, 225274430,
        2053790376, 3826175755, 2466906013, 167816743, 2097651377, 4027552580,
        2265490386, 503444072, 1762050814, 4150417245, 2154129355, 426522225,
        1852507879, 4275313526, 2312317920, 282753626, 1742555852, 4189708143,
        2394877945, 397917763, 1622183637, 3604390888, 2714866558, 953729732,
        1340076626, 3518719985, 2797360999, 1068828381, 1219638859, 3624741850,
        2936675148, 906185462, 1090812512, 3747672003, 2825379669, 829329135,
        1181335161, 3412177804, 3160834842, 628085408, 1382605366, 3423369109,
        3138078467, 570562233, 1426400815, 3317316542, 2998733608, 733239954,
        1555261956, 3268935591, 3050360625, 752459403, 1541320221, 2607071920,
        3965973030, 1969922972, 40735498, 2617837225, 3943577151, 1913087877,
        83908371, 2512341634, 3803740692, 2075208622, 213261112, 2463272603,
        3855990285, 2094854071, 198958881, 2262029012, 4057260610, 1759359992,
        534414190, 2176718541, 4139329115, 1873836001, 414664567, 2282248934,
        4279200368, 1711684554, 285281116, 2405801727, 4167216745, 1634467795,
        376229701, 2685067896, 3608007406, 1308918612, 956543938, 2808555105,
        3495958263, 1231636301, 1047427035, 2932959818, 3654703836, 1088359270,
        936918000, 2847714899, 3736837829, 1202900863, 817233897, 3183342108,
        3401237130, 1404277552, 615818150, 3134207493, 3453421203, 1423857449,
        601450431, 3009837614, 3294710456, 1567103746, 711928724, 3020668471,
        3272380065, 1510334235, 755167117,
    ]
    o = -1

    def right_without_sign(num: int, bit: int=0) -> int:
        val = ctypes.c_uint32(num).value >> bit
        MAX32INT = 4294967295
        return (val + (MAX32INT + 1)) % (2 * (MAX32INT + 1)) - MAX32INT - 1

    for n in range(57):
        o = ie[(o & 255) ^ ord(e[n])] ^ right_without_sign(o, 8)
    rturn o ^ -1 ^ 3988292384
`

- 这个`sign`函数没有像`window._webmsxyw` 方法一样，选择通过`self.playwright_page.evaluate`主动调用浏览器运行时中的`sign`相关方法，而是自己用 Python 实现。实现代码不再解释，就是逆向 JS 逻辑后，翻译成了 Python。
- 对于为何选择自己用 Python 实现而不主动调用浏览器中的 JS 方法，我也咨询了下作者，作者表示，这里的代码冗余了

### 其它

#### 反反爬虫

MediaCrawler 小红书爬虫，也做了一些反反爬虫措施，代码位于`media_platform/xhs/core.py` 中的 `start` 函数。

- 通过注入stealthjs脚本，来反headless 浏览器检测
`# https://github.com/berstend/puppeteer-extra/tree/master/packages/extract-stealth-evasions
await self.browser_context.add_init_script(path="libs/stealth.min.js")`

- 通过添加 `webId cookie` 来防止出现 `captcha` 滑块
`await self.browser_context.add_cookies([
    {
 'name': "webId",
 'value': "xxx123",  # any value
 'domain': ".xiaohongshu.com",
 'path': "/"
    }
])`

- 支持设置 ip 代理来更改 ip 地址
`if config.ENABLE_IP_PROXY:
    ip_proxy_pool = await create_ip_pool(config.IP_PROXY_POOL_COUNT, enable_validate_ip=True)
    ip_proxy_info: IpInfoModel = await ip_proxy_pool.get_proxy()
    playwright_proxy_format, httpx_proxy_format = self.format_proxy_info(ip_proxy_info)`

#### 数据爬取

通过 `httpx`库发起 http 请求，请求时带上`cookie`以及 `sign`相关参数。请求是直接请求的 API, 所以没有任何 html 解析逻辑，当请求成功后，就会对数据进行一些处理，然后将数据入库。相关主要逻辑位于 `media_platform/xhs/core.py` 以及 `media_platform/xhs/client.py` 。由于比较简单，不再展开。

### 结语

MediaCrawler 小红书爬虫是基于小红书浏览器端协议，实现了`sign`参数的获取，以及登录态的获取。`sign`参数的获取没有完全逆向 JS 逻辑并用 Python 实现，而是通过`self.playwright_page.evaluate`  主动调用了部分 JS 函数(`window._webmsxyw`)。登录态的获取，也是基于 headless 浏览器实现，QRCode 登录需要人工操作；手机号登录可以通过短信转发软件或者短信接收接口实现自动化登录，但没有做验证码检验，验证失败重试。可以通过`stealthjs` 来反 headless 浏览器检测。

PS: 兄弟们，我先去爬小红书大胸翘臀女菩萨了，有时间再分析下抖音爬虫的大致逻辑~
