/**
 * Phaser CocoonJS-Ouya Gamepad API Plugin
 * @version 0.8
 * @author       @videlais <dan.cox@videlais.com>
 * @copyright    2014 Dan Cox
 * @license      {MIT License}
 *
 * Contact: https://github.com/videlais
 */
(function(window, Phaser) {
  /**
   * @author       @karlmacklin <tacklemcclean@gmail.com>
   * @copyright    2014 Photon Storm Ltd.
   * @license      {@link https://github.com/photonstorm/phaser/blob/master/license.txt|MIT License}
   * 
   * The Gamepad class handles looking after gamepad input for your game.
   *
   * @class Phaser.OuyaGamepad
   * @constructor
   * @param {Phaser.Game} game - A reference to the currently running game.
   */
  Phaser.OuyaGamepad = function(game) {

    /**
     * @property {Phaser.Game} game - Local reference to game.
     */
    this.game = game;

    /**
     * @property {Array<Phaser.SingleOuyaPad>} _gamepads - The four Phaser Gamepads.
     * @private
     */
    this._gamepads = [
      new Phaser.SingleOuyaPad(game, this),
      new Phaser.SingleOuyaPad(game, this),
      new Phaser.SingleOuyaPad(game, this),
      new Phaser.SingleOuyaPad(game, this),
      new Phaser.SingleOuyaPad(game, this),
      new Phaser.SingleOuyaPad(game, this),
      new Phaser.SingleOuyaPad(game, this),
      new Phaser.SingleOuyaPad(game, this),
      new Phaser.SingleOuyaPad(game, this),
      new Phaser.SingleOuyaPad(game, this),
      new Phaser.SingleOuyaPad(game, this)
    ];

    /**
     * @property {Object} _gamepadIndexMap - Maps the browsers gamepad indices to our Phaser Gamepads
     * @private
     */
    this._gamepadIndexMap = {};

    /**
     * @property {Array} _rawPads - The raw state of the gamepads from the browser
     * @private
     */
    this._rawPads = [];

    /**
     * @property {boolean} _active - Private flag for whether or not the API is polled
     * @private
     * @default
     */
    this._active = false;

    /**
     * You can disable all Gamepad Input by setting disabled to true. While true all new input related events will be ignored.
     * @property {boolean} disabled - The disabled state of the Gamepad.
     * @default
     */
    this.disabled = false;

    /**
     * Whether or not gamepads are supported in the current browser. Note that as of Dec. 2013 this check is actually not accurate at all due to poor implementation.
     * @property {boolean} _gamepadSupportAvailable - Are gamepads supported in this browser or not?
     * @private
     */
    this._gamepadSupportAvailable = !!navigator.getGamepads;

    /**
     * Used to check for differences between earlier polls and current state of gamepads.
     * @property {Array} _prevRawGamepadTypes
     * @private
     * @default
     */
    this._prevRawGamepadTypes = [];

    /**
     * Used to check for differences between earlier polls and current state of gamepads.
     * @property {Array} _prevTimestamps
     * @private
     * @default
     */
    this._prevTimestamps = [];

    /**
     * @property {Object} callbackContext - The context under which the callbacks are run.
     */
    this.callbackContext = this;

    /**
     * @property {function} onConnectCallback - This callback is invoked every time any gamepad is connected
     */
    this.onConnectCallback = null;

    /**
     * @property {function} onDisconnectCallback - This callback is invoked every time any gamepad is disconnected
     */
    this.onDisconnectCallback = null;

    /**
     * @property {function} onDownCallback - This callback is invoked every time any gamepad button is pressed down.
     */
    this.onDownCallback = null;

    /**
     * @property {function} onUpCallback - This callback is invoked every time any gamepad button is released.
     */
    this.onUpCallback = null;

    /**
     * @property {function} onAxisCallback - This callback is invoked every time any gamepad axis is changed.
     */
    this.onAxisCallback = null;

    /**
     * @property {function} onFloatCallback - This callback is invoked every time any gamepad button is changed to a value where value > 0 and value < 1.
     */
    this.onFloatCallback = null;

    /**
     * @property {function} _ongamepadconnected - Private callback for Firefox gamepad connection handling
     * @private
     */
    this._ongamepadconnected = null;

    /**
     * @property {function} _gamepaddisconnected - Private callback for Firefox gamepad connection handling
     * @private
     */
    this._gamepaddisconnected = null;
  };

  Phaser.OuyaGamepad.prototype = {
    /**
     * Add callbacks to the main Gamepad handler to handle connect/disconnect/button down/button up/axis change/float value buttons
     * @method Phaser.OuyaGamepad#addCallbacks
     * @param {Object} context - The context under which the callbacks are run.
     * @param {Object} callbacks - Object that takes six different callback methods:
     * onConnectCallback, onDisconnectCallback, onDownCallback, onUpCallback, onAxisCallback, onFloatCallback
     */
    addCallbacks: function(context, callbacks) {

      if (typeof callbacks !== 'undefined')
      {
        this.onConnectCallback = (typeof callbacks.onConnect === 'function') ? callbacks.onConnect : this.onConnectCallback;
        this.onDisconnectCallback = (typeof callbacks.onDisconnect === 'function') ? callbacks.onDisconnect : this.onDisconnectCallback;
        this.onDownCallback = (typeof callbacks.onDown === 'function') ? callbacks.onDown : this.onDownCallback;
        this.onUpCallback = (typeof callbacks.onUp === 'function') ? callbacks.onUp : this.onUpCallback;
        this.onAxisCallback = (typeof callbacks.onAxis === 'function') ? callbacks.onAxis : this.onAxisCallback;
        this.onFloatCallback = (typeof callbacks.onFloat === 'function') ? callbacks.onFloat : this.onFloatCallback;
      }

    },
    /**
     * Starts the Gamepad event handling.
     * This MUST be called manually before Phaser will start polling the Gamepad API.
     *
     * @method Phaser.OuyaGamepad#start
     */
    start: function() {

      this._active = true;
      var _this = this;

      this._ongamepadconnected = function(event) {
        var newPad = event.gamepad;
        _this._rawPads.push(newPad);
        for (var i in _this._gamepads)
        {
          if (!_this._gamepads[i].connected)
          {
            _this._gamepads[i].connect(newPad);
            break;
          }
        }
      };

      window.addEventListener('gamepadconnected', this._ongamepadconnected, false);

      this._ongamepaddisconnected = function(event) {

        var removedPad = event.gamepad;
        var removedPadIndex = 0;

        for (var i in _this._rawPads)
        {
          if (_this._rawPads[i].index === removedPad.index)
          {
            _this._rawPads.splice(i, 1);
            removedPadIndex = i;
          }
        }
        _this._gamepads[removedPadIndex].disconnect();
      };

      window.addEventListener('gamepaddisconnected', this._ongamepaddisconnected, false);

    },
    /**
     * Main gamepad update loop. Called by plugin
     * @method Phaser.OuyaGamepad#update
     * @private
     */
    update: function() {

      this._pollGamepads();

      for (var i = 0; i < this._gamepads.length; i++)
      {
        if (this._gamepads[i]._connected)
        {
          this._gamepads[i].pollStatus();
        }
      }

    },
    /**
     * Updating connected gamepads (for CocoonJS-Ouya).
     * Should not be called manually.
     * @method Phaser.OuyaGamepad#_pollGamepads
     * @private
     */
    _pollGamepads: function() {

      var rawGamepads = (navigator.getGamepads && navigator.getGamepads());

      if (rawGamepads)
      {
        this._rawPads = [];

        var gamepadsChanged = false;

        for (var i = 0; i < rawGamepads.length; i++)
        {
          if (typeof rawGamepads[i] !== this._prevRawGamepadTypes[i])
          {
            gamepadsChanged = true;
            this._prevRawGamepadTypes[i] = typeof rawGamepads[i];
          }

          if (rawGamepads[i])
          {
            this._rawPads.push(rawGamepads[i]);
          }

          // Support max 11 pads at the moment
          if (i === 10)
          {
            break;
          }
        }

        if (gamepadsChanged)
        {
          var validConnections = {rawIndices: {}, padIndices: {}};
          var singlePad;

          for (var j = 0; j < this._gamepads.length; j++)
          {
            singlePad = this._gamepads[j];

            if (singlePad.connected)
            {
              for (var k = 0; k < this._rawPads.length; k++)
              {
                if (this._rawPads[k].index === singlePad.index)
                {
                  validConnections.rawIndices[singlePad.index] = true;
                  validConnections.padIndices[j] = true;
                }
              }
            }
          }

          for (var l = 0; l < this._gamepads.length; l++)
          {
            singlePad = this._gamepads[l];

            if (validConnections.padIndices[l])
            {
              continue;
            }

            if (this._rawPads.length < 1)
            {
              singlePad.disconnect();
            }

            for (var m = 0; m < this._rawPads.length; m++)
            {
              if (validConnections.padIndices[l])
              {
                break;
              }

              var rawPad = this._rawPads[m];

              if (rawPad)
              {
                if (validConnections.rawIndices[rawPad.index])
                {
                  singlePad.disconnect();
                  continue;
                }
                else
                {
                  singlePad.connect(rawPad);
                  validConnections.rawIndices[rawPad.index] = true;
                  validConnections.padIndices[l] = true;
                }
              }
              else
              {
                singlePad.disconnect();
              }
            }
          }
        }
      }
    },
    /**
     * Sets the deadZone variable for all four gamepads
     * @method Phaser.OuyaGamepad#setDeadZones
     */
    setDeadZones: function(value) {

      for (var i = 0; i < this._gamepads.length; i++)
      {
        this._gamepads[i].deadZone = value;
      }

    },
    /**
     * Stops the Gamepad event handling.
     *
     * @method Phaser.OuyaGamepad#stop
     */
    stop: function() {

      this._active = false;

      window.removeEventListener('gamepadconnected', this._ongamepadconnected);
      window.removeEventListener('gamepaddisconnected', this._ongamepaddisconnected);

    },
    /**
     * Reset all buttons/axes of all gamepads
     * @method Phaser.OuyaGamepad#reset
     */
    reset: function() {

      this.update();

      for (var i = 0; i < this._gamepads.length; i++)
      {
        this._gamepads[i].reset();
      }

    },
    /**
     * Returns the "just pressed" state of a button from ANY gamepad connected. Just pressed is considered true if the button was pressed down within the duration given (default 250ms).
     * @method Phaser.OuyaGamepad#justPressed
     * @param {number} buttonCode - The buttonCode of the button to check for.
     * @param {number} [duration=250] - The duration below which the button is considered as being just pressed.
     * @return {boolean} True if the button is just pressed otherwise false.
     */
    justPressed: function(buttonCode, duration) {

      for (var i = 0; i < this._gamepads.length; i++)
      {
        if (this._gamepads[i].justPressed(buttonCode, duration) === true)
        {
          return true;
        }
      }

      return false;

    },
    /**
     * Returns the "just released" state of a button from ANY gamepad connected. Just released is considered as being true if the button was released within the duration given (default 250ms).
     * @method Phaser.OuyaGamepad#justPressed
     * @param {number} buttonCode - The buttonCode of the button to check for.
     * @param {number} [duration=250] - The duration below which the button is considered as being just released.
     * @return {boolean} True if the button is just released otherwise false.
     */
    justReleased: function(buttonCode, duration) {

      for (var i = 0; i < this._gamepads.length; i++)
      {
        if (this._gamepads[i].justReleased(buttonCode, duration) === true)
        {
          return true;
        }
      }

      return false;

    },
    /**
     * Returns true if the button is currently pressed down, on ANY gamepad.
     * @method Phaser.OuyaGamepad#isDown
     * @param {number} buttonCode - The buttonCode of the button to check for.
     * @return {boolean} True if a button is currently down.
     */
    isDown: function(buttonCode) {

      for (var i = 0; i < this._gamepads.length; i++)
      {
        if (this._gamepads[i].isDown(buttonCode) === true)
        {
          return true;
        }
      }

      return false;
    }

  };

  Phaser.OuyaGamepad.prototype.constructor = Phaser.OuyaGamepad;

  /**
   * If the gamepad input is active or not - if not active it should not be updated from Input.js
   * @name Phaser.OuyaGamepad#active
   * @property {boolean} active - If the gamepad input is active or not.
   * @readonly
   */
  Object.defineProperty(Phaser.OuyaGamepad.prototype, "active", {
    get: function() {
      return this._active;
    }

  });

  /**
   * Whether or not gamepads are supported in current browser.
   * @name Phaser.OuyaGamepad#supported
   * @property {boolean} supported - Whether or not gamepads are supported in current browser.
   * @readonly
   */
  Object.defineProperty(Phaser.OuyaGamepad.prototype, "supported", {
    get: function() {
      return this._gamepadSupportAvailable;
    }

  });

  /**
   * How many live gamepads are currently connected.
   * @name Phaser.OuyaGamepad#padsConnected
   * @property {boolean} padsConnected - How many live gamepads are currently connected.
   * @readonly
   */
  Object.defineProperty(Phaser.OuyaGamepad.prototype, "padsConnected", {
    get: function() {
      return this._rawPads.length;
    }

  });

  /**
   * Gamepad #1
   * @name Phaser.OuyaGamepad#pad1
   * @property {boolean} pad1 - Gamepad #1;
   * @readonly
   */
  Object.defineProperty(Phaser.OuyaGamepad.prototype, "pad1", {
    get: function() {
      return this._gamepads[0];
    }

  });

  /**
   * Gamepad #2
   * @name Phaser.OuyaGamepad#pad2
   * @property {boolean} pad2 - Gamepad #2
   * @readonly
   */
  Object.defineProperty(Phaser.OuyaGamepad.prototype, "pad2", {
    get: function() {
      return this._gamepads[1];
    }

  });

  /**
   * Gamepad #3
   * @name Phaser.OuyaGamepad#pad3
   * @property {boolean} pad3 - Gamepad #3
   * @readonly
   */
  Object.defineProperty(Phaser.OuyaGamepad.prototype, "pad3", {
    get: function() {
      return this._gamepads[2];
    }

  });

  /**
   * Gamepad #4
   * @name Phaser.OuyaGamepad#pad4
   * @property {boolean} pad4 - Gamepad #4
   * @readonly
   */
  Object.defineProperty(Phaser.OuyaGamepad.prototype, "pad4", {
    get: function() {
      return this._gamepads[3];
    }

  });

  /**
   * Gamepad #5
   * @name Phaser.OuyaGamepad#pad5
   * @property {boolean} pad5 - Gamepad #5
   * @readonly
   */
  Object.defineProperty(Phaser.OuyaGamepad.prototype, "pad5", {
    get: function() {
      return this._gamepads[4];
    }

  });

  /**
   * Gamepad #6
   * @name Phaser.OuyaGamepad#pad6
   * @property {boolean} pad6 - Gamepad #6
   * @readonly
   */
  Object.defineProperty(Phaser.OuyaGamepad.prototype, "pad6", {
    get: function() {
      return this._gamepads[5];
    }

  });

  /**
   * Gamepad #7
   * @name Phaser.OuyaGamepad#pad7
   * @property {boolean} pad7 - Gamepad #7
   * @readonly
   */
  Object.defineProperty(Phaser.OuyaGamepad.prototype, "pad7", {
    get: function() {
      return this._gamepads[6];
    }

  });

  /**
   * Gamepad #8
   * @name Phaser.OuyaGamepad#pad8
   * @property {boolean} pad8 - Gamepad #8
   * @readonly
   */
  Object.defineProperty(Phaser.OuyaGamepad.prototype, "pad8", {
    get: function() {
      return this._gamepads[7];
    }

  });

  /**
   * Gamepad #9
   * @name Phaser.OuyaGamepad#pad9
   * @property {boolean} pad9 - Gamepad #9
   * @readonly
   */
  Object.defineProperty(Phaser.OuyaGamepad.prototype, "pad9", {
    get: function() {
      return this._gamepads[8];
    }

  });

  /**
   * Gamepad #10
   * @name Phaser.OuyaGamepad#pad10
   * @property {boolean} pad10 - Gamepad #10
   * @readonly
   */
  Object.defineProperty(Phaser.OuyaGamepad.prototype, "pad10", {
    get: function() {
      return this._gamepads[9];
    }

  });

  /**
   * Gamepad #11
   * @name Phaser.OuyaGamepad#pad11
   * @property {boolean} pad11 - Gamepad #11
   * @readonly
   */
  Object.defineProperty(Phaser.OuyaGamepad.prototype, "pad11", {
    get: function() {
      return this._gamepads[10];
    }

  });

  Phaser.OuyaGamepad.BUTTON_O = 0;
  Phaser.OuyaGamepad.BUTTON_A = 1;
  Phaser.OuyaGamepad.BUTTON_U = 2;
  Phaser.OuyaGamepad.BUTTON_Y = 3;
  Phaser.OuyaGamepad.BUTTON_LEFT_BUMPER = 4;
  Phaser.OuyaGamepad.BUTTON_RIGHT_BUMPER = 5;
  Phaser.OuyaGamepad.BUTTON_LEFT_TRIGGER = 6;
  Phaser.OuyaGamepad.BUTTON_RIGHT_TRIGGER = 7;
  Phaser.OuyaGamepad.BUTTON_STICK_LEFT_BUTTON = 10;
  Phaser.OuyaGamepad.BUTTON_STICK_RIGHT_BUTTON = 11;
  Phaser.OuyaGamepad.BUTTON_DPAD_UP = 12;
  Phaser.OuyaGamepad.BUTTON_DPAD_DOWN = 13;
  Phaser.OuyaGamepad.BUTTON_DPAD_LEFT = 14;
  Phaser.OuyaGamepad.BUTTON_DPAD_RIGHT = 15;

  Phaser.OuyaGamepad.AXIS_STICK_LEFT_X = 0;
  Phaser.OuyaGamepad.AXIS_STICK_LEFT_Y = 1;
  Phaser.OuyaGamepad.AXIS_STICK_RIGHT_X = 2;
  Phaser.OuyaGamepad.AXIS_STICK_RIGHT_Y = 3;

  /**
   * @author       @karlmacklin <tacklemcclean@gmail.com>
   * @copyright    2014 Photon Storm Ltd.
   * @license      {@link https://github.com/photonstorm/phaser/blob/master/license.txt|MIT License}
   */

  /**
   * @class Phaser.SingleOuyaPad
   * @classdesc A single Phaser Gamepad
   * @constructor
   * @param {Phaser.Game} game - Current game instance.
   * @param {Object} padParent - The parent Phaser.Gamepad object (all gamepads reside under this)
   */
  Phaser.SingleOuyaPad = function(game, padParent) {

    /**
     * @property {Phaser.Game} game - Local reference to game.
     */
    this.game = game;

    /**
     * @property {Phaser.Gamepad} padParent - Main Phaser Gamepad object
     */
    this._padParent = padParent;

    /**
     * @property {number} index - The gamepad index as per browsers data
     * @default
     */
    this._index = null;

    /**
     * @property {Object} _rawPad - The 'raw' gamepad data.
     * @private
     */
    this._rawPad = null;

    /**
     * @property {boolean} _connected - Is this pad connected or not.
     * @private
     */
    this._connected = false;

    /**
     * @property {number} _prevTimestamp - Used to check for differences between earlier polls and current state of gamepads.
     * @private
     */
    this._prevTimestamp = null;

    /**
     * @property {Array} _rawButtons - The 'raw' button state.
     * @private
     */
    this._rawButtons = [];

    /**
     * @property {Array} _buttons - Current Phaser state of the buttons.
     * @private
     */
    this._buttons = [];

    /**
     * @property {Array} _axes - Current axes state.
     * @private
     */
    this._axes = [];

    /**
     * @property {Array} _hotkeys - Hotkey buttons.
     * @private
     */
    this._hotkeys = [];

    /**
     * @property {Object} callbackContext - The context under which the callbacks are run.
     */
    this.callbackContext = this;

    /**
     * @property {function} onConnectCallback - This callback is invoked every time this gamepad is connected
     */
    this.onConnectCallback = null;

    /**
     * @property {function} onDisconnectCallback - This callback is invoked every time this gamepad is disconnected
     */
    this.onDisconnectCallback = null;

    /**
     * @property {function} onDownCallback - This callback is invoked every time a button is pressed down.
     */
    this.onDownCallback = null;

    /**
     * @property {function} onUpCallback - This callback is invoked every time a gamepad button is released.
     */
    this.onUpCallback = null;

    /**
     * @property {function} onAxisCallback - This callback is invoked every time an axis is changed.
     */
    this.onAxisCallback = null;

    /**
     * @property {function} onFloatCallback - This callback is invoked every time a button is changed to a value where value > 0 and value < 1.
     */
    this.onFloatCallback = null;

    /**
     * @property {number} deadZone - Dead zone for axis feedback - within this value you won't trigger updates.
     */
    this.deadZone = 0.26;

  };

  Phaser.SingleOuyaPad.prototype = {
    /**
     * Add callbacks to the this Gamepad to handle connect/disconnect/button down/button up/axis change/float value buttons
     * @method Phaser.Gamepad#addCallbacks
     * @param {Object} context - The context under which the callbacks are run.
     * @param {Object} callbacks - Object that takes six different callbak methods:
     * onConnectCallback, onDisconnectCallback, onDownCallback, onUpCallback, onAxisCallback, onFloatCallback
     */
    addCallbacks: function(context, callbacks) {

      if (typeof callbacks !== 'undefined')
      {
        this.onConnectCallback = (typeof callbacks.onConnect === 'function') ? callbacks.onConnect : this.onConnectCallback;
        this.onDisconnectCallback = (typeof callbacks.onDisconnect === 'function') ? callbacks.onDisconnect : this.onDisconnectCallback;
        this.onDownCallback = (typeof callbacks.onDown === 'function') ? callbacks.onDown : this.onDownCallback;
        this.onUpCallback = (typeof callbacks.onUp === 'function') ? callbacks.onUp : this.onUpCallback;
        this.onAxisCallback = (typeof callbacks.onAxis === 'function') ? callbacks.onAxis : this.onAxisCallback;
        this.onFloatCallback = (typeof callbacks.onFloat === 'function') ? callbacks.onFloat : this.onFloatCallback;
      }

    },
    /**
     * If you need more fine-grained control over a Key you can create a new Phaser.Key object via this method.
     * The Key object can then be polled, have events attached to it, etc.
     *
     * @method Phaser.SingleOuyaPad#addButton
     * @param {number} buttonCode - The buttonCode of the button, i.e. Phaser.Gamepad.BUTTON_0 or Phaser.Gamepad.BUTTON_1
     * @return {Phaser.GamepadButton} The GamepadButton object which you can store locally and reference directly.
     */
    addButton: function(buttonCode) {

      this._hotkeys[buttonCode] = new Phaser.GamepadButton(this.game, buttonCode);
      return this._hotkeys[buttonCode];

    },
    /**
     * Main update function, should be called by Phaser.Gamepad
     * @method Phaser.SingleOuyaPad#pollStatus
     */
    pollStatus: function() {

      for (var i = 0; i < this._rawPad.buttons.length; i += 1)
      {
        var buttonValue = this._rawPad.buttons[i];

        if (this._rawButtons[i] !== buttonValue)
        {
          if (buttonValue === 1)
          {
            this.processButtonDown(i, buttonValue);
          }
          else if (buttonValue === 0)
          {
            this.processButtonUp(i, buttonValue);
          }
          else
          {
            this.processButtonFloat(i, buttonValue);
          }

          this._rawButtons[i] = buttonValue;
        }
      }

      var axes = this._rawPad.axes;

      var magitudeLeft = Math.sqrt((axes[0] * axes[0]) +
              (axes[1] * axes[1]));
      var magitudeRight = Math.sqrt((axes[2] * axes[2]) +
              (axes[3] * axes[3]));
      var normalizedLeft = ((magitudeLeft - this.deadZone) / (1 - this.deadZone));
      var normalizedRight = ((magitudeRight - this.deadZone) / (1 - this.deadZone));

      axes[0] = (axes[0] / magitudeLeft) * normalizedLeft;
      axes[1] = (axes[1] / magitudeLeft) * normalizedLeft;
      axes[2] = (axes[2] / magitudeRight) * normalizedRight;
      axes[3] = (axes[3] / magitudeRight) * normalizedRight;


      for (var j = 0; j < axes.length; j += 1)
      {
        var axis = axes[j];
        if (axis <= 1.05)
        {
          this.processAxisChange({axis: j, value: axis});
        }
        else
        {
          this.processAxisChange({axis: j, value: 0});
        }
      }

      this._prevTimestamp = this._rawPad.timestamp;

    },
    /**
     * Gamepad connect function, should be called by Phaser.Gamepad
     * @param {Object} rawPad - The raw gamepad object
     * @method Phaser.SingleOuyaPad#connect
     */
    connect: function(rawPad) {

      var triggerCallback = !this._connected;

      this._index = rawPad.index;
      this._connected = true;
      this._rawPad = rawPad;
      this._rawButtons = rawPad.buttons;
      this._axes = rawPad.axes;

      if (triggerCallback && this._padParent.onConnectCallback)
      {
        this._padParent.onConnectCallback.call(this._padParent.callbackContext, this._index);
      }

      if (triggerCallback && this.onConnectCallback)
      {
        this.onConnectCallback.call(this.callbackContext);
      }

    },
    /**
     * Gamepad disconnect function, should be called by Phaser.Gamepad
     * @method Phaser.SingleOuyaPad#disconnect
     */
    disconnect: function() {

      var triggerCallback = this._connected;
      this._connected = false;
      this._rawPad = undefined;
      this._rawButtons = [];
      this._buttons = [];
      var disconnectingIndex = this._index;
      this._index = null;

      if (triggerCallback && this._padParent.onDisconnectCallback)
      {
        this._padParent.onDisconnectCallback.call(this._padParent.callbackContext, disconnectingIndex);
      }

      if (triggerCallback && this.onDisconnectCallback)
      {
        this.onDisconnectCallback.call(this.callbackContext);
      }

    },
    /**
     * Handles changes in axis
     * @param {Object} axisState - State of the relevant axis
     * @method Phaser.SingleOuyaPad#processAxisChange
     */
    processAxisChange: function(axisState) {

      if (this.game.input.disabled || this.game.input.gamepad.disabled)
      {
        return;
      }

      if (this._axes[axisState.axis] === axisState.value)
      {
        return;
      }

      this._axes[axisState.axis] = axisState.value;

      if (this._padParent.onAxisCallback)
      {
        this._padParent.onAxisCallback.call(this._padParent.callbackContext, axisState, this._index);
      }

      if (this.onAxisCallback)
      {
        this.onAxisCallback.call(this.callbackContext, axisState);
      }

    },
    /**
     * Handles button down press
     * @param {number} buttonCode - Which buttonCode of this button
     * @param {Object} value - Button value
     * @method Phaser.SingleOuyaPad#processButtonDown
     */
    processButtonDown: function(buttonCode, value) {

      if (this.game.input.disabled || this.game.input.gamepad.disabled)
      {
        return;
      }

      if (this._padParent.onDownCallback)
      {
        this._padParent.onDownCallback.call(this._padParent.callbackContext, buttonCode, value, this._index);
      }

      if (this.onDownCallback)
      {
        this.onDownCallback.call(this.callbackContext, buttonCode, value);
      }

      if (this._buttons[buttonCode] && this._buttons[buttonCode].isDown)
      {
        //  Key already down and still down, so update
        this._buttons[buttonCode].duration = this.game.time.now - this._buttons[buttonCode].timeDown;
      }
      else
      {
        if (!this._buttons[buttonCode])
        {
          //  Not used this button before, so register it
          this._buttons[buttonCode] = {
            isDown: true,
            timeDown: this.game.time.now,
            timeUp: 0,
            duration: 0,
            value: value
          };
        }
        else
        {
          //  Button used before but freshly down
          this._buttons[buttonCode].isDown = true;
          this._buttons[buttonCode].timeDown = this.game.time.now;
          this._buttons[buttonCode].duration = 0;
          this._buttons[buttonCode].value = value;
        }
      }

      if (this._hotkeys[buttonCode])
      {
        this._hotkeys[buttonCode].processButtonDown(value);
      }

    },
    /**
     * Handles button release
     * @param {number} buttonCode - Which buttonCode of this button
     * @param {Object} value - Button value
     * @method Phaser.SingleOuyaPad#processButtonUp
     */
    processButtonUp: function(buttonCode, value) {

      if (this.game.input.disabled || this.game.input.gamepad.disabled)
      {
        return;
      }

      if (this._padParent.onUpCallback)
      {
        this._padParent.onUpCallback.call(this._padParent.callbackContext, buttonCode, value, this._index);
      }

      if (this.onUpCallback)
      {
        this.onUpCallback.call(this.callbackContext, buttonCode, value);
      }

      if (this._hotkeys[buttonCode])
      {
        this._hotkeys[buttonCode].processButtonUp(value);
      }

      if (this._buttons[buttonCode])
      {
        this._buttons[buttonCode].isDown = false;
        this._buttons[buttonCode].timeUp = this.game.time.now;
        this._buttons[buttonCode].value = value;
      }
      else
      {
        //  Not used this button before, so register it
        this._buttons[buttonCode] = {
          isDown: false,
          timeDown: this.game.time.now,
          timeUp: this.game.time.now,
          duration: 0,
          value: value
        };
      }

    },
    /**
     * Handles buttons with floating values (like analog buttons that acts almost like an axis but still registers like a button)
     * @param {number} buttonCode - Which buttonCode of this button
     * @param {Object} value - Button value (will range somewhere between 0 and 1, but not specifically 0 or 1.
     * @method Phaser.SingleOuyaPad#processButtonFloat
     */
    processButtonFloat: function(buttonCode, value) {

      if (this.game.input.disabled || this.game.input.gamepad.disabled)
      {
        return;
      }

      if (this._padParent.onFloatCallback)
      {
        this._padParent.onFloatCallback.call(this._padParent.callbackContext, buttonCode, value, this._index);
      }

      if (this.onFloatCallback)
      {
        this.onFloatCallback.call(this.callbackContext, buttonCode, value);
      }

      if (!this._buttons[buttonCode])
      {
        //  Not used this button before, so register it
        this._buttons[buttonCode] = {value: value};
      }
      else
      {
        //  Button used before but freshly down
        this._buttons[buttonCode].value = value;
      }

      if (this._hotkeys[buttonCode])
      {
        this._hotkeys[buttonCode].processButtonFloat(value);
      }

    },
    /**
     * Returns value of requested axis
     * @method Phaser.SingleOuyaPad#isDown
     * @param {number} axisCode - The index of the axis to check
     * @return {number} Axis value if available otherwise false
     */
    axis: function(axisCode) {

      if (this._axes[axisCode])
      {
        return this._axes[axisCode];
      }

      return false;

    },
    /**
     * Returns true if the button is currently pressed down.
     * @method Phaser.SingleOuyaPad#isDown
     * @param {number} buttonCode - The buttonCode of the key to check.
     * @return {boolean} True if the key is currently down.
     */
    isDown: function(buttonCode) {

      if (this._buttons[buttonCode])
      {
        return this._buttons[buttonCode].isDown;
      }

      return false;

    },
    /**
     * Returns the "just released" state of a button from this gamepad. Just released is considered as being true if the button was released within the duration given (default 250ms).
     * @method Phaser.SingleOuyaPad#justPressed
     * @param {number} buttonCode - The buttonCode of the button to check for.
     * @param {number} [duration=250] - The duration below which the button is considered as being just released.
     * @return {boolean} True if the button is just released otherwise false.
     */
    justReleased: function(buttonCode, duration) {

      if (typeof duration === "undefined") {
        duration = 250;
      }

      return (this._buttons[buttonCode] && this._buttons[buttonCode].isDown === false && (this.game.time.now - this._buttons[buttonCode].timeUp < duration));

    },
    /**
     * Returns the "just pressed" state of a button from this gamepad. Just pressed is considered true if the button was pressed down within the duration given (default 250ms).
     * @method Phaser.SingleOuyaPad#justPressed
     * @param {number} buttonCode - The buttonCode of the button to check for.
     * @param {number} [duration=250] - The duration below which the button is considered as being just pressed.
     * @return {boolean} True if the button is just pressed otherwise false.
     */
    justPressed: function(buttonCode, duration) {

      if (typeof duration === "undefined") {
        duration = 250;
      }

      return (this._buttons[buttonCode] && this._buttons[buttonCode].isDown && this._buttons[buttonCode].duration < duration);

    },
    /**
     * Returns the value of a gamepad button. Intended mainly for cases when you have floating button values, for example
     * analog trigger buttons on the XBOX 360 controller
     * @method Phaser.SingleOuyaPad#buttonValue
     * @param {number} buttonCode - The buttonCode of the button to check.
     * @return {boolean} Button value if available otherwise false.
     */
    buttonValue: function(buttonCode) {

      if (this._buttons[buttonCode])
      {
        return this._buttons[buttonCode].value;
      }

      return false;

    },
    /**
     * Reset all buttons/axes of this gamepad
     * @method Phaser.SingleOuyaPad#reset
     */
    reset: function() {

      for (var i = 0; i < this._buttons.length; i++)
      {
        this._buttons[i] = 0;
      }

      for (var j = 0; j < this._axes.length; j++)
      {
        this._axes[j] = 0;
      }

    }

  };

  Phaser.SingleOuyaPad.prototype.constructor = Phaser.SingleOuyaPad;

  /**
   * Whether or not this particular gamepad is connected or not.
   * @name Phaser.SingleOuyaPad#connected
   * @property {boolean} connected - Whether or not this particular gamepad is connected or not.
   * @readonly
   */
  Object.defineProperty(Phaser.SingleOuyaPad.prototype, "connected", {
    get: function() {
      return this._connected;
    }

  });

  /**
   * Gamepad index as per browser data
   * @name Phaser.SingleOuyaPad#index
   * @property {number} index - The gamepad index, used to identify specific gamepads in the browser
   * @readonly
   */
  Object.defineProperty(Phaser.SingleOuyaPad.prototype, "index", {
    get: function() {
      return this._index;
    }

  });


  /* Settings object */
  var settings = {
    POLLINGRATE: 140 /* ms */
  };

  var _time = 0;
  var _active = false;
  var _ouyaGamepad = null;

  /**
   * CocoonJS-Ouya Gamepad API Plugin for Phaser
   * @param {Phaser.Game} game The 'Game' object created by Phaser
   * @param {Object} parent 
   */
  Phaser.Plugin.CocoonJSOuyaGamepad = function(game, parent) {
    /* Extend the plugin */
    Phaser.Plugin.call(this, game, parent);
    _ouyaGamepad = new Phaser.OuyaGamepad(game);
  };

  //Extends the Phaser.Plugin template, setting up values we need
  Phaser.Plugin.CocoonJSOuyaGamepad.prototype = Object.create(Phaser.Plugin.prototype);
  Phaser.Plugin.CocoonJSOuyaGamepad.prototype.constructor = Phaser.Plugin.CocoonJSOuyaGamepad;

  Phaser.Plugin.CocoonJSOuyaGamepad.prototype.setDeadZones = function(value) {
    _ouyaGamepad.setDeadZones(value);
  };

  Phaser.Plugin.CocoonJSOuyaGamepad.prototype.startPolling = function() {
    _ouyaGamepad.start();
    _active = true;
  };

  Phaser.Plugin.CocoonJSOuyaGamepad.prototype.stopPolling = function() {
    _ouyaGamepad.stop();
    _active = false;
  };

  Phaser.Plugin.CocoonJSOuyaGamepad.prototype.update = function() {
    if (settings.POLLINGRATE < this.game.time.now - _time && _active) {
      _ouyaGamepad.update();
    }
  };
  
  Phaser.Plugin.CocoonJSOuyaGamepad.prototype.addCallbacks = function(context, callbacks) {
    _ouyaGamepad.addCallbacks(context, callbacks);
  };

  Object.defineProperty(Phaser.Plugin.CocoonJSOuyaGamepad.prototype, "pollingRate", {
    get: function() {
      return settings.POLLINGRATE;
    },
    set: function(value) {
      settings.POLLINGRATE = value;
    }
  });
  
  Object.defineProperty(Phaser.Plugin.CocoonJSOuyaGamepad.prototype, "gamepads", {
    get: function() {
      return _ouyaGamepad;
    }
  });

})(window, Phaser);