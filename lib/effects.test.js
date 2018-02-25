/**
 * Mocks
 */
jest.mock('uuid', () => ({
  v4: () => 'uuid'
}));

jest.mock('./channel', () => ({
  eventChannel: (emitter, buffer) => {}
}));

/**
 * Test suite for effects
 */
describe('Effects', () => {
  /**
   * Action Channel
   */
  describe('actionChannel', () => {
    it('should work as intended', () => {
      const { actionChannel } = require('./effects');

      /**
       * Create action channel effect
       */
      const effect = actionChannel('*');

      /**
       * Check if we get what we expect
       */
      expect(effect).toEqual({
        id: 'uuid',
        type: '@@action-channel',
        typeOrPattern: '*'
      });

      /**
       * Create fake inputs for resolving
       */
      const { io, engine, parentTask, cb } = {
        io: {
          subscribe: jest.fn(),
        },
        engine: {},
        parentTask: {
          isRunning: true,
        },
        cb: jest.fn(),
      };

      /**
       * Resolve the effect
       */
      actionChannel.resolve(effect, io, engine, parentTask, cb);

      /**
       * Check that what we expect has happened
       */
      expect(cb).toHaveBeenCalled();
    });
  });
});
