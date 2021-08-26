//
//
//

export const TileId = {

  create : function(x, y, z) {
   return ((x & 0xFFF) << 16) | ((y & 0xFFF) << 4) | (z & 0xF);
  },

  getX : function(id) {
    return (id >> 16) & 0xFFF;
  },

  getY : function(id) {
    return (id >> 4) & 0xFFF;
  },

  getZ : function(id) {
    return id & 0xF;
  },

  isValid: function (id) {
    return id >= 0;
  },

  createInvalid: function () {
    return -1;
  }
};
