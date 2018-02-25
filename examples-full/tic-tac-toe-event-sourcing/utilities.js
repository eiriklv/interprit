/**
 * Function to transpose a 2D array (M x N dimensional)
 */
const transpose = module.exports.transpose = function transpose(arr) {
  return arr[0].map((item, index) => arr.map((x) => x[index]));
}

/**
 * Function to flip a 2D array vertically (M x N dimensional)
 */
const flipVertically = module.exports.flipVertically = function flipVertically(arr) {
  return arr.slice().reverse();
}

/**
 * Function to flip a 2D array horizonally (M x N dimensional)
 */
const flipHorizonally = module.exports.flipHorizonally = function flipHorizonally(arr) {
  return arr.map(line => line.slice().reverse());
}

/**
 * Function to get the diagonals of 2D arrays (N x N dimensional)
 */
const getDiagonals = module.exports.getDiagonals = function getDiagonals(arr) {
  return [
    arr[0].map((item, index) => arr[index][index]),
    arr[0].map((item, index) => flipVertically(arr)[index][index]),
  ];
}

/**
 * Function to flatten a 2D array to 1D
 */
const flatten = module.exports.flatten = function flatten(arr) {
  return arr.reduce((result, line) => [...result, ...line], []);
}

/**
 * Function to keep only unique elements of an array
 */
const getUnique = module.exports.getUnique = function getUnique(arr) {
  return arr.reduce((result, item) => {
    return result.includes(item) ? result : [...result, item];
  });
}

/**
 * Function to get a random element from an array
 */
const getRandom = module.exports.getRandom = function getRandom(arr) {
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}

/**
 * Function to get the frequencies of an array
 */
const frequency = module.exports.frequency = function frequency(arr) {
  return arr.reduce((result, item) => {
    return {
      ...result,
      [item]: (result[item] || 0) + 1
    };
  }, {});
}

/**
 * Function to check if an array is only filled with truthy values
 */
const isFilled = module.exports.isFilled = function isFilled(arr) {
  return arr.every(item => item);
}

/**
 * Function to get the values of an object
 */
const values = module.exports.values = function values(obj) {
  return Object.keys(obj).map(key => obj[key]);
}
