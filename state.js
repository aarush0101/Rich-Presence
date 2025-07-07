/**
 * state.js
 * --------
 *
 * Manages the state and connections for the Rich Presence application.
 *
 * @license MIT - see LICENSE for more details
 * @copyright © 2025–present AARUSH MASTER - see package.json for more details
 */

/**
 * Stores WebSocket connections to Discord Gateway for each user token.
 * The key is the user token, and the value is the corresponding WebSocket connection.
 * @type {Map<string, WebSocket>}
 */
const wsMap = new Map();

/**
 * Stores Eris client instances for each user token.
 * The key is the user token, and the value is the Eris client instance.
 * @type {Map<string, import('eris').Client>}
 */
const erisMap = new Map();

/**
 * Stores custom status states for each user token.
 * The key is the user token, and the value is the status string (online, idle, dnd, invisible).
 * @type {Map<string, string>}
 */
const statusMap = new Map();

/**
 * Stores heartbeat interval IDs for each WebSocket connection.
 * The key is the user token, and the value is the interval ID from setInterval().
 * These intervals need to be cleared when disconnecting to prevent memory leaks.
 * @type {Map<string, number>}
 */
const heartbeatIntervals = new Map();

module.exports = {
  wsMap,
  erisMap,
  statusMap,
  heartbeatIntervals,
};
