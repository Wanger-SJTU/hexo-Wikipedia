---
title: 浅谈C++内存管理
date: "2018-12-17 00:00:00"
updated: "2018-12-17 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/编程向/浅谈C-内存管理/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/51855842
---


### <strong>1.从内存对齐讲起</strong>

对于结构体变量内存对齐遵循以下[三个原则](https://www.zhihu.com/question/27862634/answer/208895189)：

- <strong>变量</strong>的<strong>起始地址</strong>能够被其对齐值整除，结构体变量的对齐值为最宽的成员大小。
- 结构体每个成员相对于<strong>起始地址的偏移</strong>能够被其<strong>自身对齐值整除</strong>，如果不能则在<strong>前一个成员后面</strong>补充字节。
- 结构体总体大小能够<strong>被最宽的成员的大小</strong>整除，如不能则在<strong>后面</strong>补充字节。
此外还有编译器的默认对齐值，一般默认对齐值为4(结构体的<strong>实际</strong>对齐值会取结构体对齐值和编译器默认对齐值中较小的那一个)。

那么为什么要内存对齐？

- 为了减少使用的内存
- 为了提升数据读取的效率
考虑以下的结构体：

`struct Test
{
	char a;
	int b;
	short c;
};
`

C++中可以使用alignof获取类型的对齐值，char类型的对齐值为1， int的对齐值为4, short的对齐值为2，整个结构体的对齐值为4。假设结构体变量的起始地址已经对齐，那么结构体的第一个成员a已经对齐，由于第一个成员a的大小为1而第二成员b的对齐值为4，则根据第二条对齐原则需要在第一个成员后填充3个字节才能使第二个成员对齐，第二个成员对齐后第三个成员的起始地址刚好为其对齐值的整数倍所以不需要进行填充，此时算上填充字节，结构体占用的总字节为10字节，又由第三条原则，结构体大小需要为4的整数倍，因此需要在第三个成员c后填充2个字节，可以算得结构体的总大小为12(在默认对齐值为2时，大小为8字节)。

改变结构体成员顺序如下：

`struct Test
{
	int b;
	short c;
	char a;
};
`

改变成员顺序后，若结构体变量的起始地址已经对齐，则根据原则2三个成员均以对齐，中间不需要进行填充，此时结构体占用的总字节为7，又由原则3需要在最后一个变量后填充1个字节，因此结构体总大小为8(在默认对齐值为2时，大小也为8字节)。

从上面的例子可以看出根据对齐原则合理安排结构体成员的顺序可以减少内存的占用。

现在考虑一个double类型的数组(double类型为8字节对齐)， 其在内存中所处的位置如下：

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_3552c0c25509.jpg)

数组的首地址为2，根据原则1数组未对齐。若CPU每次从内存中为8字节整数倍的地址开始读入8字节的数据，则每次从未对齐的数组中读取一个成员都要进行两次读取操作，而从对齐的数组中读取则只需要一次读取操作，数组对齐时读取效率有较大提升（虽然现在也有很多处理器支持非对齐的读取，但是还是推荐对齐)。

**

### 2.操作系统与C内存管理机制**

a.windows内存管理机制

Windows系统中的内存分配机制如下图所示：

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_c53e47521063.jpg)

Windows内存管理机制操作系统将Physical Memory映射为连续的Virtual Memory(通过TLB)，并提供了一些与Virtual Memory相关的API(VirtualAlloc，VirtualFree...)对Virtual Memory进行管理，在Virtual Memory API之上又构建了Heap Memory Memory API(HeapALloc...)，而C的内存管理机制(malloc，free)就构建在 Heap Memory Memory API之上。

使用Virtual Alloc分配内存时，每次只能分配页面大小(默认4KB)整数倍的连续虚拟内存(但是两次连续调用所分配的内存并不一定连续)。

b.Linux内存管理机制

Linux中可以借助brk或mmap函数从用户空间中申请连续内存。

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_f119eea7f15a.jpg)

