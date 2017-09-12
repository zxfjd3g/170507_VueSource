function Observer(data) {
    // 保存data
    this.data = data;
    // 走起(开启对data中所有数据的劫持监视)
    this.walk(data);
}

Observer.prototype = {
    walk: function(data) {
        // 保存observer对象
        var me = this;
        // 遍历data中所有属性
        Object.keys(data).forEach(function(key) {
            // 对指定属性实现劫持
            me.convert(key, data[key]);
        });
    },
    convert: function(key, val) {
        this.defineReactive(this.data, key, val);
    },

    defineReactive: function(data, key, val) {
        // 创建一个对应的dep对象
        var dep = new Dep();
        // 递归调用实现对所有层次的属性的劫持/监视
        var childObj = observe(val);

        // 对data中指定属性进行重新定义, 添加get/set
        Object.defineProperty(data, key, {
            enumerable: true, // 可枚举
            configurable: false, // 不能再define
            get: function() {
                if (Dep.target) { // 建立dep与watcher之间的关系
                    dep.depend();
                }
                return val;
            },
            set: function(newVal) {  // 监视属性值的变化, 一旦属性值变化, 通过dep通知所有相关的watcher更新对应的界面
                if (newVal === val) {
                    return;
                }
                val = newVal;
                // 新的值是object的话，进行监听
                childObj = observe(newVal);
                // 通知订阅者
                dep.notify();
            }
        });
    }
};

// 观察的是value中所有的属性
function observe(value, vm) {
    // 如果不是对象, 直接结束
    if (!value || typeof value !== 'object') {
        return;
    }
    // 创建对应的Observer实例
    return new Observer(value);
};


var uid = 0;

function Dep() {
    this.id = uid++;
    this.subs = [];
}

Dep.prototype = {
    addSub: function(sub) {
        this.subs.push(sub);
    },

    depend: function() {
        Dep.target.addDep(this);
    },

    removeSub: function(sub) {
        var index = this.subs.indexOf(sub);
        if (index != -1) {
            this.subs.splice(index, 1);
        }
    },

    notify: function() {
        this.subs.forEach(function(sub) {
            sub.update();
        });
    }
};

Dep.target = null;