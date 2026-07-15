// ============================================================
// V8 Context 类型演示 - 自包含 d8 调试代码
// 运行命令：d8 --allow-natives-syntax context_types_demo.js
// 调试命令：d8 --allow-natives-syntax --print-bytecode context_types_demo.js
// ============================================================


// ========== 1. FunctionContext：闭包捕获变量 ==========
// 当变量被内部函数引用时，必须存入 FunctionContext
function createCounter() {
    let count = 0;       // count 被内部函数引用 → 存入 FunctionContext
    let step = 1;        // step 也被内部函数引用 → 存入 FunctionContext
    let notCaptured = 99; // 不被捕获 → 留在栈上

    return function increment() {
        count += step;   // 从 FunctionContext 读取 count 和 step
        return count;
    };
}

%DebugPrintProto("1");
const counter = createCounter();
counter(); // 1
counter(); // 2
counter(); // 3

/*

// ========== 2. BlockContext：块级作用域 let/const ==========
// { } 内的 let/const 如果被内部函数捕获，会创建 BlockContext
function blockContextDemo() {
    let outer = "outer"; // FunctionContext

    {
        let blockVar = "I am in block"; // 被下面的闭包捕获 → BlockContext
        const blockConst = 42;          // 同样被捕获 → BlockContext

        // 这个闭包捕获了 blockVar 和 blockConst
        setTimeout(function () {
            console.log(" blockVar: " + blockVar);
            console.log(" blockConst: " + blockConst);
        }, 0);
    }

    // blockVar、blockConst 在这里已经不可访问（词法作用域）
    // 但它们的值仍存在 BlockContext 中，被闭包持有

    return outer;
}
*/