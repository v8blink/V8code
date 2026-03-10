// ========== 1. 建立原型链 ==========
// runtime.h中添加：  F(DebugPrintProto, -1, 1)                   \
//runtime-test.cc中添加：
/*
RUNTIME_FUNCTION(Runtime_DebugPrintProto) {
  HandleScope scope(isolate);


  MaybeObject maybe_object(*args.address_of_arg_at(0));
  Tagged<Object> object = maybe_object.GetHeapObjectOrSmi();

  if (IsHeapObject(object)) {
      //auto fun = HeapObject::cast(object);
      //auto jsfun = JSReceiver::cast(fun);
      Handle<JSReceiver> jsfun = args.at<JSReceiver>(0);
      for (PrototypeIterator iter(isolate, jsfun,
                             kStartAtReceiver);
      !iter.IsAtEnd(); iter.Advance()) {
      Handle<Object> current = PrototypeIterator::GetCurrent(iter);
      if (!IsJSObjectThatCanBeTrackedAsPrototype(*current)) break;
      Handle<JSObject> current_obj = Handle<JSObject>::cast(current);
      Tagged<Map> current_map = current_obj->map();
      i::Print(*current_obj);
      i::Print(current_map,std::cout);
 }
    }


  return args[0];
}
*/
function Animal(name) {
  this.name = name;
}
%DebugPrintProto(Animal);
// 在原型上挂方法，形成 Animal.prototype → Object.prototype → null
Animal.prototype.speak = function () {
  return this.name + " speaks";
};
%DebugPrintProto(Animal);
%DebugPrintProto(Animal.prototype);
// 创建实例，此时 Animal.prototype 会作为“原型”被使用
// 可能触发：OptimizeAsPrototype(Animal.prototype) 等
const dog = new Animal("Rex");
const cat = new Animal("Whiskers");

// ========== 2. 热路径访问，让 IC 依赖原型链与 prototype_validity_cell ==========
// 多次访问 dog.speak / cat.speak，IC 会缓存“在 Animal.prototype 上找到 speak”
// 依赖 Map 的 prototype_validity_cell；链未变时一直走快速路径
for (let i = 0; i < 100; i++) {
  dog.speak();
  cat.speak();
}

// ========== 3. 修改原型上的属性 → 触发 InvalidatePrototypeChains ==========
// 修改原型上的方法，会：
// - 使依赖该原型链的 IC / 优化代码失效（prototype_validity_cell 失效）
// - 内部可能调用 InvalidatePrototypeChains(Animal.prototype 的 Map)
Animal.prototype.speak = function () {
  return this.name + " (overridden)";
};

// 之后访问会重新走查找，看到新行为
console.log(dog.speak()); // "Rex (overridden)"

// ========== 4. 在原型上新增属性（再次触发链失效） ==========
Animal.prototype.run = function () {
  return this.name + " runs";
};
console.log(dog.run()); // "Rex runs"

// ========== 5. 换原型（Object.setPrototypeOf）→ 强 invalidation ==========
function Pet() {}
Pet.prototype.eat = function () {
  return this.name + " eats";
};

// 把 dog 的原型从 Animal.prototype 换成 Pet.prototype
// 会触发原型链重写，依赖旧链的 IC/优化全部失效
Object.setPrototypeOf(dog, Pet.prototype);

console.log(dog.eat());   // "Rex eats"（新原型）
console.log(dog.speak());  // 报错或 undefined（旧链已断）