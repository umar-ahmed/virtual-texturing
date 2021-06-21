//
//
//

export const PageId = {

  create : function(page, mipLevel) {
    return ((page & 0xFFFFFF) << 4) | (mipLevel & 0xF);
  },

  getMipMapLevel : function(id) {
    return id & 0xF;
  },

  getPageNumber : function(id) {
    return id >> 4;
  },

  isValid: function (page) {
    return page >= 0;
  },

  createInvalid: function () {
    return -1;
  }
};
