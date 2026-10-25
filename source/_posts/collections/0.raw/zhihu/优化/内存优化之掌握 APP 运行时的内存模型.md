---
title: 内存优化之掌握 APP 运行时的内存模型
date: "2022-12-11 00:00:00"
updated: "2022-12-11 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/优化/内存优化之掌握-APP-运行时的内存模型/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/591043079
---


为了让大家深入掌握 App 运行时的内存模型，这一节的内容按照由外到内、逐步深入的原则，分为了 3 个部分：

- 内存描述指标
- 内存数据获取
- 内存模型详解
话不多说，让我们马上开始这一章学习吧！

### 内存描述指标

在进行内存优化之前，我们必须要先熟悉常用的内存描述指标。内存描述指标可以用来度量一个 App 的内存情况，也可以在我们做内存优化时，更直观地展示出优化前后的效果。

常用的内存描述指标有 6 个，我们先来简单了解一下。

- <strong>PSS</strong>（ Proportional Set Size ）：实际使用的物理内存，会按比例分配共享的内存。比如一个应用有两个进程都用到了 Chrome 的 V8 引擎，那么每个进程会承担 50% 的 V8 这个 so 库的内存占用。PSS 是我们使用最频繁的一个指标，App 线上的内存数据统计一般都取这个指标。
- <strong>RSS</strong>（ Resident Set Size ）：PSS 中的共享库会按比例分担，但是 RSS 不会，它会完全算进当前进程，所以把所有进程的 RSS 加总后得出来的内存会比实际高。按比例计算内存占用会有一定的消耗，因此当想要高性能的获取内存数据时便可以使用 RSS，Android 的 LowMemoryKiller 机制就是根据每个进程的 RSS 来计算进程优先级的。
- <strong>Private Clean / Private Dirty</strong>：当我们执行 dump meminfo 时会看到这个指标，Private 内存是只被当前进程独占的物理内存。独占的意思是即使释放之后也无法被其他进程使用，只有当这个进程销毁后其他进程才能使用。Clean 表示该对应的物理内存已经释放了，Dirty 表示对应的物理内存还在使用。
- <strong>Swap Pss Dirty</strong>：这个指标和上面的 Private 指标刚好相反，Swap 的内存被释放后，其他进程也可以继续使用，所以我们在 meminfo 中只看得到 Swap Pss Dirty，而看不到Swap Pss Clean，因为 Swap Pss Clean 是没有意义的。
- <strong>Heap Alloc</strong>：通过 Malloc、mmap 等函数实际申请的虚拟内存，包括 Naitve 和虚拟机申请的内存。
- <strong>Heap Free</strong>：空闲的虚拟内存。
内存描述指标并不多，上面这几个就完全够用了，而且我相信大家或多或少都接触过，所以这里列出来便于我们后面查阅。

### 内存数据获取

了解了内存的描述指标，我们再来看看如何获取内存的数据，主要有 2 种方式。

① 线下通过 adb 命令获取，一般用于线下调试：

`adb shell
dumpsys meminfo 进程名/pid`

② 线上通过代码获取，一般用于收集线上的内存数据：

`ActivityManager am = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
ActivityManager.MemoryInfo memoryInfo = new ActivityManager.MemoryInfo();`

虽然获取方法不同，但这两种方式获取数据的原理完全一样，它们调用的都是 `android_os_Debug.cpp` 对象中的 `android_os_Debug_getDirtyPagesPid` 接口，它的源码如下：

