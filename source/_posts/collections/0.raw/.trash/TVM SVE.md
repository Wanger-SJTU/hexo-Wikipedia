# TODO
- [ ] src/tir/transforms/remove_no_op.cc 中
	```cpp
PrimExpr stores_existing_value = store->value - BufferLoad(store->buffer, store->indices) == 0;
```
如果datatype中增加 scalarable_， 默认属性必然为False，这里影响比较大。
如果== 不做判断，不知道会不会有潜在的问题。
- [ ] 