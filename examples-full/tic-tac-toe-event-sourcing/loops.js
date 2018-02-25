/**
 * Import effects
 */
const {
  call,
  delay,
  put,
  take,
  putStream,
  takeStream,
  actionChannel,
  parallel,
  callProc,
  takeChannel,
  select,
} = require('../../lib/effects');

/**
 * Import action creators
 */
const {
  commandCreators,
  eventCreators,
} = require('./actions');

/**
 * Import action handler selectors
 */
const {
  getCommandHandlerByType,
  getEventHandlerByType,
} = require('./handlers');

/**
 * Import processes
 */
const { renderGameBoard } = require('./processes');

/**
 * Input loop
 *
 * NOTE: This is where you listen to all types of events which
 * can trigger effects in your system (listening to the outside world)
 */
const inputLoop = module.exports.inputLoop = function* inputLoop() {
  /**
   * Listen to external events and then trigger puts when something happens
   *
   * TODO: Use pattern matching
   */
  while (true) {
    const data = yield takeStream(process.stdin);
    const input = data.toString().trim();

    switch (input) {
      case 'help':
      yield putStream(process.stdout, `> the available commands are \n- start\n- restart\n`);
      break;

      case 'start':
      case 'restart':
      yield put(commandCreators.restartGame());
      break;

      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      yield put(commandCreators.fillTile(+input));
      break;

      default:
      yield putStream(process.stdout, `invalid command input => ${input || 'blank'}\n`);
      break;
    }
  }
}

/**
 * Render loop
 */
const renderLoop = module.exports.renderLoop = function* renderLoop() {
  /**
   * Create a channel to queue up all incoming events
   */
  const eventChannel = yield actionChannel('*_EVENT');

  /**
   * Listen for events and render the current state
   */
  while (true) {
    /**
     * Get the current state
     */
    const state = yield select();

    /**
     * Render the app
     */
    yield callProc(renderGameBoard, state);

    /**
     * Wait for the next event
     */
    const event = yield takeChannel(eventChannel);
  }
}

/**
 * Event loop
 */
const eventLoop = module.exports.eventLoop = function* eventLoop() {
  /**
   * Create a channel for listening for events
   */
  const eventChannel = yield actionChannel('*_EVENT');

  /**
   * Process events and trigger effects
   */
  while (true) {
    /**
     * Take the next event from the channel / queue
     */
    const [event, currentState, previousState] = yield takeChannel(eventChannel);

    /**
     * Get the appropriate event handler
     */
    const handleEvent = getEventHandlerByType(event.type);

    /**
     * Handle the event and trigger the appropriate effects
     */
    yield callProc(handleEvent, event, currentState, previousState);
  }
}

/**
 * Command loop
 */
const commandLoop = module.exports.commandLoop = function* commandLoop() {
  /**
   * Create a channel to queue up all incoming commands
   */
  const commandChannel = yield actionChannel('*_COMMAND');

  /**
   * Listen for command and handle them sequentially
   */
  while (true) {
    /**
     * Wait for the next command
     */
    const [command, state] = yield takeChannel(commandChannel);

    /**
     * Get the appropriate command handler
     */
    const handleCommand = getCommandHandlerByType(command.type);

    /**
     * Handle the command and capture the generated events
     */
    const [error, events = []] = yield callProc(handleCommand, command, state);

    /**
     * If the command could not be processed
     */
    if (error) {
      yield call(console.log, `Command ${command.type} failed with reason: ${error.message}`);
      continue;
    }

    /**
     * Put the events into the system for other remote consumers
     */
    for (let event of events) {
      yield put(event);
    }
  }
}
