
function arraySet(count, value) {
  var a = new Array(count);

  for (var i = 0; i < count; i++) {
    a[i] = value;
  }

  return a;
}

module.exports = {
  arraySet: arraySet
};