Linux寻址空间(32位)，用户空间为3GB，内核空间为1GB通过调用brk(0)可以获取指向用户空间某一地址的指针，随后调用brk(len)可以在原指针地址的基础上移动该指针以达到申请或释放内存的目的。而mmap则是直接在用户空间中申请一块连续的空闲内存。(更详细的Linux内存分配机制可以参见1)

c.C内存管理机制

C/C++程序的内存布局如下：

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_698528eae940.jpg)

C/C++ Memory Layout从Code Segment到Stack的内存地址均位于用户空间中，其地址空间由低到高。其中：

- Code Segment(代码段或Text Segment)中存放着程序的机器码和只读数据，可执行指令就是从这里取得的。如果可能，系统会安排相同程序的多个运行实体共享这些实例代码。这个段在内存中一般被标记为只读，任何对该区的写操作都会导致段错误（Segmentation Fault）。
- Data Segment中存放已初始化的全局或静态变量。
- BSS中存放未初始化的全局或静态变量。
- Heap(堆)，堆的大小并不固定，可动态扩张或缩减。其分配由malloc()、new()等这类实时内存分配函数来实现(brk函数也是从这里分配内存)。
- Stack(栈)，用来存储函数调用时的临时信息，如函数调用所传递的参数、函数的返回地址、函数的局部变量等。 在程序运行时由编译器在需要的时候分配，在不需要的时候自动清除。栈内存的申请和释放遵循LIFO(先进后出)。
堆和栈有哪些不同？(引用2)

1.分配和管理方式不同

堆是动态分配的，其空间的分配和释放都由程序员控制。  

栈由编译器自动管理。栈有两种分配方式：静态分配和动态分配。静态分配由编译器完成，比如局部变量的分配。动态分配由_alloca()函数进行分配，但是栈的动态分配和堆是不同的，它的动态分配是由编译器进行释放，无须手工控制。

2.产生碎片不同

对堆来说，频繁的new/delete或者malloc/free可能会造成内存空间的不连续，造成大量的碎片，使程序效率降低。

对栈而言，则不存在碎片问题，因为栈是先进后出的队列，永远不可能有一个内存块从栈中间弹出。

3.增长方向不同

堆由低地址向高地址增长。

栈由高地址向低地址增长。

### <strong>3.Malloc的简单实现</strong>

本节将会介绍如何实现一个简单的malloc，这里采用的内存管理方式为：先通过_aligned_malloc申请一块8字节对齐的内存(也可以采用VirtualAlloc分配)，然后实现malloc和free函数对这块内存进行管理。

这里将内存以块(Block)的方式进行管理，每块内存分为标记区(Header)和数据区(Data)，块的定义如下：

`#define BLOCK_MAGIC_FLAG 0xF
#define BLOCK_MAGIC_NUMBER 0xA

struct BlockNode
{
	BlockNode *m_next;
	size_t m_flag;
};
`

Header中记录了指向下一块内存的指针和一个size_t类型的flag，flag的前4位中记录了一个Magic Number用来标记这块内存是否由我们所实现的Malloc申请得到的，而其它位记录了这块内存数据区的大小。

![](/images/collections/0.raw/zhihu/%E7%BC%96%E7%A8%8B%E5%90%91/asset/img_317a86334731.jpg)

Header的结构这里定义了一些简单的函数来帮助读取或设置flag中的信息：

`inline bool SimpleBlockIsValid(const BlockNode *pNode)
{
	if (pNode != nullptr)
	{
		size_t flag = pNode->m_flag & BLOCK_MAGIC_FLAG;
		if (flag == BLOCK_MAGIC_NUMBER)
		{
			return true;
		}
	}
	
	return false;
}

inline size_t GetSimpleBlockSize(const BlockNode *pNode)
{
	return pNode->m_flag >> 4;
}

inline void SetSimpleBlockSize(BlockNode *pNode, size_t pSize)
{
	size_t flag = (pSize m_flag = flag;
}`

