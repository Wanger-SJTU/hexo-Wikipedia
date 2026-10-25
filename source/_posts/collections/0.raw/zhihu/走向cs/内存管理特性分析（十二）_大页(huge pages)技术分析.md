---
title: 内存管理特性分析（十二）:大页(huge pages)技术分析
date: "2023-03-05 00:00:00"
updated: "2023-03-05 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/走向cs/内存管理特性分析(十二)_大页(huge-pages)技术分析/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/609457879
---


### <strong>1. 技术背景</strong>

现代处理器的内存管理单元(MMU)大多都支持多种大小的page size。但内核长期以来默认使用4k大小的page size。对大于4k的页，我们统称为 “大页（huge pages”）。在某些应用场景下，使用 huge pages 可以获得更好的性能，可惜的是，这种性能优势在 Linux 2.6.38以前几乎一直未被利用。从内核版本 2.6.38 开始，大页的支持使得这种状况将会发生转变。

使用大页的好处:

- <strong>在TLB容量固定的情况下，提高TLB的命中率。</strong>如果采用大小为 2MB 的 huge page，一个 huge page 只需要对应一项 TLB 条目；同样大小的内存，换成使用 4KB 大小的页，则需要 512 项 TLB 条目。这么一对比，为何使用 huge page 可以使得程序运行得更快也就不用过多地解释了。
- <strong>减少了页表级数，也可以减少查找页表的时间。</strong>大页使得页表级数减少，例如原来从多达4级的页表可以减少到2级。查找页表的时间会明显改善。
- <strong>减少缺页异常（page fault）的发生次数。</strong>假设应用程序需要 2MB 的内存，如果操作系统以 4KB 作为分页的单位，则需要512 次缺页异常才能将 2MB 应用程序空间全部映射到物理内存；然而当采用 2MB 作为分页时，只需要一次缺页异常就能完成。

### <strong>2. 大页分类</strong>

在 Linux 中大页分为两种： Huge pages ( 标准大页 ) 和  Transparent Huge pages( 透明大页 ) 。<strong>标准大页</strong>：使用hugetlbfs伪文件系统，其在/mnt/huge/ 目录下创建的文件，将其映射到内存中时都会使用 大页进行映射。值得一提的是，hugetlbfs 中的文件是不支持读写系统调用 ( 如read()或write()等 ) 的，一般对它的访问都是以内存映射的形式进行。<strong>透明大页</strong>： 标准大页的优点是预先分配大页， 进程申请大页的时候到大页内存池中分配，成功概率很高。缺点应用程序需要特定适配使用文件系统编程接口。透明大页则是对应用程序透明，使其更容易使用，缺点是动态分配内存，大块连续内存在使用过程中由于内存碎片原因分配成功率会比较低。**总结起来，两者最大区别是标准大页使用内存是预分配的方式，而透明大页使用内存则是动态分配的方式。

### 3. ARM64的支持**

ARM64 支持两种类型的大页。

- pud/pmd 级别的块映射**这些是常规的大页面，其中 pmd 或 pud 页表条目指向内存块。无论 TLB 中支持的条目大小如何，块映射都会减少转换大页面地址所需的页表遍历深度。
![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_46c4896efe2b.jpg)

- 使用连续位
该体系结构在转换表条目中提供了一个连续位，该位向 MMU 提示以指示它是可以缓存在单个 TLB 条目中的一组连续条目。在 Linux 中，连续位用于增加 pmd 和 pte（最后一个）级别的映射大小。支持的连续条目的数量因页大小和页表级别而异。

支持以下大页面大小：

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_0d99b1dcfa0c.jpg)

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_ba95b724d39d.jpg)

### 4. 标准大页(hugetlbfs)**

#### <strong>4.1 标准大页的使用</strong>

标准大页的使用不像普通内存申请那么简单，而是需要借助 Hugetlb文件系统来创建，下面将会介绍 HugePages 的使用步骤：

- 挂载 Hugetlb 文件系统, 执行完下面的命令后，我们就在 /mnt/huge 目录下挂载了 Hugetlb 文件系统。
$ mkdir /mnt/huge $ mount none /mnt/huge -t hugetlbfs

- 配置可用 HugePages 数量, 下面命令设置了可用的 HugePages 数量为 20 个(也就是 10 个 2MB 的内存页)。
$ echo 10 > /proc/sys/vm/nr_hugepages也可以命令行配置

sudo grubby --update-kernel=ALL --args="hugepagesz=1G default_hugepagesz=1G hugepages=10"

