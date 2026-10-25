---
title: "Everyone Should Know SIMD"
date: "2026-07-23 00:00:00"
updated: "2026-07-23 00:00:00"
layout: "post"
permalink: "/collections/0.raw/everyone-should-know-simd/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
tags:
  - "SIMD"
  - "performance"
  - "Zig"
  - "low-level"
---


# Everyone Should Know SIMD

<strong>By Mitchell Hashimoto</strong>

SIMD has a reputation for being complex. I've met many very good software engineers who dismiss it as something too complex to learn or a niche optimization meant for only the highest-performance software, not useful in everyday programming.

I think that's wrong. SIMD can be simple to understand, and common "process N values at a time" SIMD code to speed up a naive for loop almost always follows the same general shape. Once you learn the basics, writing SIMD is just about as easy as a for loop. And when it's not, it's usually a good sign to skip it for now.

Every developer should know at least that much SIMD.

## Background: What Is SIMD?

SIMD allows a CPU to operate on multiple values in parallel. For example, instead of comparing one byte at a time, a CPU can compare 4, 8, or even more bytes with a single instruction.

If you ever see loops like this in your code:

```
for (byte in bytes) { /* ... */ }
for (character in string) { /* ... */ }
for (value in array) { /* ... */ }
```

There is an opportunity to use SIMD. SIMD turns those into this:

```
for (8 byte chunk in bytes) { /* ... */ }
```

This results in a localized speedup that directly maps to the parallelism: you process data 4x, 8x, or even faster.

The only real requirement for this to pay off is that you need to be regularly processing a large enough number of bytes. If you're doing these for loops across data that is only ever a handful or dozens of bytes, it's not worth it. But if this is iterating over hundreds, thousands, millions of bytes, the payoff will be huge.

## The Common Shape

The common "process N values at a time" SIMD code follows the same five steps:

## 1. **Broadcast any constants** you need and initialize vector accumulators, if any.

## 2. **Loop over input** one vector-width chunk at a time.

## 3. **Perform the comparison or arithmetic** across all lanes in parallel.

## 4. **Reduce or store** the vector result as needed.

5. <strong>Handle the remaining elements</strong> with a scalar tail. A scalar tail is just your normal loop from before vectorizing, but it only processes the remainder that doesn't fit into a full vector.

## A Real Example (Ghostty)

A slice of decoded codepoints, consuming until we see a value at or below 0xF (a C0 control character). Terminals are mostly plain characters to be printed, so we try to batch all those together.

<strong>Scalar loop (one line):</strong>

```zig
while (end < cps.len and cps[end] > 0xF) end += 1;
```

<strong>Generic vector version (12 lines):</strong>

```zig
if (simd.lanes(u32)) |lanes| {
    const V = @Vector(lanes, u32);
    const threshold: V = @splat(0xF);
    while (end + lanes <= cps.len) : (end += lanes) {
        const values: V = cps[end..][0..lanes].*;
        const greater_than_threshold = values > threshold;
        if (@reduce(.And, greater_than_threshold)) continue;
        const mask: std.meta.Int(.unsigned, lanes) = @bitCast(greater_than_threshold);
        end += @ctz(~mask);
        break;
    }
}
while (end < cps.len and cps[end] > 0xF) end += 1;
```

This can improve the loop's throughput by up to:
- <strong>4x</strong> with ARM NEON (including Apple Silicon)
- <strong>8x</strong> with AVX2 (most modern x86 CPUs)
- <strong>16x</strong> with AVX-512 (some Intel CPUs and AMD Zen 4+)

In real-world end-to-end throughput from terminal program to finalized terminal state on an AVX2 Intel desktop, this was more like a <strong>5x speedup</strong>.

### Step 1: Broadcast Constants

```zig
if (simd.lanes(u32)) |lanes| {
    const V = @Vector(lanes, u32);
    const threshold: V = @splat(0xF);
```

- `simd.lanes(u32)` returns the number of u32 values the CPU can process at once (ARM=4, AVX2=8, AVX-512=16). Returns null if no suitable vector size → skip all SIMD.
- `@Vector(lanes, u32)` creates the vector type.
- `@splat(0xF)` broadcasts 0xF into every lane: `{ 0xF, 0xF, 0xF, 0xF, 0xF, 0xF, 0xF, 0xF }`

### Step 2: Loop One Vector at a Time

```zig
while (end + lanes <= cps.len) : (end += lanes) {
    const values: V = cps[end..][0..lanes].*;
```

Only enter loop when at least `lanes` values remain. Load those values into a vector. Move forward by `lanes` instead of 1.

### Step 3: Perform the SIMD Operation

```zig
const greater_than_threshold = values > threshold;
```

The `>` operator applies to every lane in parallel — one CPU instruction instead of eight scalar comparisons.

```
values:                   { 0x41, 0x42, 0x43, 0x0A, 0x44, 0x45, 0x46, 0x47 }
threshold:                { 0xF,  0xF,  0xF,  0xF,  0xF,  0xF,  0xF,  0xF  }
greater_than_threshold:  { true, true, true, false, true, true, true, true }
```

### Step 4: Reduce the Vector Result

```zig
if (@reduce(.And, greater_than_threshold)) continue;
const mask: std.meta.Int(.unsigned, lanes) = @bitCast(greater_than_threshold);
end += @ctz(~mask);
break;
```

## 1. `@reduce(.And, ...)` — if ALL lanes are true, continue to next vector.

## 2. Otherwise, `@bitCast` turns booleans into a bitmask: `{ 1,1,1,0,1,1,1,1 }`

## 3. `@ctz(~mask)` counts trailing zeros of inverted mask to find the first failing lane.

## 4. `@ctz(~{0,0,0,1,0,0,0,0})` = 3, so `end += 3` points to the 0x0A control character.


### Step 5: Scalar Tail

```zig
while (end < cps.len and cps[end] > 0xF) end += 1;
```

Handles remaining values (0 to `lanes-1` elements). Also serves as the fallback for CPUs without vector support.

## Why Can't the Compiler Do This?

Sometimes it can! Compilers can auto-vectorize simple loops, particularly regular arithmetic loops without complex control flow. You should always compile the scalar version with optimizations first.

But compilers are severely limited and generally very poor at auto-vectorization. It's been an active research area for decades, and [recent research](https://arxiv.org/abs/2406.04693) still begins from the observation that production compilers regularly miss vectorization opportunities.

More importantly: when this loop matters enough for a 5x speedup, you want the vectorization to be explicit and predictable. You don't want an unrelated code change or compiler update to quietly turn it back into a scalar loop.

---

原文链接: https://mitchellh.com/writing/everyone-should-know-simd
