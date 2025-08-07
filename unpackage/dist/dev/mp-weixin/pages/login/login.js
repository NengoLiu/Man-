"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = common_vendor.defineComponent({
  data() {
    return {
      username: "",
      password: "",
      currentConnectedSsid: "",
      isConnected: false,
      isLoading: false,
      connectionCheckInterval: null
      // 网络检查定时器
    };
  },
  onLoad() {
    this.checkCurrentConnection();
    this.connectionCheckInterval = setInterval(() => {
      this.checkCurrentConnection();
    }, 3e3);
  },
  onUnload() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
  },
  methods: {
    // 打开系统WLAN设置界面
    openWifiSettings() {
      if (typeof plus === "undefined") {
        common_vendor.index.showToast({ title: "请在App环境中使用", icon: "none" });
        return null;
      }
      plus.android.requestPermissions(["android.permission.ACCESS_WIFI_STATE"], () => {
        try {
          const Intent = plus.android.importClass("android.content.Intent");
          const Settings = plus.android.importClass("android.provider.Settings");
          const intent = new Intent(Settings.ACTION_WIFI_SETTINGS);
          const main = plus.android.runtimeMainActivity();
          main.startActivity(intent);
        } catch (e) {
          common_vendor.index.showToast({ title: "无法打开设置", icon: "none" });
        }
      }, (e = null) => {
        common_vendor.index.showToast({ title: "需要权限才能打开设置", icon: "none" });
      });
    },
    // 检查当前已连接的网络
    checkCurrentConnection() {
      if (typeof plus === "undefined")
        return null;
      try {
        const wifiManager = plus.android.runtimeMainActivity().getSystemService("wifi");
        const info = wifiManager.getConnectionInfo();
        if (info) {
          let ssid = info.getSSID();
          if (ssid && ssid.startsWith('"') && ssid.endsWith('"')) {
            ssid = ssid.substring(1, ssid.length - 1);
          }
          this.currentConnectedSsid = ssid || "";
          this.isConnected = ssid && ssid.startsWith("Robot-");
        }
      } catch (e) {
        common_vendor.index.__f__("log", "at pages/login/login.uvue:170", "检查网络连接失败:", e);
      }
    },
    // 处理登录
    handleLogin() {
      if (!this.username.trim()) {
        return common_vendor.index.showToast({ title: "请输入用户名", icon: "none" });
      }
      if (!this.password.trim()) {
        return common_vendor.index.showToast({ title: "请输入密码", icon: "none" });
      }
      if (!this.isConnected) {
        return common_vendor.index.showToast({ title: "请先连接机器人网络", icon: "none" });
      }
      this.isLoading = true;
      setTimeout(() => {
        this.isLoading = false;
        common_vendor.index.showToast({ title: "登录成功", icon: "success" });
        setTimeout(() => {
          common_vendor.index.navigateTo({ url: "/pages/index/index" });
        }, 1e3);
      }, 2e3);
    },
    // 忘记密码
    handleForgot() {
      common_vendor.index.showToast({ title: "忘记密码功能待实现", icon: "none" });
    },
    // 注册账号
    handleRegister() {
      common_vendor.index.showToast({ title: "注册功能待实现", icon: "none" });
    }
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_assets._imports_0,
    b: $data.username,
    c: common_vendor.o(($event) => $data.username = $event.detail.value),
    d: $data.password,
    e: common_vendor.o(($event) => $data.password = $event.detail.value),
    f: common_vendor.t($data.currentConnectedSsid || "点击选择机器人网络"),
    g: common_vendor.o((...args) => $options.openWifiSettings && $options.openWifiSettings(...args)),
    h: $data.isConnected ? "#00b42a" : "#ff4d4f",
    i: common_vendor.t($data.isConnected ? `已连接: ${$data.currentConnectedSsid}` : "未连接到机器人网络"),
    j: $data.isConnected ? 1 : "",
    k: common_vendor.o((...args) => $options.handleLogin && $options.handleLogin(...args)),
    l: $data.isLoading,
    m: common_vendor.o((...args) => $options.handleForgot && $options.handleForgot(...args)),
    n: common_vendor.o((...args) => $options.handleRegister && $options.handleRegister(...args)),
    o: common_vendor.sei(common_vendor.gei(_ctx, ""), "view")
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-27a30816"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/login/login.js.map