- 编写申请 HugePages 的代码

```cpp
#include  
#include  
#include  
#include  

#define MAP_LENGTH (10*1024*1024) // 10MB 

int main() 
{ 
    int fd; 
    void * addr; 

    // 1. 打开 Hugetlb 文件系统的文件 
    fd = open("/mnt/huge/hugepage1", O_CREAT|O_RDWR); 
    if (fd  0) { 
        perror("open()"); 
        return -1; 
    } 

    // 2. 把虚拟内存映射到 Hugetlb 文件系统的文件中 
    addr = mmap(0, MAP_LENGTH, PROT_READ|PROT_WRITE, MAP_SHARED, fd, 0); 
    if (addr == MAP_FAILED) { 
        perror("mmap()"); 
        close(fd); 
        unlink("/mnt/huge/hugepage1"); 
        return -1; 
    } 

    strcpy(addr, "This is HugePages example..."); 
    printf("%s\n", addr); 

    // 3. 使用完成后，解除映射关系 
    munmap(addr, MAP_LENGTH); 
    close(fd); 
    unlink("/mnt/huge/hugepage1"); 

    return 0; 
```

}`

#### <strong>4.2 实现原理</strong>

- <strong>标准大页内存预分配</strong>
![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_223b0cac6487.jpg)

- <strong>标准大页映射</strong>
![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_f4df068dae84.png)

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_976e858cc46c.jpg)

**

### 5. 透明大页(THP)**

透明大页之所以叫透明大页，是因是其对应用进程而言是透明的，如果虚拟内存足够大并且允许使用大页，那么内核在分配内存时会优先为其分配大页，如果大页分配失败，使用普通小页分配。

#### <strong>5.1 透明大页的使用</strong>

**echo always >/sys/kernel/mm/transparent_hugepage/enabled
echo madvise >/sys/kernel/mm/transparent_hugepage/enabled
echo never >/sys/kernel/mm/transparent_hugepage/enabledAlways：总是使用透明大页
Madvise：仅针对madvise（MADV_HUGEPAGE）指定的虚拟地址范围使用透明大页。
Never：从不使用透明大页

#### 5.2 实现原理**

- <strong>透明大页映射</strong>
![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_4e618d6c4d99.jpg)

【PUD】:当发生缺页异常时，如果PUD目录项为空，并且VMA区域允许使用透明大页，通过create_huge_pud分配并映射到大页。如果分配大页失败，会回退使用PMD级别的大页。**如果PUD指向大页， 页表项没有设置写权限，但VMA有写权限，那么此时为写时复制，执行wp_huge_pud。如果分配大页失败，会回退使用PMD级别的大页。
【PMD】:如果PMD目录项不存在， 先创建PMD目录项，如果PMD目录为空且VMA区域允许使用大页，那么分配大页，PMD页表项指向大页，如果分配大页失败，会回退使用PTE级别的普通页。如果PMD指向大页， 页表项没有设置写权限，但VMA有写权限，那么此时为写时复制，执行wp_huge_pmd。如果分配大页失败，会回退使用PMD级别的大页。
【PTE】:到PTE这级就是使用的不是大页而是普通页了，这时分配并映射普通页。

- 透明大页解映射****当进程通过munmap释放内存的时候, 虚拟地址区域可能映射到透明大页, 可能是释放整个大页,也可能是释放大页的一部分。
整体流程如下：
![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_732982d24c34.jpg)

__split_huge_pmd函数把PMD级别透明大页分裂成普通页,流程如下:

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_78d26d688872.jpg)

从上面可以看到, 针对文件页映射,内核选择了直接解除映射而不是将其分裂, 主要是原因是觉得文件页分裂复杂度较高,还不如直接将其解映射。

- 透明大页分裂**
当进程使用munmap释放大页一部分时，需要把大页进行分裂成普通页，透明大页分裂前后如下图所示：

【分裂前】：

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_f370d26ae934.jpg)

【分裂后】：

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_9ac3d518a579.jpg)

分析过程主要是取出开始时预留的PTE页表，修改PMD页表指向PTE页表，PTE页表项目指向每个普通页。释放指定的普通页后把PTE删除。

分裂过程分为页表分裂和大页分裂，具体实现分析如下。

<strong>1) 页表分裂</strong>**split_huge_pmd这个函数就是只切分一个进程里大页的映射,其他进程里同样的内存空间还可能是大页映射, 其他进程仍然是仍然可以享受大页带来的收益。

透明大页支持页表拆分，这样可以在必要的时候退回到四级页表。实现如下：

```cpp
static void __split_huge_pmd_locked(struct vm_area_struct *vma, pmd_t *pmd,
		unsigned long haddr, bool freeze)
{
	struct mm_struct *mm = vma->vm_mm;
	struct page *page;
	pgtable_t pgtable;
	pmd_t old_pmd, _pmd;
	bool young, write, soft_dirty, pmd_migration = false, uffd_wp = false;
	unsigned long addr;
	int i;

	count_vm_event(THP_SPLIT_PMD);
```

…

```cpp
    //把预留的pte页表项目拿出来，从三级页表变四级页表需要新增1个页表项
	pgtable = pgtable_trans_huge_withdraw(mm, pmd);
    //pmd目录指向pte
	pmd_populate(mm, &_pmd, pgtable);
    //对每个page设置上对应的pte页表项
	for (i = 0, addr = haddr; i  HPAGE_PMD_NR; i++, addr += PAGE_SIZE) {
		pte_t entry, *pte;
		if (freeze || pmd_migration) {
			swp_entry_t swp_entry;
			swp_entry = make_migration_entry(page + i, write);
			entry = swp_entry_to_pte(swp_entry);
			if (soft_dirty)
				entry = pte_swp_mksoft_dirty(entry);
			if (uffd_wp)
				entry = pte_swp_mkuffd_wp(entry);
		} else {
			entry = mk_pte(page + i, READ_ONCE(vma->vm_page_prot));
			entry = maybe_mkwrite(entry, vma->vm_flags);
			if (!write)
				entry = pte_wrprotect(entry);
			if (!young)
				entry = pte_mkold(entry);
			if (soft_dirty)
				entry = pte_mksoft_dirty(entry);
			if (uffd_wp)
				entry = pte_mkuffd_wp(entry);
		}
		pte = pte_offset_map(&_pmd, addr);
		BUG_ON(!pte_none(*pte));
		set_pte_at(mm, addr, pte, entry);
		if (!pmd_migration)
			atomic_inc(&page[i]._mapcount);
		pte_unmap(pte);
	}

	if (!pmd_migration) {
		/*
		 * Set PG_double_map before dropping compound_mapcount to avoid
		 * false-negative page_mapped().
		 */
		if (compound_mapcount(page) > 1 &&
		    !TestSetPageDoubleMap(page)) {
			for (i = 0; i  HPAGE_PMD_NR; i++)
				atomic_inc(&page[i]._mapcount);
		}

		lock_page_memcg(page);
		if (atomic_add_negative(-1, compound_mapcount_ptr(page))) {
			/* Last compound_mapcount is gone. */
			__dec_lruvec_page_state(page, NR_ANON_THPS);
			if (TestClearPageDoubleMap(page)) {
				/* No need in mapcount reference anymore */
				for (i = 0; i  HPAGE_PMD_NR; i++)
					atomic_dec(&page[i]._mapcount);
			}
		}
		unlock_page_memcg(page);
	}

	smp_wmb(); /* make pte visible before pmd */
	pmd_populate(mm, pmd, pgtable);

	if (freeze) {
		for (i = 0; i  HPAGE_PMD_NR; i++) {
			page_remove_rmap(page + i, false);
			put_page(page + i);
		}
	}
```

}`

实例推演一下页表分裂的过程。假设2个进程以PMD映射到一个thp大页，当进程A发生页表， 分裂前如下所示：

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_51db156f3aa8.jpg)