`static jboolean android_os_Debug_getDirtyPagesPid(JNIEnv *env, jobject clazz,
        jint pid, jobject object)
{
    bool foundSwapPss;
    stats_t stats[_NUM_HEAP];
    memset(&stats, 0, sizeof(stats));

    //1\. 加载maps文件，获取
    if (!load_maps(pid, stats, &foundSwapPss)) {
        return JNI_FALSE;
    }

    struct graphics_memory_pss graphics_mem;
    //2\. 获取graphics区域内存数据
    if (read_memtrack_memory(pid, &graphics_mem) == 0) {
        stats[HEAP_GRAPHICS].pss = graphics_mem.graphics;
        stats[HEAP_GRAPHICS].privateDirty = graphics_mem.graphics;
        stats[HEAP_GRAPHICS].rss = graphics_mem.graphics;
        stats[HEAP_GL].pss = graphics_mem.gl;
        stats[HEAP_GL].privateDirty = graphics_mem.gl;
        stats[HEAP_GL].rss = graphics_mem.gl;
        stats[HEAP_OTHER_MEMTRACK].pss = graphics_mem.other;
        stats[HEAP_OTHER_MEMTRACK].privateDirty = graphics_mem.other;
        stats[HEAP_OTHER_MEMTRACK].rss = graphics_mem.other;
    }

    //3\. 获取Unkonw区域数据
    for (int i=_NUM_CORE_HEAP; i

这段源码比较长，我们一起来梳理下里面的逻辑，主要分为 4 部分。

- <strong>读取 maps 文件，获取该进程的内存详情</strong>：通过上一节的学习，我们知道进程使用的内存都是虚拟内存，并且虚拟内存都以页为维度来管理和维护。这个进程的虚拟内存每一页上存放了什么数据，都会记录在 maps 文件中，maps 文件是一个很重要的文件，后面会详细介绍它。
- <strong>调用 libmemtrack 接口获取 graphics 内存数据</strong>：Graphic 内存分配和使用方式具有特殊性，并没有全部映射到应用进程，需要通过 HAL 层（抽象硬件层）libmemtrack 的接口查询，才能完整得到使用的 graphics 内存数据。
- <strong>分配 Unknow 区域的内存数据</strong>：根据前面的知识我们知道，mmap 除了做内存映射，还可以用来申请虚拟内存，如果在申请内存时是私有且匿名的（ fd 如果为 -1，flag 入参为MAP_ANONYMOUS 或 MAP_PRIVATE ）就会算入 Unknow 中，如果 mmap 申请内存时指定了申请这段内存的名字，就会算入 Other Dev 当中。因此，对这一区域内存问题的排查往往比较复杂，因为我们不知道内存的来源。
- <strong>存放获取到的内存数据并返回</strong>：最后一部分就是将前面获取到的数据放到对应的数据结构中，并返回给接口调用方。

### 内存模型详解

我们已经知道如何获取内存数据，但是这些数据从哪儿来呢？毕竟只有知道来源，我们才能从源头进行治理。那接下来，我们就对 App 运行时的内存模型进行一个全面且详细的剖析。

我们以系统设置这个 App 为例子，通过 adb 命令获取的内存数据如下：

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_3652d4654efb.jpg)

这里把上面的数据分为两个部分：<strong>A 区域和 B 区域</strong>。其中 A 区域的数据主要来自前面提到的 `android_os_Debug_getMemInfo` 接口，B 区域的数据则是对 A 区域中的数据做了汇总处理。

### A区域

前面我们已经了解到，android_os_Debug_getMemInfo 接口的数据有两部分来源，一部分是读取 maps 文件解析到每块内存所属的数据，另一部分是读取 libmemtrack 接口的数据获取到的 graphic 内存数据。这两部分的数据来源就组成了 A 区域中的三块数据。下面我们分别来看看这三块数据。

#### 数据 ①：maps 文件数据

maps 文件是分析内存很重要的一个文件，通过 maps 文件我们可以详细知道这个进程的内存中存放了哪些数据。<strong>maps 文件存放在 /proc/{ pid }/maps</strong> 路径中，该路径除了存放该进程的 `maps` 文件，还存放了该进程的所有其他信息的数据。如果你感兴趣可以深入了解一下。

对于 root 的手机，我们可以直接查看该目录下的 maps 文件。但是 maps 文件非常长，直接看会很吃力，所以我们一般会通过脚本对 maps 文件中的数据做分析和归类。下面还是以系统设置这个应用为例，它的 maps 文件的部分内容如下：

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_73addce03b7e.jpg)

图中从左至右各个数据段的解释如下：

字段addressperms offsetoffsetdevinodepathname数据12c00000-32c00000rw-p0000000000:000main space (region space)]含义本段内存映射的虚拟地址空间范围读写权限本段映射地址在文件中的偏移所映射的文件所属设备的设备号文件的索引节点号对有名映射而言，pathname 是映射的文件名；对匿名映射来说，pathname 是此段内存在进程中的作用如果手机没有 root 也没关系，我们可以在运行时通过 native 层的 c++ 代码读取该文件，可以看一下`android_os_Debug_getMemInfo` 接口中调用的 load_maps 方法，该方法读取 maps 文件后，还做了一个详细的分类操作，分完类之后就是我们看到的数据 ① 中的数据，这个方法比较长，所以我精简了部分代码。

`static bool load_maps(int pid, stats_t* stats, bool* foundSwapPss)
{
    *foundSwapPss = false;
    uint64_t prev_end = 0;
    int prev_heap = HEAP_UNKNOWN;

    std::string smaps_path = base::StringPrintf("/proc/%d/smaps", pid);
    auto vma_scan = [&](const meminfo::Vma& vma) {
        int which_heap = HEAP_UNKNOWN;
        int sub_heap = HEAP_UNKNOWN;
        bool is_swappable = false;
        std::string name;
        if (base::EndsWith(vma.name, " (deleted)")) {
            name = vma.name.substr(0, vma.name.size() - strlen(" (deleted)"));
        } else {
            name = vma.name;
        }

        uint32_t namesz = name.size();
        // 解析Native Heap 内存
        if (base::StartsWith(name, "[heap]")) {
            which_heap = HEAP_NATIVE;
        } else if (base::StartsWith(name, "[anon:libc_malloc]")) {
            which_heap = HEAP_NATIVE;
        } else if (base::StartsWith(name, "[anon:scudo:")) {
            which_heap = HEAP_NATIVE;
        } else if (base::StartsWith(name, "[anon:GWP-ASan")) {
            which_heap = HEAP_NATIVE;
        }

        // 解析 stack 部分内存
         else if (base::StartsWith(name, "[stack")) {
            which_heap = HEAP_STACK;
        } else if (base::StartsWith(name, "[anon:stack_and_tls:")) {
            which_heap = HEAP_STACK;
        }
        // 解析 code 部分的内存
         else if (base::EndsWith(name, ".so")) {
            which_heap = HEAP_SO;
            is_swappable = true;
        } else if (base::EndsWith(name, ".jar")) {
            which_heap = HEAP_JAR;
            is_swappable = true;
        } else if (base::EndsWith(name, ".apk")) {
            which_heap = HEAP_APK;
            is_swappable = true;
        } else if (base::EndsWith(name, ".ttf")) {
            which_heap = HEAP_TTF;
            is_swappable = true;
        } else if ((base::EndsWith(name, ".odex")) ||
                (namesz > 4 && strstr(name.c_str(), ".dex") != nullptr)) {
            which_heap = HEAP_DEX;
            sub_heap = HEAP_DEX_APP_DEX;
            is_swappable = true;
        } else if (base::EndsWith(name, ".vdex")) {
            which_heap = HEAP_DEX;
            ……
        } else if (base::EndsWith(name, ".oat")) {
            which_heap = HEAP_OAT;
            is_swappable = true;
        } else if (base::EndsWith(name, ".art") || base::EndsWith(name, ".art]")) {
            which_heap = HEAP_ART;
            ……
        } else if (base::StartsWith(name, "/dev/")) {
            which_heap = HEAP_UNKNOWN_DEV;
            // 解析 gl 区域内存
            if (base::StartsWith(name, "/dev/kgsl-3d0")) {
                which_heap = HEAP_GL_DEV;
            } 
            // 解析 cursor 区域内存
            else if (base::StartsWith(name, "/dev/ashmem/CursorWindow")) {
                which_heap = HEAP_CURSOR;
            } else if (base::StartsWith(name, "/dev/ashmem/jit-zygote-cache")) {
                which_heap = HEAP_DALVIK_OTHER;
                sub_heap = HEAP_DALVIK_OTHER_ZYGOTE_CODE_CACHE;
            } 
            //解析ashmen匿名共享内存
            else if (base::StartsWith(name, "/dev/ashmem")) {
                which_heap = HEAP_ASHMEM;
            }
        } else if (base::StartsWith(name, "/memfd:jit-cache")) {
          which_heap = HEAP_DALVIK_OTHER;
          sub_heap = HEAP_DALVIK_OTHER_APP_CODE_CACHE;
        } else if (base::StartsWith(name, "/memfd:jit-zygote-cache")) {
          which_heap = HEAP_DALVIK_OTHER;
          sub_heap = HEAP_DALVIK_OTHER_ZYGOTE_CODE_CACHE;
        } 

        //解析java Heap内存
        else if (base::StartsWith(name, "[anon:")) {
            which_heap = HEAP_UNKNOWN;
            if (base::StartsWith(name, "[anon:dalvik-")) {
                which_heap = HEAP_DALVIK_OTHER;
                if (base::StartsWith(name, "[anon:dalvik-LinearAlloc")) {
                    sub_heap = HEAP_DALVIK_OTHER_LINEARALLOC;
                } else if (base::StartsWith(name, "[anon:dalvik-alloc space") ||
                        base::StartsWith(name, "[anon:dalvik-main space")) {
                    // This is the regular Dalvik heap.
                    which_heap = HEAP_DALVIK;
                    sub_heap = HEAP_DALVIK_NORMAL;
                } else if (base::StartsWith(name,
                            "[anon:dalvik-large object space") ||
                        base::StartsWith(
                            name, "[anon:dalvik-free list large object space")) {
                    which_heap = HEAP_DALVIK;
                    sub_heap = HEAP_DALVIK_LARGE;
                } else if (base::StartsWith(name, "[anon:dalvik-non moving space")) {
                    which_heap = HEAP_DALVIK;
                    sub_heap = HEAP_DALVIK_NON_MOVING;
                } else if (base::StartsWith(name, "[anon:dalvik-zygote space")) {
                    which_heap = HEAP_DALVIK;
                    sub_heap = HEAP_DALVIK_ZYGOTE;
                } else if (base::StartsWith(name, "[anon:dalvik-indirect ref")) {
                    sub_heap = HEAP_DALVIK_OTHER_INDIRECT_REFERENCE_TABLE;
                } else if (base::StartsWith(name, "[anon:dalvik-jit-code-cache") ||
                        base::StartsWith(name, "[anon:dalvik-data-code-cache")) {
                    sub_heap = HEAP_DALVIK_OTHER_APP_CODE_CACHE;
                } else if (base::StartsWith(name, "[anon:dalvik-CompilerMetadata")) {
                    sub_heap = HEAP_DALVIK_OTHER_COMPILER_METADATA;
                } else {
                    sub_heap = HEAP_DALVIK_OTHER_ACCOUNTING;  // Default to accounting.
                }
            }
        } else if (namesz > 0) {
            which_heap = HEAP_UNKNOWN_MAP;
        } else if (vma.start == prev_end && prev_heap == HEAP_SO) {
            // bss section of a shared library
            which_heap = HEAP_SO;
        }

        prev_end = vma.end;
        prev_heap = which_heap;

        const meminfo::MemUsage& usage = vma.usage;
        if (usage.swap_pss > 0 && *foundSwapPss != true) {
            *foundSwapPss = true;
        }

        uint64_t swapable_pss = 0;
        if (is_swappable && (usage.pss > 0)) {
            float sharing_proportion = 0.0;
            if ((usage.shared_clean > 0) || (usage.shared_dirty > 0)) {
                sharing_proportion = (usage.pss - usage.uss) / (usage.shared_clean + usage.shared_dirty);
            }
            swapable_pss = (sharing_proportion * usage.shared_clean) + usage.private_clean;
        }

        // 将获取的数据进行累加
        ……

    };

    //for循环函数，执行maps文件的读取
    return meminfo::ForEachVmaFromFile(smaps_path, vma_scan);
}`

通过上面对 maps 的解析函数，我们不仅可以看到 maps 中的数据类型及格式，也可以知道 Dalvik Heap，Native Heap 等数据的组成。<strong>在做内存的线上异常监控时，异常情况下，也可以将 maps 文件上传到服务端，服务端对 maps 文件进行解析和分类，这样我们就能非常方便的定位和排查线上内存问题。</strong>

#### 数据②：graphic 相关数据

了解了 maps 文件中的内存数据，我们再来看看 graphic 的数据，graphic 的数据有 3 部分。

- <strong>Gfx dev</strong>：绘制时分配，并且已经映射到应用进程虚拟内存中。这里需要注意的是，只有高通的芯片才会将这一块的内存放在 /dev/kgsl-3d0 路径，并映射到进程的虚拟内存中，其他的芯片不会放在这个路径。在上面的 load_maps 方法中，我们也可以看到对这一块内存数据的解析逻辑。
- <strong>GL</strong> <strong>mtrack</strong>：绘制时分配，没有映射到应用地址空间，包括纹理、顶点数据、shader program 等。
- <strong>EGL</strong> <strong>mtrack</strong>：应用的 Layer Surface，通过 gralloc 分配，没有映射到应用地址空间。不熟悉 Layer Surface 的话，可以将一个界面理解成一个 Layer Surface，Surface 存储了界面的数据，并交给 GPU 绘制。
上面 1 的数据是通过 load_maps 函数解析获取的，2 和 3 的数据是通过 read_memtrack_memory 函数获取的。该函数会读取和解析路径为 <strong>/d/kgsl/proc/{</strong> <strong>pid</strong> <strong>}/mem</strong> 的文件，这个文件节点中的数据是gpu driver写入的，该方法的实现可以参考下面高通855源码中的 kgsl_memtrack_get_memory 函数，下面是这个函数的主体逻辑代码。（官方源码：`kgsl.c`）

`int kgsl_memtrack_get_memory(pid_t pid, enum memtrack_type type,
                             struct memtrack_record *records,
                             size_t *num_records)
{
    ……
    // 1\. 设置目标文件路径
    snprintf(tmp, sizeof(tmp), "/d/kgsl/proc/%d/mem", pid);
    ……
    while (1) {
        // 2\. 读取并解析该文件
        ……
    }

    ……

    return 0;
}`

我们也可以在 root 手机中，查看 `kgsl_memtrack_get_memory` 函数读取到该应用进程的数据，下面是系统设置这个应用的部分 graphic 数据。

`/d/kgsl/proc/3160 # cat mem
         gpuaddr         useraddr             size    id     flags       type            usage sglen         mapcount eglsrf eglimg
