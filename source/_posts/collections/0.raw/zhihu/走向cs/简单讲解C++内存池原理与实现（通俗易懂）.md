---
title: 简单讲解C++内存池原理与实现（通俗易懂）
date: "2021-11-20 00:00:00"
updated: "2021-11-20 00:00:00"
layout: post
permalink: /collections/0.raw/zhihu/走向cs/简单讲解C-内存池原理与实现(通俗易懂)/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - 知乎
source_url: https://zhuanlan.zhihu.com/p/434087002
---


### 一、为什么需要使用内存池

在C/C++中我们通常使用malloc,free或new,delete来动态分配内存。

一方面，因为这些函数涉及到了系统调用，所以频繁的调用必然会导致程序性能的损耗；

另一方面，频繁的分配和释放小块内存会导致大量的内存碎片的产生，当碎片积累到一定的量之后，将无法分配到连续的内存空间，系统不得不进行碎片整理来满足分配到连续的空间，这样不仅会导致系统性能损耗，而且会导致程序对内存的利用率低下。

当然，如果我们的程序不需要频繁的分配和释放小块内存，那就没有使用内存池的必要，直接使用malloc,free或new,delete函数即可。

### 二、内存池的实现方案

内存池的实现原理大致如下：

提前申请一块大内存由内存池自己管理，并分成小片供给程序使用。程序使用完之后将内存归还到内存池中（并没有真正的从系统释放），当程序再次从内存池中请求内存时，内存池将池子中的可用内存片返回给程序使用。

我们在设计内存池的实现方案时，需要考虑到以下问题：

**内存池是否可以自动增长？**

如果内存池的最大空间是固定的（也就是非自动增长），那么当内存池中的内存被请求完之后，程序就无法再次从内存池请求到内存。所以需要根据程序对内存的实际使用情况来确定是否需要自动增长。

**内存池的总内存占用是否只增不减？**

如果内存池是自动增长的，就涉及到了“内存池的总内存占用是否是只增不减”这个问题了。试想，程序从一个自动增长的内存池中请求了1000个大小为100KB的内存片，并在使用完之后全部归还给了内存池，而且假设程序之后的逻辑最多之后请求10个100KB的内存片，那么该内存池中的900个100KB的内存片就一直处于闲置状态，程序的内存占用就一直不会降下来。对内存占用大小有要求的程序需要考虑到这一点。

**内存池中内存片的大小是否固定？**

如果每次从内存池中的请求的内存片的大小如果不固定，那么内存池中的每个可用内存片的大小就不一致，程序再次请求内存片的时候，内存池就需要在“匹配最佳大小的内存片”和“匹配操作时间”上作出衡量。“最佳大小的内存片”虽然可以减少内存的浪费，但可能会导致“匹配时间”变长。

**内存池是否是线程安全的？**

是否允许在多个线程中同时从同一个内存池中请求和归还内存片？这个线程安全可以由内存池来实现，也可以由使用者来保证。

**内存片分配出去之前和归还到内存池之后，其中的内容是否需要被清除？**

程序可能出现将内存片归还给内存池之后，仍然使用内存片的地址指针进行内存读写操作，这样就会导致不可预期的结果。将内容清零只能尽量的（也不一定能）将问题抛出来，但并不能解决任何问题，而且将内容清零会消耗一定的CPU时间。所以，最终最好还是需要由内存池的使用者来保证这种安全性。

**是否兼容std::allocator？**

STL标准库中的大多类都支持用户提供一个自定义的内存分配器，默认使用的是std::allocator，如std::string：

typedef basic_string, allocator > string;

如果我们的内存池兼容std::allocator，那么我们就可以使用我们自己的内存池来替换默认的std::allocator分配器，如：

typedef basic_string, MemoryPoll > mystring;

### 三、内存池的具体实现

**计划实现一个内存池管理的类MemoryPool，它具有如下特性：**

- 内存池的总大小自动增长。
- 内存池中内存片的大小固定。
- 支持线程安全。
- 在内存片被归还之后，清除其中的内容。
- 兼容std::allocator。
因为内存池的内存片的大小是固定的，不涉及到需要匹配最合适大小的内存片，由于会频繁的进行插入、移除的操作，但查找比较少，故选用链表数据结构来管理内存池中的内存片。

**MemoryPool中有2个链表，它们都是双向链表（设计成双向链表主要是为了在移除指定元素时，能够快速定位该元素的前后元素，从而在该元素被移除后，将其前后元素连接起来，保证链表的完整性）：**

- data_element_ 记录以及分配出去的内存片。
- free_element_ 记录未被分配出去的内存片。

### MemoryPool实现代码

