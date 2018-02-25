/**
 * Import effects
 */
const effects = require('../../lib/effects');

/**
 * Import interpreter creator
 */
const createInterpreter = require('../../lib/interpreter');

/**
 * Import IO creator
 */
const { createIOWithStateTransitions } = require('../../lib/io');

/**
 * Import projection
 */
const { gameProjection } = require('./projections');

/**
 * Create an IO interface to pass to
 * the interpreter for handling take/put
 */
const io = createIOWithStateTransitions(gameProjection);

/**
 * Middleware
 */
const middleware = [];

/**
 * Monitor function
 */
const onMonitorEvent = () => {};

/**
 * Create an interpreter based on the effects resolvers and IO chosen
 */
const interpreter = createInterpreter(effects, io, middleware, onMonitorEvent);

/**
 * Exports
 */
module.exports = { interpreter };