分裂后如下所示：

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_da8c05c2f54a.jpg)

2) 大页分裂**

拆分页表最终的目的也是为了拆分大页，这样在系统内存不够时可以回收大页中没有使用的部分。最终通过split_huge_page_to_list函数实现拆分大页

```cpp
int split_huge_page_to_list(struct page *page, struct list_head *list)
{
	struct page *head = compound_head(page);
	struct pglist_data *pgdata = NODE_DATA(page_to_nid(head));
	struct deferred_split *ds_queue = get_deferred_split_queue(head);
```

…

```text
    /*解映射，try_to_unmap_one—>__split_huge_pmd_locked，这个过程也可能会拆分页表，如果页表已经拆分过了，就不需要再拆分了。*/
	unmap_page(head); 
```


	。。。

```text
       //分裂页面
		__split_huge_page(page, list, end, flags);
		ret = 0;
	} else {
		spin_unlock(&ds_queue->split_queue_lock);
```

fail:

```text
		if (mapping)
			xa_unlock(&mapping->i_pages);
		spin_unlock_irqrestore(&pgdata->lru_lock, flags);
		remap_page(head, thp_nr_pages(head));
		ret = -EBUSY;
	}
```


out_unlock:

```text
	if (anon_vma) {
		anon_vma_unlock_write(anon_vma);
		put_anon_vma(anon_vma);
	}
	if (mapping)
		i_mmap_unlock_read(mapping);
```