代码中使用了std::mutex等C++11才支持的特性，所以需要编译器最低支持C++11：

`#ifndef PPX_BASE_MEMORY_POOL_H_
#define PPX_BASE_MEMORY_POOL_H_

#include 
#include 
#include 

namespace ppx {
    namespace base {
        template 
        class MemoryPool {
        public:
            /* Member types */
            typedef T               value_type;
            typedef T*              pointer;
            typedef T&              reference;
            typedef const T*        const_pointer;
            typedef const T&        const_reference;
            typedef size_t          size_type;
            typedef ptrdiff_t       difference_type;
            typedef std::false_type propagate_on_container_copy_assignment;
            typedef std::true_type  propagate_on_container_move_assignment;
            typedef std::true_type  propagate_on_container_swap;

            template  struct rebind {
                typedef MemoryPool other;
            };

            /* Member functions */
            MemoryPool() noexcept;
            MemoryPool(const MemoryPool& memoryPool) noexcept;
            MemoryPool(MemoryPool&& memoryPool) noexcept;
            template  MemoryPool(const MemoryPool& memoryPool) noexcept;

            ~MemoryPool() noexcept;

            MemoryPool& operator=(const MemoryPool& memoryPool) = delete;
            MemoryPool& operator=(MemoryPool&& memoryPool) noexcept;

            pointer address(reference x) const noexcept;
            const_pointer address(const_reference x) const noexcept;

            // Can only allocate one object at a time. n and hint are ignored
            pointer allocate(size_type n = 1, const_pointer hint = 0);
            void deallocate(pointer p, size_type n = 1);

            size_type max_size() const noexcept;

            template  void construct(U* p, Args&&... args);
            template  void destroy(U* p);

            template  pointer newElement(Args&&... args);
            void deleteElement(pointer p);

        private:
            struct Element_ {
                Element_* pre;
                Element_* next;
            };

            typedef char* data_pointer;
            typedef Element_ element_type;
            typedef Element_* element_pointer;

            element_pointer data_element_;
            element_pointer free_element_;

            std::recursive_mutex m_;

            size_type padPointer(data_pointer p, size_type align) const noexcept;
            void allocateBlock();

            static_assert(BlockSize >= 2 * sizeof(element_type), "BlockSize too small.");
        };

        template 
        inline typename MemoryPool::size_type
            MemoryPool::padPointer(data_pointer p, size_type align)
            const noexcept {
            uintptr_t result = reinterpret_cast(p);
            return ((align - result) % align);
        }

        template 
        MemoryPool::MemoryPool()
            noexcept {
            data_element_ = nullptr;
            free_element_ = nullptr;
        }

        template 
        MemoryPool::MemoryPool(const MemoryPool& memoryPool)
            noexcept :
            MemoryPool() {
        }

        template 
        MemoryPool::MemoryPool(MemoryPool&& memoryPool)
            noexcept {
            std::lock_guard lock(m_);

            data_element_ = memoryPool.data_element_;
            memoryPool.data_element_ = nullptr;
            free_element_ = memoryPool.free_element_;
            memoryPool.free_element_ = nullptr;
        }

        template 
        template
        MemoryPool::MemoryPool(const MemoryPool& memoryPool)
            noexcept :
            MemoryPool() {
        }

        template 
        MemoryPool&
            MemoryPool::operator=(MemoryPool&& memoryPool)
            noexcept {
            std::lock_guard lock(m_);

            if (this != &memoryPool) {
                std::swap(data_element_, memoryPool.data_element_);
                std::swap(free_element_, memoryPool.free_element_);
            }
            return *this;
        }

        template 
        MemoryPool::~MemoryPool()
            noexcept {
            std::lock_guard lock(m_);

            element_pointer curr = data_element_;
            while (curr != nullptr) {
                element_pointer prev = curr->next;
                operator delete(reinterpret_cast(curr));
                curr = prev;
            }

            curr = free_element_;
            while (curr != nullptr) {
                element_pointer prev = curr->next;
                operator delete(reinterpret_cast(curr));
                curr = prev;
            }
        }

        template 
        inline typename MemoryPool::pointer
            MemoryPool::address(reference x)
            const noexcept {
            return &x;
        }

        template 
        inline typename MemoryPool::const_pointer
            MemoryPool::address(const_reference x)
            const noexcept {
            return &x;
        }

        template 
        void
            MemoryPool::allocateBlock() {
            // Allocate space for the new block and store a pointer to the previous one
            data_pointer new_block = reinterpret_cast (operator new(BlockSize));
            element_pointer new_ele_pointer = reinterpret_cast(new_block);
            new_ele_pointer->pre = nullptr;
            new_ele_pointer->next = nullptr;

            if (data_element_) {
                data_element_->pre = new_ele_pointer;
            }

            new_ele_pointer->next = data_element_;
            data_element_ = new_ele_pointer;
        }

        template 
        inline typename MemoryPool::pointer
            MemoryPool::allocate(size_type n, const_pointer hint) {
            std::lock_guard lock(m_);

            if (free_element_ != nullptr) {
                data_pointer body =
                    reinterpret_cast(reinterpret_cast(free_element_) + sizeof(element_type));

                size_type bodyPadding = padPointer(body, alignof(element_type));

                pointer result = reinterpret_cast(reinterpret_cast(body + bodyPadding));

                element_pointer tmp = free_element_;

                free_element_ = free_element_->next;

                if (free_element_)
                    free_element_->pre = nullptr;

                tmp->next = data_element_;
                if (data_element_)
                    data_element_->pre = tmp;
                tmp->pre = nullptr;
                data_element_ = tmp;

                return result;
            }
            else {
                allocateBlock();

                data_pointer body =
                    reinterpret_cast(reinterpret_cast(data_element_) + sizeof(element_type));

                size_type bodyPadding = padPointer(body, alignof(element_type));

                pointer result = reinterpret_cast(reinterpret_cast(body + bodyPadding));

                return result;
            }
        }

        template 
        inline void
            MemoryPool::deallocate(pointer p, size_type n) {
            std::lock_guard lock(m_);

            if (p != nullptr) {
                element_pointer ele_p =
                    reinterpret_cast(reinterpret_cast(p) - sizeof(element_type));

                if (ZeroOnDeallocate) {
                    memset(reinterpret_cast(p), 0, BlockSize - sizeof(element_type));
                }

                if (ele_p->pre) {
                    ele_p->pre->next = ele_p->next;
                }

                if (ele_p->next) {
                    ele_p->next->pre = ele_p->pre;
                }

                if (ele_p->pre == nullptr) {
                    data_element_ = ele_p->next;
                }

                ele_p->pre = nullptr;
                if (free_element_) {
                    ele_p->next = free_element_;
                    free_element_->pre = ele_p;
                }
                else {
                    ele_p->next = nullptr;
                }
                free_element_ = ele_p;
            }
        }

        template 
        inline typename MemoryPool::size_type
            MemoryPool::max_size()
            const noexcept {
            size_type maxBlocks = -1 / BlockSize;
            return (BlockSize - sizeof(data_pointer)) / sizeof(element_type) * maxBlocks;
        }

        template 
        template 
        inline void
            MemoryPool::construct(U* p, Args&&... args) {
            new (p) U(std::forward(args)...);
        }

        template 
        template 
        inline void
            MemoryPool::destroy(U* p) {
            p->~U();
        }

        template 
        template 
        inline typename MemoryPool::pointer
            MemoryPool::newElement(Args&&... args) {
            std::lock_guard lock(m_);
            pointer result = allocate();
            construct(result, std::forward(args)...);
            return result;
        }

        template 
        inline void
            MemoryPool::deleteElement(pointer p) {
            std::lock_guard lock(m_);
            if (p != nullptr) {
                p->~value_type();
                deallocate(p);
            }
        }
    }
}

#endif // PPX_BASE_MEMORY_POOL_H_

使用示例：
#include 
#include 
using namespace std;
class Apple {
public:
    Apple() {
        id_ = 0;
        cout  *mp) {
    int i = 0;
    while (i++ allocate();

        char* p1 = (char*)mp->allocate();

        mp->deallocate(p0);

        char* p2 = (char*)mp->allocate();

        mp->deallocate(p1);
        
        mp->deallocate(p2);

    }
}

int main()
{
    ppx::base::MemoryPool mp;
    int i = 0;
    while (i++  mp2;
        apple = mp2.newElement(10);
        int a = apple->GetId();
        apple->SetId(10);
        a = apple->GetId();

        mp2.deleteElement(apple);
    }

    apple->SetId(12);
    int b = -4 % 4;

    int *a = nullptr;
    {
        ppx::base::MemoryPool mp3;
        a =  mp3.allocate();
        *a = 100;
        //mp3.deallocate(a);

        int *b =  mp3.allocate();
        *b = 200;
        //mp3.deallocate(b);

        mp3.deallocate(a);
        mp3.deallocate(b);

        int *c = mp3.allocate();
        *c = 300;
    }

    getchar();
    return 0;
}

`

![](/images/collections/0.raw/zhihu/%25E8%25B5%25B0%25E5%2590%2591cs/asset/img_b4126017a8e0.jpg)