0000000000000000 0           196608     1 --w---N--     gpumem           any(0)     0                0      0      0
0000000000000000 0            16384     2 --w--pY--     gpumem          command     0                1      0      0
0000000000000000 0             4096     3 --w--pY--     gpumem           any(0)     0                1      0      0
0000000000000000 0             4096     4 --w--pY--     gpumem           any(0)     0                1      0      0
0000000000000000 0             4096     5 --w--pY--     gpumem               gl     0                1      0      0
0000000000000000 0             4096     6 --w--pY--     gpumem           any(0)     0                1      0      0
0000000000000000 0             4096     7 --w--pY--     gpumem           any(0)     0                1      0      0
0000000000000000 0            20480     8 --w--pY--     gpumem           any(0)     0                1      0      0
0000000000000000 0             4096     9 --w--pY--     gpumem           any(0)     0                1      0      0
0000000000000000 0             4096    10 --w--pY--     gpumem           any(0)     0                1      0      0
0000000000000000 0           196608    11 --w---N--     gpumem           any(0)     0                0      0      0
0000000000000000 0            16384    12 --w--pY--     gpumem          command     0                1      0      0
0000000000000000 0             4096    13 --w--pY--     gpumem           any(0)     0                1      0      0
0000000000000000 0             4096    14 --w--pY--     gpumem           any(0)     0                1      0      0
0000000000000000 0             4096    15 --w--pY--     gpumem               gl     0                1      0      0
0000000000000000 0             4096    16 --w--pY--     gpumem           any(0)     0                1      0      0
0000000000000000 0             4096    17 --w--pY--     gpumem           any(0)     0                1      0      0
0000000000000000 0            32768    18 --w--pY--     gpumem           any(0)     0                1      0      0
0000000000000000 0             4096    19 --w--pY--     gpumem           any(0)     0                1      0      0
0000000000000000 0             4096    20 --w--pY--     gpumem           any(0)     0                1      0      0
0000000000000000 0            65536    21 --w--pY--     gpumem      arraybuffer     0                1      0      0
0000000000000000 0           131072    22 --wl-pY--     gpumem          command     0                1      0      0
0000000000000000 0            32768    23 --w--pY--     gpumem               gl     0                1      0      0
0000000000000000 0           131072    24 --wl-pY--     gpumem               gl     0                1      0      0
0000000000000000 0             8192    25 --w--pY--     gpumem          command     0                1      0      0
0000000000000000 0             8192    26 --w--pY--     gpumem          command     0                1      0      0
0000000000000000 0            16384    27 --w--pY--     gpumem          command     0                1      0      0
0000000000000000 0          9469952    28 --wL--N--        ion      egl_surface   152                0      1      1
0000000000000000 0           131072    29 --wl-pY--     gpumem          command     0                1      0      0
0000000000000000 0             8192    30 --w--pY--     gpumem          command     0                1      0      0
0000000000000000 0             4096    31 -----pY--     gpumem               gl     0                1      0      0
0000000000000000 0             4096    32 --w--pY--     gpumem           any(0)     0                1      0      0
0000000000000000 0             4096    33 -----pY--     gpumem               gl     0                1      0      0
0000000000000000 0             4096    34 --w--pY--     gpumem           any(0)     0                1      0      0
0000000000000000 0             4096    35 -----pY--     gpumem               gl     0                1      0      0
……`

#### 数据③：Alloc 内存

在<strong>内存描述指标</strong>这一部分，我们已经知道数据 ③ 中的数据是调用 malloc、mmap、calloc 等内存申请函数时积累的数据，想要获取这个数据，可以通过下面的接口实现。

- 获取 Java 层申请的内存：会直接去 Art 虚拟机中获取虚拟机已经申请的内存大小。
`Runtime runtime = Runtime.getRuntime();
//获取已经申请的Java内存 long usedMemory=runtime.totalMemory() ;
//获取申请但未使用Java内存 long freeMemory = runtime.freeMemory();`

