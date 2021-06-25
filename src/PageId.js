//
//
//

export const PageId = {

  create : function(pageX, pageY, pageZ) {
   return ((pageX & 0xFFF) << 16) | ((pageY & 0xFFF) << 4) | (pageZ & 0xF);
  },

  getPageX : function(id) {
    return (id >> 16) & 0xFFF;
  },

  getPageY : function(id) {
    return (id >> 4) & 0xFFF;
  },

  getPageZ : function(id) {
    return id & 0xF;
  },

  isValid: function (id) {
    return id >= 0;
  },

  createInvalid: function () {
    return -1;
  }
};
