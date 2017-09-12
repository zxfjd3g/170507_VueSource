function Compile(el, vm) {
    // 保存vm
    this.$vm = vm;
    // 保存el元素对象
    this.$el = this.isElementNode(el) ? el : document.querySelector(el);
    if (this.$el) {
        // 1. 取出el中所有的子节点存放到一个fragment对象, 并保存fragment
        this.$fragment = this.node2Fragment(this.$el);
        // 2. 编译fragment中所有的子节点
        this.init();
        // 3. 将编译好的fragment插入el元素
        // this.$el.innerHTML = ''
        this.$el.appendChild(this.$fragment); // 第二次更新界面
    }
}

Compile.prototype = {
    node2Fragment: function(el) {

        // 得到el的所有子节点的字符串
        const innerStr = el.innerHTML
        // 一次性清空el的所有子节点
        el.innerHTML = ''  // 第一次更新

        // 将标签结构字符串转换为标签对象
        const div = document.createElement('div')
        div.innerHTML = innerStr

        // 将div中所有的子节点添加到fragment中
        var fragment = document.createDocumentFragment(),
            child;
        // 将原生节点拷贝到fragment
        while (child = div.firstChild) {
            fragment.appendChild(child); // 此处不会更新界面
        }

        return fragment;
    },

    init: function() {
        this.compileElement(this.$fragment);
    },

    // 编译指定节点的所有层次的子节点
    compileElement: function(el) {
        // 得到所有子节点
        var childNodes = el.childNodes,
          // 保存complie实例对象
            me = this;
        // 遍历所有子节点
        [].slice.call(childNodes).forEach(function(node) {
            // 得到节点的文本内容
            var text = node.textContent;
            // 用来匹配{{}}表达式的正则对象
            var reg = /\{\{(.*)\}\}/;
            // 如果是元素节点
            if (me.isElementNode(node)) {
                // 编译节点中所有指令属性
                me.compile(node);
            // 如果是一个表达式格式的文本节点
            } else if (me.isTextNode(node) && reg.test(text)) {
                // 编译文本节点: 解析表达式
                me.compileText(node, RegExp.$1);
            }

            // 如果还有子节点
            if (node.childNodes && node.childNodes.length) {
                // 递归调用编译子节点的所有子节点
                me.compileElement(node);
            }
        });
    },

    // 编译元素上的指令属性
    compile: function(node) {
        // 得到所有属性
        var nodeAttrs = node.attributes,
            me = this;
        // 遍历属性
        [].slice.call(nodeAttrs).forEach(function(attr) {
            // 得到属性名: v-on:click
            var attrName = attr.name;
            // 判断是否是指令属性
            if (me.isDirective(attrName)) {
                // 得到属性值(表达式): read
                var exp = attr.value;
                // 从属性名中得到指令名: on:click
                var dir = attrName.substring(2);
                // 判断是否是事件指令
                if (me.isEventDirective(dir)) {
                    // 解析处理事件指令
                    compileUtil.eventHandler(node, me.$vm, exp, dir);
                // 普通指令
                } else {
                    // 解析一般指令
                    compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
                }

                node.removeAttribute(attrName);
            }
        });
    },


    compileText: function(node, exp) {

        compileUtil.text(node, this.$vm, exp);
    },

    isDirective: function(attr) {
        return attr.indexOf('v-') == 0;
    },

    isEventDirective: function(dir) {
        return dir.indexOf('on') === 0;
    },

    isElementNode: function(node) {
        return node.nodeType == 1;
    },

    isTextNode: function(node) {
        return node.nodeType == 3;
    }
};

// 包含多个解析不同指令/表达式方法的对象
var compileUtil = {
    // 解析{{}}/v-text
    text: function(node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },

    // 解析v-html
    html: function(node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },

    // 解析v-model
    model: function(node, vm, exp) {
        // 实现model-->view的绑定
            // 初始化显示
            // 创建watcher监视表达式
        this.bind(node, vm, exp, 'model');

        var me = this,
          // 得到当前表达式的值
            val = this._getVMVal(vm, exp);
        // 给节点绑定input监听: 当输入框的值发生改变时自动调用回调
        node.addEventListener('input', function(e) {
            // 得到输入框最新的值
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }
            // 将最新值保存到表达式所对应的属性中
            me._setVMVal(vm, exp, newValue);
            val = newValue;
        });
    },

    // 解析v-class
    class: function(node, vm, exp) {
        this.bind(node, vm, exp, 'class');
    },

    /**
     * 实现指令的初始化绑定
     * @param node: 节点
     * @param vm: vm
     * @param exp: 表达式字符串  name/wife.name
     * @param dir: 指令名  text/html/class/model
     */
    bind: function(node, vm, exp, dir) {
        // 得到更新节点的函数
        var updaterFn = updater[dir + 'Updater'];
        // 调用函数更新节点
        updaterFn && updaterFn(node, this._getVMVal(vm, exp)); //

        // 为表达式创建对应的watcher对象, 当表达式需要更新时, 自动调用回调函数
        new Watcher(vm, exp, function(value, oldValue) {
            // 更新对应的节点
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    // 事件处理
    eventHandler: function(node, vm, exp, dir) {
        // 得到事件类型(名): click
        var eventType = dir.split(':')[1],
          // 得到事件处理函数: function read(){}
            fn = vm.$options.methods && vm.$options.methods[exp];

        // 如果都有
        if (eventType && fn) {
            // 给元素节点绑定指定名称和回调函数的事件监听 (绑定了回调函数中的this为vm)
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    },

    /**
     * 得到表达式所对应的值
     * @param vm
     * @param exp
     */
    _getVMVal: function(vm, exp) {// name / wife.name
        var val = vm._data;
        exp = exp.split('.');
        exp.forEach(function(k) {
            val = val[k];
        });
        return val;
    },

    _setVMVal: function(vm, exp, value) {
        var val = vm._data;
        exp = exp.split('.');
        exp.forEach(function(k, i) {
            // 非最后一个key，更新val的值
            if (i < exp.length - 1) {
                val = val[k];
            } else {
                // 更新表达式中最后一个属性的值
                val[k] = value;
            }
        });
    }
};

/*
包含多个更新节点的方法的对象
 */
var updater = {
    // 设置节点的文本内容: {{}}/v-text
    textUpdater: function(node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },

    // 设置节点的标签文本内容:  v-html
    htmlUpdater: function(node, value) {
        node.innerHTML = typeof value == 'undefined' ? '' : value;
    },

    // 设置节点的className属性  v-class
    classUpdater: function(node, value, oldValue) {
        var className = node.className;
        className = className.replace(oldValue, '').replace(/\s$/, '');

        var space = className && String(value) ? ' ' : '';

        node.className = className + space + value;
    },

    // 设置节点的value属性  v-model
    modelUpdater: function(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    }
};