out:

```text
	count_vm_event(!ret ? THP_SPLIT_PAGE : THP_SPLIT_PAGE_FAILED);
	return ret;
```

}`

进程页表分裂后，其实还是没能进行内存回收。当进程B也发生的页表分裂，那么由于THP大页没有大页映射，会在内存回收时拆分大页。如下所示：

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_dae3ec155e49.jpg)

当反向映射时，映射的进程都对某个普通页解除映射后，page的mapcount等于-1，refcount等于0，就可以进行释放了。

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_664055685471.jpg)

<strong>3) deferred_split</strong>

当进程munmap大页的一部分时，并不会马上发生同步的大页分裂，因为在进程munmap的上面文进行大页分裂开销很高，现在是在反向映射时进行感知，通过deferred_split机制进行。

 当page发生反向映射时page_remove_rmap发现page的mapcount等于-1即已经没有进程对这个page进行映射。就会将此page通过deferred_split_huge_page加入链表中，在下次内存压力紧张时进行shrink拆分回收。

```cpp
void page_remove_rmap(struct page *page, bool compound)
{
	lock_page_memcg(page);
    //如果是文件页，通过文件页的方式反向映射。主要是mapcount的统计差异
	if (!PageAnon(page)) {
		page_remove_file_rmap(page, compound);
		goto out;
	}
    //如果是整体反向映射，整体对大页的mapcount计数进行减1
	if (compound) {
		page_remove_anon_compound_rmap(page);
		goto out;
	}
    //对page的mapcount减1后如果不等于-1，即还有进程进行映射，退出
	/* page still mapped by someone else? */
	if (!atomic_add_negative(-1, &page->_mapcount))
		goto out;

	//走到这里， page已经进程进程映射了，计数处理
	__dec_lruvec_page_state(page, NR_ANON_MAPPED);
    //如果page带mlock标记，清除它
	if (unlikely(PageMlocked(page)))
		clear_page_mlock(page);
    //如果是thp大页，把page加到deferred_split的链表， 在下次内存紧张shrink时进分裂回收
	if (PageTransCompound(page))
		deferred_split_huge_page(compound_head(page));
```

out:

```text
	unlock_page_memcg(page);
```

}`

在反向映射时如果page已经没有进程映射了， 就会把page加到deferred_split的链表， 在下次内存紧张shrink时进分裂回收。通过deferred_split_huge_page进行。

```cpp
void deferred_split_huge_page(struct page *page)
{
	struct deferred_split *ds_queue = get_deferred_split_queue(page);
#ifdef CONFIG_MEMCG
	struct mem_cgroup *memcg = compound_head(page)->mem_cgroup;
#endif
	unsigned long flags;

	VM_BUG_ON_PAGE(!PageTransHuge(page), page);

	/*
	 * The try_to_unmap() in page reclaim path might reach here too,
	 * this may cause a race condition to corrupt deferred split queue.
	 * And, if page reclaim is already handling the same page, it is
	 * unnecessary to handle it again in shrinker.
	 *
	 * Check PageSwapCache to determine if the page is being
	 * handled by page reclaim since THP swap would add the page into
	 * swap cache before calling try_to_unmap().
	 */
	if (PageSwapCache(page))
		return;

	spin_lock_irqsave(&ds_queue->split_queue_lock, flags);
	if (list_empty(page_deferred_list(page))) {
		count_vm_event(THP_DEFERRED_SPLIT_PAGE);
        //加到ds_queue->split_queue
		list_add_tail(page_deferred_list(page), &ds_queue->split_queue);
		ds_queue->split_queue_len++;
#ifdef CONFIG_MEMCG
		if (memcg)
			memcg_set_shrinker_bit(memcg, page_to_nid(page),
					       deferred_split_shrinker.id);
#endif
	}
	spin_unlock_irqrestore(&ds_queue->split_queue_lock, flags);
```

}`

在内存压力紧张时系统回调各驱动注册的shrink接口，就会调用到deferred_split_scan。这个回调会进程大页分裂和普通页释放。

```cpp
static unsigned long deferred_split_scan(struct shrinker *shrink,
		struct shrink_control *sc)
{
	struct pglist_data *pgdata = NODE_DATA(sc->nid);
    //获取到deferred_split_queue链表
	struct deferred_split *ds_queue = &pgdata->deferred_split_queue;
	unsigned long flags;
	LIST_HEAD(list), *pos, *next;
	struct page *page;
	int split = 0;

#ifdef CONFIG_MEMCG
	if (sc->memcg)
		ds_queue = &sc->memcg->deferred_split_queue;
#endif
    //遍历deferred_split_queue, 对要处理的page放到list中
	spin_lock_irqsave(&ds_queue->split_queue_lock, flags);
	/* Take pin on all head pages to avoid freeing them under us */
	list_for_each_safe(pos, next, &ds_queue->split_queue) {
		page = list_entry((void *)pos, struct page, mapping);
		page = compound_head(page);
		if (get_page_unless_zero(page)) {
			list_move(page_deferred_list(page), &list);
		} else {
			/* We lost race with put_compound_page() */
			list_del_init(page_deferred_list(page));
			ds_queue->split_queue_len--;
		}
		if (!--sc->nr_to_scan)
			break;
	}
	spin_unlock_irqrestore(&ds_queue->split_queue_lock, flags);
    //遍历list链表,获取page调用split_huge_page进行大页分裂
	list_for_each_safe(pos, next, &list) {
		page = list_entry((void *)pos, struct page, mapping);
		if (!trylock_page(page))
			goto next;
		/* split_huge_page() removes page from list on success */
        //大页分裂,加到page lru链表中
		if (!split_huge_page(page))
			split++;
		unlock_page(page);
```

next:

```text
        //释放page内存
		put_page(page);
	}