- 获取 Native 申请的内存：会调用 android_os_Debug.cpp 对象中的android_os_Debug_getNativeHeapSize 接口获取数据，该接口又是调用的 mallinfo 函数，mallinfo 函数会返回 native 层已经申请的内存大小。
`//获取已经申请的Native内存
long nativeHeapSize = Debug.getNativeHeapSize()
//获取申请但未使用Native内存
long nativeHeapFreeSize = Debug.getNativeHeapFreeSize()

//Naitve层
static jlong android_os_Debug_getNativeHeapSize(JNIEnv *env, jobject clazz)
{
    struct mallinfo info = mallinfo();
    return (jlong) info.usmblks;
}`

我们可以看下 `mallinfo` 函数的说明文档：

![](/images/collections/0.raw/zhihu/%E4%BC%98%E5%8C%96/asset/img_d70460a093b7.jpg)

通过上面两个接口获取 Naitve 和 <strong>Java</strong> 的内存数据效率最高，性能消耗最小，所以适合在代码中做数据监控使用。<strong>通过读取和解析 maps 文件来获取内存数据对性能的开销较大，所以从 Android10 开始加了 5 分钟的频控。</strong>

### B区域

B 区域的数据就是将 A 区域中的 ① 数据做了汇总操作，方便我们查看，并没有太特别的内容，这里就简单列一下了。

