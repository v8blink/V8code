// 真实触发 Elements + Properties 叠加导致的 Map 膨胀
// 运行: d8 --allow-natives-syntax elements_properties_explosion_demo.js
//
// 原理：用【数组】同时承载 elements 与命名属性。同一数组的 Map 上既有
//       elements_kind 又有 instance_descriptors；先改元素类型再加不同数量
//       的命名属性，会得到 元素形态数 × 属性数 种不同 Map。

print("=== Elements + Properties 叠加膨胀（真实触发）===\n");

// 为了观察 Map 迁移轨迹，给每个数组分配一个 id，并在关键步骤打印 Map。
let gNextArrayId = 0;
function logMap(id, step, obj) {
  // 文本标签，后处理时可以按 id + step 还原迁移路径。
  print("MAP_LOG id=" + id + " step=" + step);
  %DebugPrint(obj);
}

// 四种“元素形态”，使同一数组的 Map 分别处于不同 ElementsKind
function setSmi(arr) {
  arr[0] = 1;
  arr[1] = 2;
  arr[2] = 3;
} // PACKED_SMI_ELEMENTS

function setDouble(arr) {
  arr[0] = 1.5;
  arr[1] = 2;
  arr[2] = 3;
} // PACKED_DOUBLE_ELEMENTS

function setObject(arr) {
  arr[0] = 1;
  arr[1] = {};
  arr[2] = 3;
} // PACKED_ELEMENTS

function setHoley(arr) {
  arr[0] = 1.5;
  arr[1] = {};
  delete arr[2];
} // HOLEY_ELEMENTS

const elementMutators = [setSmi, setDouble, setObject, setHoley];
const numElementKinds = elementMutators.length;
const numPropertyCounts = 4; // 每个数组再加 0 / 1 / 2 / 3 个命名属性

const all = [];

for (let ek = 0; ek < numElementKinds; ek++) {
  for (let np = 0; np < numPropertyCounts; np++) {
    const a = [];
    const id = gNextArrayId++;

    // 初始空数组的 Map。
    logMap(id, "init ek=" + ek + " np=" + np, a);

    // 应用元素形态变换后的 Map。
    elementMutators[ek](a);
    logMap(id, "after_elements ek=" + ek + " np=" + np, a);

    // 逐个添加命名属性后的 Map。
    for (let i = 0; i < np; i++) {
      a["p" + i] = i;
      logMap(id, "after_prop_" + (i + 1) + " ek=" + ek + " np=" + np, a);
    }

    all.push(a);
  }
}

// 统计：多少种不同的 Map（同一“类”数组，不同 elements+properties 组合）
let distinctMaps = 0;
for (let i = 0; i < all.length; i++) {
  let same = false;
  for (let j = 0; j < i; j++) {
    if (%HaveSameMap(all[i], all[j])) {
      same = true;
      break;
    }
  }
  if (!same) distinctMaps++;
}

print("元素形态数:", numElementKinds);
print("属性数量档位: 0 ..", numPropertyCounts - 1);
print("理论组合数:", numElementKinds * numPropertyCounts);
print("实际不同 Map 数:", distinctMaps);
print("\n（若实际 Map 数 = 理论组合数，说明叠加膨胀已发生）\n");

// 可选：打印其中两个实例的 Map，便于对照
print("--- 示例 1: PACKED_SMI + 0 个命名属性 ---");
%DebugPrint(all[0]);
print("--- 示例 2: PACKED_DOUBLE + 2 个命名属性 ---");
%DebugPrint(all[1 * numPropertyCounts + 2]);
