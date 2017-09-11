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
        this.$el.appendChild(this.$fragment);
    }
}

Compile.prototype = {
    node2Fragment: function(el) {
        var fragment = document.createDocumentFragment(),
            child;

        // 将原生节点拷贝到fragment
        while (child = el.firstChild) {
            fragment.appendChild(child);
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

    compile: function(node) {
        var nodeAttrs = node.attributes,
            me = this;

        [].slice.call(nodeAttrs).forEach(function(attr) {
            var attrName = attr.name;
            if (me.isDirective(attrName)) {
                var exp = attr.value;
                var dir = attrName.substring(2);
                // 事件指令
                if (me.isEventDirective(dir)) {
                    compileUtil.eventHandler(node, me.$vm, exp, dir);
                    // 普通指令
                } else {
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
        this.bind(node, vm, exp, 'model');

        var me = this,
            val = this._getVMVal(vm, exp);
        node.addEventListener('input', function(e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }

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

        new Watcher(vm, exp, function(value, oldValue) {
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    // 事件处理
    eventHandler: function(node, vm, exp, dir) {
        var eventType = dir.split(':')[1],
            fn = vm.$options.methods && vm.$options.methods[exp];

        if (eventType && fn) {
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
                val[k] = value;
            }
        });
    }
};


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