- <strong>Java</strong> <strong>Heap</strong>：（Dalvik Heap 的 Private Dirty 数据) + （ .art mmap 部分的 Private Dirty 和 Private Clean 数据) + getOtherPrivate ( OTHER_ART ) 。这里的 .art 是应用的 dex 文件预编译后的 art 文件，所以也是属于该应用的 JavaHeap。
- <strong>Native Heap</strong>：Native Heap 的 Private Dirty 数据。
- <strong>Code</strong>：.so .jar .apk .ttf .dex .oat 等资源加总。
- <strong>Stack</strong>：getOtherPrivateDirty ( OTHER_STACK )。
- <strong>Graphics</strong>：gl，gfx，egl 的数据加总。
- <strong>System</strong>：( Total Pss ) - （ Private Dirty 和 Private Clean 的总和）。主要是系统占用的内存，如共享的字体、图像资源等。

### 小结

想要深入掌握 App 运行时的内存模型，夯实内存优化的基础，首先我们要熟悉描述内存的指标，它们是<strong>度量我们内存优化效果的重要工具。</strong>

常用的指标有 6 个，分别是共享库按比例分担的 Pss；进程在 RAM 中实际保存的总内存 RSS；只被当前进程独占的物理内存 Private Clean / Private Dirty；和 Private 相反的 Swap Pss Dirty；以及 Heap Alloc 和空闲的虚拟内存 Heap Free。获取这些指标的方法有两个，线下可以通过 adb 命令获取，线上可以通过代码获取。

其次，我们需要从原理上深入了解内存的组成，以及这些组成的来源，这样我们才能在内存优化中，做到有的放矢。我们重点掌握 3 类数据：maps 文件数据、graphic 相关数据和 Alloc 内

#### 更多Android 知识点归整

<strong>Android 性能调优系列</strong>：`https://0a.fit/dNHYY`

<strong>Android 车载学习指南</strong>：`https://0a.fit/jdVoy` 

<strong>Android Framework核心知识点笔记</strong>：`https://0a.fit/acnLL`

<strong>Android 音视频学习笔记</strong>：`https://0a.fit/BzPVh`

<strong>Jetpack全家桶（含Compose）</strong>：`https://0a.fit/GQJSl`

<strong>Kotlin 入门到精进</strong>：`https://0a.fit/kdfWR`

<strong>Flutter 基础到进阶实战</strong>：`https://0a.fit/xvcHV`

<strong>Android 八大知识体系</strong>：`https://0a.fit/mieWJ`

<strong>Android 中高级面试题锦</strong>：`https://0a.fit/YXwVq`

后续如有新知识点，将会持续更新，尽请期待……