定义一个SimpleAllocator类，类中维持一个指向所有空闲内存块的FreeList。在类的构造函数中通过_aligned_malloc申请一块8字节对齐的内存，并在析构函数中释放了这块内存。

`class SimpleAllocator
{
public:
	SimpleAllocator(size_t pSize, SEARCH_MODE pMode)
	{
		m_size = ToMultiple(pSize, 8);
		m_data = _aligned_malloc(m_size, 8);
		m_mode = pMode;
		memset(m_data, 0, m_size);

		InitFreeList(m_data, m_size);
	}

	~SimpleAllocator() 
	{
		if (m_data != nullptr)
		{
			_aligned_free(m_data);
		}
	}
private:
	BlockNode *m_freeList;
	void *m_data;
	size_t m_size;
	size_t m_numAllocations;
	size_t m_remainSize;
	SEARCH_MODE m_mode;
}`

m_numAllocations记录了申请和释放内存的次数(每次申请内存时加一，释放时减一)，m_remainSize记录了空闲块数据区的总大小。

除了申请内存外，构造构造函数还负责初始化FreeList(直接在申请的内存上构建一个空闲块并将其添加到freelist中):

`	void InitFreeList(void *pStart, size_t pSize)
	{
#ifdef _DEBUG
		assert(pStart != nullptr);
#endif // _DEBUG

		m_numAllocations = 0;
		m_remainSize = pSize - sizeof(BlockNode);

		m_freeList = static_cast(pStart);
		m_freeList->m_next = nullptr;
		SetSimpleBlockSize(m_freeList, m_remainSize);
	}`

每次申请内存时需要在FreeList中找到合适大小的空闲内存块，这是可以采用两种不同的查找方法：

- First fit，返回第一个数据区大小大于等于所申请内存的空闲块。
- Best fit，检查所有块，返回数据区和所申请内存大小差距最小且大于等于所需内存的空闲块。
`enum class SEARCH_MODE
{
	FIRST_FIT,
	BEST_FIT
};	

bool GetProperBlock(size_t pSize, SEARCH_MODE pMode, BlockNode <strong>pPrevNode, BlockNode</strong>pFoundNode)
{
	if (pMode == SEARCH_MODE::FIRST_FIT)
	{
		return GetFirstFitBlock(pSize, pPrevNode, pFoundNode);
	}

	return GetBestFitBlock(pSize, pPrevNode, pFoundNode);
}`

First fit的查找实现如下：

`	bool GetFirstFitBlock(size_t pSize, BlockNode <strong>pPrevNode, BlockNode</strong>pFoundNode)
	{
		BlockNode *prev = nullptr;
		BlockNode *curr = m_freeList;
		bool success = false;

		while (curr != nullptr)
		{
			if (GetSimpleBlockSize(curr) >= pSize)
			{
				success = true;
				break;
			}
			
			prev = curr;
			curr = curr->m_next;
		}

		*pPrevNode = prev;
		*pFoundNode = curr;
		return success;
	}`

Best fit的查找实现如下：

`	bool GetBestFitBlock(size_t pSize, BlockNode <strong>pPrevNode, BlockNode</strong>pFoundNode)
	{
		BlockNode *prev = nullptr;
		BlockNode *curr = m_freeList;
		bool success = false;

		BlockNode *best = nullptr;
		BlockNode *bestPrev = nullptr;
		size_t bestSize = m_size;

		while (curr != nullptr)
		{
			size_t currSize = GetSimpleBlockSize(curr);
			if (currSize >= pSize)
			{
				success = true;
				if (currSize m_next;
		}

		*pPrevNode = bestPrev;
		*pFoundNode = best;
		return success;
	}`

若找到的空闲内存块的大小大于所需内存大小+sizeof(BlockNode)，则可以将该空闲块分裂为两个新的块，并将新分出的块插入到FreeList中：