	spin_lock_irqsave(&ds_queue->split_queue_lock, flags);
	list_splice_tail(&list, &ds_queue->split_queue);
	spin_unlock_irqrestore(&ds_queue->split_queue_lock, flags);

	/*
	 * Stop shrinker if we didn't split any page, but the queue is empty.
	 * This can happen if pages were freed under us.
	 */
	if (!split && list_empty(&ds_queue->split_queue))
		return SHRINK_STOP;
	return split;
```

}`

我们再来看一下split_huge_page是如何进行大页分裂的. 它会调用到split_huge_page_to_list,传入的list参数为0,表示分裂后page加到LRU list. 最终调用到__split_huge_page进行分裂.

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_6735b3ba493d.jpg)

上面介绍了页表分裂, 大页分裂, 延迟分裂deferred_split, 他们在内存回收,反向映射过程整体是怎样联合工作的呢? 总结一下,整体过程如下:

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_023e78555bf9.jpg)

- <strong>khugepaged线程</strong>**Khugepaged是透明大页的内核守护线程 ，其负责定期扫描允许使用透明大页的VMA区域，尝试把普通页合并为大页。Khugepaged线程工作过程需要持mmap_sem锁， 因此对性能影响比较大。
流程如下：
![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_e40b31a6b687.jpg)

collapse_huge_page负责把普通页合并成大页，它只会把最近访问过且具有写权限的页进行合并， 如果全部是只读页或最近没有访问过，不会进行合并。
把普通页合并成大页流程如下：

![](/images/collections/0.raw/zhihu/%E8%B5%B0%E5%90%91cs/asset/img_405b3351ad33.jpg)

### 6. 参考资料**

> https://tinylab.org/lwn-423584/
https://lwn.net/Articles/423584/
[https://zhuanlan.zhihu.com/p/117239320](https://zhuanlan.zhihu.com/p/117239320)
[https://zhuanlan.zhihu.com/p/269906327](https://zhuanlan.zhihu.com/p/269906327)
https://www.kernel.org/doc/html/latest/arm64/hugetlbpage.html
https://cloud.tencent.com/developer/article/1822138
https://www.51cto.com/article/660600.html
https://www.kernel.org/doc/html/latest/admin-guide/mm/transhuge.html
https://tinylab.org/lwn-359158/
[https://zhuanlan.zhihu.com/p/503738975](https://zhuanlan.zhihu.com/p/503738975)
https://richardweiyang-2.gitbook.io/kernel-exploring/00-index/04-thp
https://lwn.net/Articles/668714/
https://blog.csdn.net/maybeYoc/article/details/123415013
https://blog.csdn.net/wdjjwb/article/details/80402091
https://lkml.iu.edu/hypermail/linux/kernel/1507..html
