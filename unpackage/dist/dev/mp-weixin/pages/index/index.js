"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = common_vendor.defineComponent({
  data() {
    return {
      isConnected: true,
      joystickPosition: new UTSJSONObject({ x: 0, y: 0 }),
      isDragging: false,
      dPadX: 0,
      dPadY: 0,
      dPadCenter: new UTSJSONObject({ x: 0, y: 0 }),
      dPadRadius: 0,
      isDPadDragging: false
      // 是否正在拖动右侧滑块
    };
  },
  onLoad() {
    this.checkConnectionStatus();
  },
  methods: {
    // 检查机器人连接状态
    checkConnectionStatus() {
      setInterval(() => {
      }, 5e3);
    },
    // 紧急停止
    emergencyStop() {
      common_vendor.index.showModal(new UTSJSONObject({
        title: "紧急停止",
        content: "确定要停止机器人所有动作吗？",
        confirmText: "停止",
        cancelText: "取消",
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.showToast({ title: "已停止", icon: "success" });
          }
        }
      }));
    },
    // 摇杆触摸开始
    startJoystick(e = null) {
      this.isDragging = true;
      this.updateJoystickPosition(e);
    },
    // 摇杆触摸移动
    moveJoystick(e = null) {
      if (this.isDragging) {
        this.updateJoystickPosition(e);
      }
    },
    // 摇杆触摸结束
    endJoystick() {
      this.isDragging = false;
      this.joystickPosition = { x: 0, y: 0 };
    },
    // 更新摇杆位置并发送指令
    updateJoystickPosition(e = null) {
      const container = common_vendor.index.createSelectorQuery().select(".joystick-container");
      container.fields(new UTSJSONObject({ size: true, rect: true }), (data = null) => {
        data.left + data.width / 2;
        data.top + data.height / 2;
        e.touches[0].clientX;
        e.touches[0].clientY;
      }).exec();
    },
    // 右侧十字滑块触摸开始
    startDPad(e = null) {
      this.isDPadDragging = true;
      if (this.dPadRadius === 0) {
        const container = common_vendor.index.createSelectorQuery().select(".d-pad-container");
        container.fields(new UTSJSONObject({ size: true, rect: true }), (data = null) => {
          this.dPadCenter = {
            x: data.width / 2,
            y: data.height / 2
          };
          this.dPadRadius = data.width / 2 - 30;
        }).exec();
      }
      this.moveDPad(e);
    },
    // 右侧十字滑块触摸移动
    moveDPad(e = null) {
      if (!this.isDPadDragging)
        return null;
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const container = common_vendor.index.createSelectorQuery().select(".d-pad-container");
      container.fields(new UTSJSONObject({ rect: true }), (data = null) => {
        const relativeX = touchX - data.left - this.dPadCenter.x;
        const relativeY = touchY - data.top - this.dPadCenter.y;
        const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
        if (distance > this.dPadRadius) {
          this.dPadX = relativeX / distance * this.dPadRadius;
          this.dPadY = relativeY / distance * this.dPadRadius;
        } else {
          this.dPadX = relativeX;
          this.dPadY = relativeY;
        }
        this.sendDirectionCommand(this.dPadX, this.dPadY);
      }).exec();
    },
    // 右侧十字滑块触摸结束
    endDPad() {
      this.isDPadDragging = false;
      this.dPadX = 0;
      this.dPadY = 0;
      this.sendDirectionCommand(0, 0);
    },
    // 根据X/Y偏移判断方向并发送指令
    sendDirectionCommand(x = null, y = null) {
      if (!this.isConnected)
        return null;
      const threshold = 20;
      let direction = "";
      if (y < -threshold)
        direction = "前";
      else if (y > threshold)
        direction = "后";
      else if (x < -threshold)
        direction = "左";
      else if (x > threshold)
        direction = "右";
      else
        direction = "停";
      if (direction !== "停") {
        common_vendor.index.showToast({ title: `向${direction}移动`, icon: "none", duration: 100 });
      }
    }
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.t($data.isConnected ? "已连接" : "未连接"),
    b: $data.isConnected ? 1 : "",
    c: common_vendor.o((...args) => $options.startDPad && $options.startDPad(...args)),
    d: common_vendor.o((...args) => $options.moveDPad && $options.moveDPad(...args)),
    e: common_vendor.o((...args) => $options.endDPad && $options.endDPad(...args)),
    f: common_vendor.o((...args) => $options.endDPad && $options.endDPad(...args)),
    g: $data.dPadX + "px",
    h: $data.dPadY + "px",
    i: common_vendor.o((...args) => $options.emergencyStop && $options.emergencyStop(...args)),
    j: common_vendor.sei(common_vendor.gei(_ctx, ""), "view")
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-00a60067"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