`	void SplitBlock(BlockNode *pOld, size_t pSize)
	{
#ifdef _DEBUG
		assert(pOld != nullptr);
#endif // _DEBUG

		size_t oldBlockSize = GetSimpleBlockSize(pOld);		

#ifdef _DEBUG
		assert(oldBlockSize > pSize);
#endif // _DEBUG

		BlockNode *newBlock = static_cast(PointerAdd(&pOld, pSize + sizeof(BlockNode)));
		SetSimpleBlockSize(newBlock, oldBlockSize - pSize - sizeof(BlockNode));

		SetSimpleBlockSize(pOld, pSize);

		InsertNode(pOld, newBlock);

#ifdef _DEBUG
		std::cout 

FreeList的插入和删除操作定义如下（均需要插入或删除节点的前驱结点，若前驱结点为空则需要操作的节点为FreeList的头节点）：

`	void RemoveNode(BlockNode *pPrev, const BlockNode *pDelete)
	{
#ifdef _DEBUG
		assert(pDelete != nullptr);
#endif // _DEBUG

		if (pPrev != nullptr)
		{
			pPrev->m_next = pDelete->m_next;
		}
		else
		{
			m_freeList = pDelete->m_next;
		}
	}

	void InsertNode(BlockNode *pPrev, BlockNode *pNew)
	{
#ifdef _DEBUG
		assert(pNew != nullptr);
#endif // _DEBUG

		if (pPrev != nullptr)
		{
			pNew->m_next = pPrev->m_next;
			pPrev->m_next = pNew;
		}
		else
		{
			pNew->m_next = m_freeList;
			m_freeList = pNew;
		}
	}
