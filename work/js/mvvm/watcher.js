function Watcher(vm, exp, cb) {
    this.cb = cb;
    this.vm = vm;
    this.exp = exp;
    this.depIds = {};
    this.value = this.get();
}

Watcher.prototype = {
    update: function() {
        this.run();
    },
    run: function() {
        // 得到最新的值
        var value = this.get();
        // 得到老的值
        var oldVal = this.value;
        // 如果不同
        if (value !== oldVal) {
            // 保存最新的值
            this.value = value;
            // 调用回调函数去更新节点
            this.cb.call(this.vm, value, oldVal);
        }
    },
    addDep: function(dep) {
        // 判断是否已经建立好关系
        if (!this.depIds.hasOwnProperty(dep.id)) {
            // 将当前watcher对象添加到dep中
            dep.addSub(this);
            // 将dep保存watcher中
            this.depIds[dep.id] = dep;
        }
    },
    get: function() {
        Dep.target = this;
        var value = this.getVMVal();
        Dep.target = null;
        return value;
    },

    getVMVal: function() {
        var exp = this.exp.split('.');
        var val = this.vm._data;
        exp.forEach(function(k) {
            val = val[k];
        });
        return val;
    }
};