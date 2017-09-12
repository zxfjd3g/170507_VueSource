/*
相当于Vue的构造函数
 */
function MVVM(options) {
    // 保存选项对象到vm
    this.$options = options;
    // 保存data数据对象到vm和data变量
    var data = this._data = this.$options.data;
    // 保存vm到me变量
    var me = this;

    // 遍历data中所有属性
    Object.keys(data).forEach(function(key) {
        // 对指定属性实现代理
        me._proxy(key);
    });

    // 实现对data中所有属性的数据绑定
    observe(data, this);

    // 创建一个complie对象: 创建模板
    this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
    $watch: function(key, cb, options) {
        new Watcher(this, key, cb);
    },

    _proxy: function(key) {
        // 保存vm
        var me = this;
        // 给vm添加指定的属性(使用属性描述符)--->实现对key的代理
        Object.defineProperty(me, key, {
            configurable: false,
            enumerable: true,
            // 读取data中对应的属性值 -->代理读操作
            get: function proxyGetter() {
                return me._data[key];
            },
            // 将属性值保存到data中对应的属性上-->代理写操作
            set: function proxySetter(newVal) {
                me._data[key] = newVal;
            }
        });
    }
};