`

Malloc的完整定义如下(Malloc时每次申请的内存大小会被缩放为8的倍数)：

`	void *Malloc(size_t pSize)
	{
		size_t dataSize = ToMultiple(pSize, 8);

		if (dataSize  (pSize + sizeof(BlockNode)))
				{
					SplitBlock(found, pSize);
					allocateSize = pSize + sizeof(BlockNode);
				}

				RemoveNode(prev, found);

				m_remainSize -= allocateSize;

				++m_numAllocations;

#ifdef _DEBUG
				std::cout 

若所需内存为0或者所需内存大于剩余总空闲内存则直接返回空指针(malloc(0)是未定义型为也可以返回一个无法使用但可以被释放的内存块，即只有Header的块)，分配成功后将符合要求的空闲内存块移出FreeList，并返回指向该块数据区的指针。

释放由Malloc所申请的内存时，首先需要检查该内存是否由Malloc申请得到(通过检查头节点flag的magic number)，然后通过指针比较，找到该内存块在FreeList中的前驱节点(FreeList中的节点以地址从小到大的顺序排列)，查找前驱节点的函数定义如下：

`	bool GetPrevNode(BlockNode **pPrev, BlockNode *pNode)
	{
#ifdef _DEBUG
		assert(pNode != nullptr);
#endif // _DEBUG

		bool success = false;

		BlockNode *prev = nullptr;
		BlockNode *curr = m_freeList;

		while (curr != nullptr)
		{
			if (pNode  curr)
			{
				success = true;
				break;
			}

			prev = curr;
			curr = curr->m_next;
		}

		*pPrev = prev;
		return success;
	}
`

有了前驱节点和需要释放的内存块后，可以将需要释放的内存块插入到FreeList中，这时可以判断所需释放的内存块的前部和后部的内存块(不是FreeList中的前驱或后驱节点，而是和需要释放的内存块地址连续邻接的内存块)是否处于空闲状态(可以通过指针的地址进行检查所后驱节点和前驱节点与该节点的内存地址连续则为邻接块)，若是则进行合并。

`	void MergeBlock(BlockNode *pPrev, BlockNode *pMerge)
	{		
#ifdef _DEBUG
		assert(pMerge != nullptr);
#endif // _DEBUG

		size_t mergeNodeSize = GetSimpleBlockSize(pMerge);

		m_remainSize += mergeNodeSize;

		if (pMerge->m_next != nullptr)
		{
			size_t nextNodeSize = GetSimpleBlockSize(pMerge->m_next);
			if (static_castBlockNode*>(PointerAdd(&pMerge, mergeNodeSize + sizeof(BlockNode))) == pMerge->m_next)
			{
				RemoveNode(pMerge, pMerge->m_next);
				mergeNodeSize = mergeNodeSize + sizeof(BlockNode) + nextNodeSize;
				SetSimpleBlockSize(pMerge, mergeNodeSize);
				m_remainSize += sizeof(BlockNode);
#ifdef _DEBUG
				std::cout  "Merge block with next block, size after merge :"  mergeNodeSize std::endl;
#endif // _DEBUG
			}
		}

		if (pPrev != nullptr)
		{
			size_t prevNodeSize = GetSimpleBlockSize(pPrev);
			if (static_castBlockNode*>(PointerAdd(&pPrev, prevNodeSize + sizeof(BlockNode))) == pMerge)
			{
				RemoveNode(pPrev, pMerge);
				mergeNodeSize = mergeNodeSize + sizeof(BlockNode) + prevNodeSize;
				SetSimpleBlockSize(pPrev, mergeNodeSize);
				m_remainSize += sizeof(BlockNode);
#ifdef _DEBUG
				std::cout  "Merge block with prev block, size after merge :"  mergeNodeSize  std::endl;
#endif // _DEBUG
			}
		}
	}
`

Free函数的具体实现如下：

`	void Free(void *pPtr)
	{
		if (pPtr != nullptr)
		{
			BlockNode *freeBlock = static_castBlockNode*>(pPtr) - 1;
			if (SimpleBlockIsValid(freeBlock))
			{
				BlockNode *prev = nullptr;
				GetPrevNode(&prev, freeBlock);
				InsertNode(prev, freeBlock);
				MergeBlock(prev, freeBlock);

				--m_numAllocations;
#ifdef _DEBUG
				std::cout  "Free success, num allocations: "  m_numAllocations  std::endl;
				std::cout  "Remain size: "  m_remainSize  std::endl;
#endif // _DEBUG
			}
		}
	}
`

由于初始申请的一大块内存为8字节对齐，Header的大小为8，每次申请的内存大小也为8的倍数，所以Malloc所返回的指针均为8字节对齐，这种实现的优点是比较简单，而且对任何对齐大小(1,2,4,8字节对齐)都可以实现对齐，缺点是若所需的内存大小不是8的倍数则会浪费一部分的内存...。若想要实现更节省内存一点的分配方式则可以参考引用3中的实现，每次分配时计算内存对齐地址，然后再进行分配可以节省一些内存。

这里的Malloc实现只是一个玩具而已...，实际的malloc实现会更复杂一些，需要考虑到更多的问题(参见引用6)。

Linux中malloc的实现，以及原理可以参考引用4和引用5。

ps:什么是内存碎片？

如果如果每次分配8字节内存，且每相邻的两块内存一个被使用而另一个空闲，此时总的空闲内存远大于8字节(空闲内存为：8*N，N为空闲块的数量)，但是此时却无法再分配一个16字节的内存，因为所有空闲块都不是连续的。

### <strong>4.C++new，delete的原理与实现</strong>

C++中的new有三种形态：

- new operator即我们经常使用的T *ptr = new T()。
- operator new，类或结构体可以通过重载operator new来决定如何为对象分配内存，与之对应的还有operator delete。operator new可以被new operator调用，如下所示：
`struct MyStruct
{
	void *operator new(size_t pSize)
	{
		std::cout  "operator new！"  std::endl;
		return malloc(pSize);
	}

	void operator delete(void *pPtr)
	{
		std::cout  "operator delete！"  std::endl;
		free(pPtr);
	}
};
`

3. placement new，placement new可以实现在一块指定的内存上(这块内存可以由任意方式分配)构造对象(调用对象的构造函数)。如下所示：

`	void *memory = malloc(sizeof(Test));
	Test *pt = new(memory) Test();
	pt->~Test();
	free(memory);
`

由palcement new构造的对象在析构时，如果由析构函数则需要在释放时显式调用析构函数(不需要调用delete来释放内存)。

new，delete与malloc，free之间的关系与差别(引用7)：

- new操作符从自由存储区（free store）上为对象动态分配内存空间，而malloc函数从堆上动态分配内存。自由存储区是C++基于new操作符的一个抽象概念，凡是通过new操作符进行内存申请，该内存即为自由存储区。而堆是操作系统中的术语，是操作系统所维护的一块特殊内存，用于程序的内存动态分配，C语言使用malloc从堆上分配内存，使用free释放已分配的对应内存。那么自由存储区是否能够是堆（问题等价于new是否能在堆上动态分配内存），这取决于operator new 的实现细节。自由存储区不仅可以是堆，还可以是静态存储区，这都看operator new在哪里为对象分配内存。
- new操作符内存分配成功时，返回的是对象类型的指针，类型严格与对象匹配，无须进行类型转换，故new是符合类型安全性的操作符。而malloc内存分配成功则是返回void * ，需要通过强制类型转换将void*指针转换成我们需要的类型。
- new内存分配失败时，会抛出bac_alloc异常，会返回NULL；malloc分配内存失败时返回NULL。
- 使用new操作符申请内存分配时无须指定内存块的大小，编译器会根据类型信息自行计算，而malloc则需要显式地指出所需内存的尺寸。
- new，delete会调用对象的构造和析构函数同时申请或释放内存，而malloc，free则不会调用构造或析构函数。
- C++提供了new[]与delete[]来专门处理数组类型
- operator new /operator delete的实现可以基于malloc，而malloc的实现不可以去调用new。
如果是使用malloc分配的内存则释放时一定要调用free，而使用new分配的内存则释放时一定要调用delete。

这里我们可以借助与之前实现的Malloc和palcement new来实现一个简单的New与Delete函数：

`template
T *New(SimpleAllocator &pAllocator, Args&&... pArgs)
{
	return new (pAllocator.Malloc(sizeof(T))) T(std::forward(pArgs)...);
}

template
void Delete(SimpleAllocator &pAllocator, T *pPtr)
{
	pPtr->~T();
	pAllocator.Free(pPtr);
}`

可以通过如下方式进行调用：

`SimpleAllocator allocator(16 * 1024 * 1024, SEARCH_MODE::FIRST_FIT);

VinClass *temp = New(allocator, 16);
Delete(allocator, temp);`

这里没有实现new[]，delete[]，可以在块内存的Header中添加信息记录分配的内存是否被数组使用，若是则在new[] 和delete[]中为数组中的所有对象调用构造或析构函数。

**

### 结语：**

其实在实际使用中，大部分时候我们并不需要自己从头开始编写malloc或者new，因为标准库中的实现以及在大部分情况下表现的足够好，但是在一些特殊的情况下(比如在游戏中需要短时间内申请释放大量的小内存块)，这时可以考虑一些简化的特殊的实现，可以提高在特殊场合中内存申请和释放的速度(可以参考引用3)。又或者出于Debug的考虑也可以实现特殊的内存管理机制，在自己编写的内存管理程序中可以更方便的插入各种统计功能或者内存泄露检测功能。

**

### 引用：**

1.Linux内存管理原理 - aitao - 博客园

2.程序在内存中的分布 - ProLyn - 博客园

3.C++: Custom memory allocation

4.CodingLabs - 如何实现一个malloc

5.内存管理内幕

6.A Memory Allocator

7.c++ new 与malloc有什么区别
