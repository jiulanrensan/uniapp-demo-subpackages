export const code = `
'use strict';

const common_vendor = require('../../common/vendor.js');
const common_assets = require('../../common/assets.js');
const pages_index_goods = require('./goods.js');
const subA_coupon_index = require('../../subA/coupon/index.js');

if (!Math) {
  (first + aaa + hello + second + share)();
}
const first = ()=>('../../subA/first/index2.js');
const second = ()=>('../../subA/second/index2.js');
const aaa = ()=>('../../subA/aaa/empty2.js');
const hello = ()=>('../components/hello/index.js');
const share = ()=>('../../subB/share/index2.js');
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "index",
  setup(__props) {
    const title = common_vendor.ref("Hello");
    const firstRef = common_vendor.ref(null);
    const helloRef = common_vendor.ref(null);
    common_vendor.onMounted(async () => {
      const res = pages_index_goods.getGoods();
      console.log("getGoods1", res);
      try {
        const { getCoupon } = await subA_coupon_index.couponModule;
        console.log("getCoupon", getCoupon());
      } catch (error) {
        console.log("Failed to load coupon module:", error);
      }
    });
    function handleCompLoaded() {
      console.log("First Subpackage component loaded");
    }
    return (_ctx, _cache) => {
      return {
        a: common_vendor.sr(firstRef, "5dff18ce-0", {
          "k": "firstRef"
        }),
        b: common_vendor.o(handleCompLoaded),
        c: common_vendor.sr(helloRef, "5dff18ce-2", {
          "k": "helloRef"
        }),
        d: common_assets._imports_0,
        e: common_vendor.t(title.value)
      };
    };
  }
});

wx.createPage(_sfc_main);`