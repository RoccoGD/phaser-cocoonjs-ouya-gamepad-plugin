/**
 * Phaser CocoonJS-Ouya Gamepad API Plugin
 * @author       @videlais <dan.cox@videlais.com>
 * @copyright    2014 Dan Cox
 * @license      {MIT License}
 *
 * Contact: https://github.com/videlais
 */
(function(window, Phaser) {
  /**
   * CocoonJS-Ouya Gamepad API Plugin for Phaser
   * @param {Phaser.Game} game The 'Game' object created by Phaser
   * @param {Object} parent 
   */
  Phaser.Plugin.CocoonJSOuyaGamepad = function(game, parent) {
    /* Extend the plugin */
    Phaser.Plugin.call(this, game, parent);
    _game = game;
    _parent = parent;
  };

  //Extends the Phaser.Plugin template, setting up values we need
  Phaser.Plugin.CocoonJSOuyaGamepad.prototype = Object.create(Phaser.Plugin.prototype);
  Phaser.Plugin.CocoonJSOuyaGamepad.prototype.constructor = Phaser.Plugin.CocoonJSOuyaGamepad;

  var onGamepadConnect = function(event) {
    var newPad = event.gamepad;
    _rawPads.push(newPad);
    for (var i in _gamepads)
    {
      if (!_gamepads[i].connected)
      {
        _gamepads[i].connect(newPad);
        break;
      }
    }
  };

  var onGamepadDisconnect = function(event) {

    var removedPad = event.gamepad;
    var removedPadIndex = 0;

    for (var i in _rawPads)
    {
      if (_rawPads[i].index === removedPad.index)
      {
        _rawPads.splice(i, 1);
        removedPadIndex = i;
      }
    }
    _gamepads[removedPadIndex].disconnect();
  };

  /**
   * Main update function, should be called by Phaser.Gamepad
   * @method Phaser.SinglePad#pollStatus
   */
  Phaser.SinglePad.prototype.pollStatus = function() {

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
      if (axis <= 1.1)
      {
        this.processAxisChange({axis: j, value: axis});
      }
      else
      {
        this.processAxisChange({axis: j, value: 0});
      }
    }

  };

  /**
   * Handles changes in axis
   * @param {Object} axisState - State of the relevant axis
   * @method Phaser.SinglePad#processAxisChange
   */
  Phaser.SinglePad.prototype.processAxisChange = function(axisState) {

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

  };

  /**
   * Handles button down press
   * @param {number} buttonCode - Which buttonCode of this button
   * @param {Object} value - Button value
   * @method Phaser.SinglePad#processButtonDown
   */
  Phaser.SinglePad.prototype.processButtonDown = function(buttonCode, value) {

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

  };

  /**
   * Handles button release
   * @param {number} buttonCode - Which buttonCode of this button
   * @param {Object} value - Button value
   * @method Phaser.SinglePad#processButtonUp
   */
  Phaser.SinglePad.prototype.processButtonUp = function(buttonCode, value) {

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

  };

  /**
   * Handles buttons with floating values (like analog buttons that acts almost like an axis but still registers like a button)
   * @param {number} buttonCode - Which buttonCode of this button
   * @param {Object} value - Button value (will range somewhere between 0 and 1, but not specifically 0 or 1.
   * @method Phaser.SinglePad#processButtonFloat
   */
  Phaser.SinglePad.prototype.processButtonFloat = function(buttonCode, value) {

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

  };

  /**
   * Returns value of requested axis
   * @method Phaser.SinglePad#isDown
   * @param {number} axisCode - The index of the axis to check
   * @return {number} Axis value if available otherwise false
   */
  Phaser.SinglePad.prototype.axis = function(axisCode) {

    if (this._axes[axisCode] && this._axes[axisCode] <= 1)
    {
      return this._axes[axisCode];
    }

    return false;

  };


  /**
   * 
   */
  Phaser.Plugin.CocoonJSOuyaGamepad.prototype.start = function() {

    window.addEventListener('gamepadconnected', onGamepadConnect, false);
    window.addEventListener('gamepaddisconnected', onGamepadDisconnect, false);

    _pollGamepads();

  };

  Phaser.Plugin.CocoonJSOuyaGamepad.prototype.settings = function(options) {
    if (options) {
      for (var p in options) {
        if (settings[p]) {
          settings[p] = options[p];
        }
      }
    } else {
      return Object.create(settings);
    }
  };

  /* Settings object */
  var settings = {
    POLLINGRATE: 140 /* ms */
  };

  var _game = null;
  var _parent = null;

  var _active = true;

  /**
   * @property {Array} _rawPads - The raw state of the gamepads from the browser
   * @private
   */
  var _rawPads = [];

  /**
   * Used to check for differences between earlier polls and current state of gamepads.
   * @property {Array} _prevRawGamepadTypes
   * @private
   * @default
   */
  var _prevRawGamepadTypes = [];

  /**
   * Used to calculate when to poll gamepads next.
   * @property {Double} _time
   * @private
   * @default
   */
  var _time = 0;

  /**
   * @property {Array<Phaser.SinglePad>} _gamepads - The eleven Phaser Gamepads.
   * @private
   */
  var _gamepads = [
    new Phaser.SinglePad(_game, this),
    new Phaser.SinglePad(_game, this),
    new Phaser.SinglePad(_game, this),
    new Phaser.SinglePad(_game, this),
    new Phaser.SinglePad(_game, this),
    new Phaser.SinglePad(_game, this),
    new Phaser.SinglePad(_game, this),
    new Phaser.SinglePad(_game, this),
    new Phaser.SinglePad(_game, this),
    new Phaser.SinglePad(_game, this),
    new Phaser.SinglePad(_game, this)
  ];

  function _pollGamepads() {

    var rawGamepads = (navigator.getGamepads && navigator.getGamepads());

    if (rawGamepads)
    {
      _rawPads = [];

      var gamepadsChanged = false;

      for (var i = 0; i < rawGamepads.length; i++)
      {
        if (typeof rawGamepads[i] !== _prevRawGamepadTypes[i])
        {
          gamepadsChanged = true;
          _prevRawGamepadTypes[i] = typeof rawGamepads[i];
        }

        if (rawGamepads[i])
        {
          _rawPads.push(rawGamepads[i]);
        }

        // Support max 4 pads at the moment
        if (i === 11)
        {
          break;
        }
      }

      if (gamepadsChanged)
      {
        var validConnections = {rawIndices: {}, padIndices: {}};
        var singlePad;

        for (var j = 0; j < _gamepads.length; j++)
        {
          singlePad = _gamepads[j];

          if (singlePad.connected)
          {
            for (var k = 0; k < _rawPads.length; k++)
            {
              if (_rawPads[k].index === singlePad.index)
              {
                validConnections.rawIndices[singlePad.index] = true;
                validConnections.padIndices[j] = true;
              }
            }
          }
        }

        for (var l = 0; l < _gamepads.length; l++)
        {
          singlePad = _gamepads[l];

          if (validConnections.padIndices[l])
          {
            continue;
          }

          if (_rawPads.length < 1)
          {
            singlePad.disconnect();
          }

          for (var m = 0; m < _rawPads.length; m++)
          {
            if (validConnections.padIndices[l])
            {
              break;
            }

            var rawPad = _rawPads[m];

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
  }

  Phaser.Plugin.CocoonJSOuyaGamepad.prototype.update = function() {
    if (settings.POLLINGRATE < this.game.time.now - _time && _active) {

      _pollGamepads();

      for (var i = 0; i < _gamepads.length; i++)
      {
        if (_gamepads[i]._connected)
        {
          _gamepads[i].pollStatus();
        }
      }
    }
  };

  /**
   * Returns the "just pressed" state of a button from ANY gamepad connected. Just pressed is considered true if the button was pressed down within the duration given (default 250ms).
   * @method Phaser.Plugin.CocoonJSOuyaGamepad#justPressed
   * @param {number} buttonCode - The buttonCode of the button to check for.
   * @param {number} [duration=250] - The duration below which the button is considered as being just pressed.
   * @return {boolean} True if the button is just pressed otherwise false.
   */
  Phaser.Plugin.CocoonJSOuyaGamepad.prototype.justPressed = function(buttonCode, duration) {

    for (var i = 0; i < _gamepads.length; i++)
    {
      if (_gamepads[i].justPressed(buttonCode, duration) === true)
      {
        return true;
      }
    }

    return false;

  };

  /**
   * Returns the "just released" state of a button from ANY gamepad connected. Just released is considered as being true if the button was released within the duration given (default 250ms).
   * @method Phaser.Plugin.CocoonJSOuyaGamepad#justPressed
   * @param {number} buttonCode - The buttonCode of the button to check for.
   * @param {number} [duration=250] - The duration below which the button is considered as being just released.
   * @return {boolean} True if the button is just released otherwise false.
   */
  Phaser.Plugin.CocoonJSOuyaGamepad.prototype.justReleased = function(buttonCode, duration) {

    for (var i = 0; i < _gamepads.length; i++)
    {
      if (_gamepads[i].justReleased(buttonCode, duration) === true)
      {
        return true;
      }
    }

    return false;

  };

  /**
   * Returns true if the button is currently pressed down, on ANY gamepad.
   * @method Phaser.Plugin.CocoonJSOuyaGamepad#isDown
   * @param {number} buttonCode - The buttonCode of the button to check for.
   * @return {boolean} True if a button is currently down.
   */
  Phaser.Plugin.CocoonJSOuyaGamepad.prototype.isDown = function(buttonCode) {

    for (var i = 0; i < this._gamepads.length; i++)
    {
      if (this._gamepads[i].isDown(buttonCode) === true)
      {
        return true;
      }
    }

    return false;
  };

  Phaser.Plugin.CocoonJSOuyaGamepad.prototype.stop = function() {
    _active = false;
    window.removeEventListener('gamepadconnected', onGamepadConnect);
    window.removeEventListener('gamepaddisconnected', onGamepadDisconnect);
  };

  /**
   * Gamepad #1
   * @name Phaser.Plugin.CocoonJSOuyaGamepad#pad1
   * @property {boolean} pad1 - Gamepad #1;
   * @readonly
   */
  Object.defineProperty(Phaser.Plugin.CocoonJSOuyaGamepad.prototype, "pad1", {
    get: function() {
      return _gamepads[0];
    }

  });

  /**
   * Gamepad #2
   * @name Phaser.Plugin.CocoonJSOuyaGamepad#pad2
   * @property {boolean} pad2 - Gamepad #2
   * @readonly
   */
  Object.defineProperty(Phaser.Plugin.CocoonJSOuyaGamepad.prototype, "pad2", {
    get: function() {
      return _gamepads[1];
    }

  });

  /**
   * Gamepad #3
   * @name Phaser.Plugin.CocoonJSOuyaGamepad#pad3
   * @property {boolean} pad3 - Gamepad #3
   * @readonly
   */
  Object.defineProperty(Phaser.Plugin.CocoonJSOuyaGamepad.prototype, "pad3", {
    get: function() {
      return _gamepads[2];
    }

  });

  /**
   * Gamepad #4
   * @name Phaser.Plugin.CocoonJSOuyaGamepad#pad4
   * @property {boolean} pad4 - Gamepad #4
   * @readonly
   */
  Object.defineProperty(Phaser.Plugin.CocoonJSOuyaGamepad.prototype, "pad4", {
    get: function() {
      return _gamepads[3];
    }
  });

  /**
   * Gamepad #5
   * @name Phaser.Plugin.CocoonJSOuyaGamepad#pad5
   * @property {boolean} pad5 - Gamepad #5
   * @readonly
   */
  Object.defineProperty(Phaser.Plugin.CocoonJSOuyaGamepad.prototype, "pad5", {
    get: function() {
      return _gamepads[4];
    }
  });

  /**
   * Gamepad #6
   * @name Phaser.Plugin.CocoonJSOuyaGamepad#pad6
   * @property {boolean} pad6 - Gamepad #6
   * @readonly
   */
  Object.defineProperty(Phaser.Plugin.CocoonJSOuyaGamepad.prototype, "pad6", {
    get: function() {
      return _gamepads[5];
    }
  });

  /**
   * Gamepad #7
   * @name Phaser.Plugin.CocoonJSOuyaGamepad#pad7
   * @property {boolean} pad7 - Gamepad #7
   * @readonly
   */
  Object.defineProperty(Phaser.Plugin.CocoonJSOuyaGamepad.prototype, "pad7", {
    get: function() {
      return _gamepads[6];
    }
  });

  /**
   * Gamepad #8
   * @name Phaser.Plugin.CocoonJSOuyaGamepad#pad8
   * @property {boolean} pad8 - Gamepad #8
   * @readonly
   */
  Object.defineProperty(Phaser.Plugin.CocoonJSOuyaGamepad.prototype, "pad8", {
    get: function() {
      return _gamepads[7];
    }
  });

  /**
   * Gamepad #9
   * @name Phaser.Plugin.CocoonJSOuyaGamepad#pad9
   * @property {boolean} pad9 - Gamepad #9
   * @readonly
   */
  Object.defineProperty(Phaser.Plugin.CocoonJSOuyaGamepad.prototype, "pad9", {
    get: function() {
      return _gamepads[8];
    }
  });

  /**
   * Gamepad #10
   * @name Phaser.Plugin.CocoonJSOuyaGamepad#pad10
   * @property {boolean} pad10 - Gamepad #10
   * @readonly
   */
  Object.defineProperty(Phaser.Plugin.CocoonJSOuyaGamepad.prototype, "pad10", {
    get: function() {
      return _gamepads[9];
    }
  });

  /**
   * Gamepad #11
   * @name Phaser.Plugin.CocoonJSOuyaGamepad#pad11
   * @property {boolean} pad11 - Gamepad #11
   * @readonly
   */
  Object.defineProperty(Phaser.Plugin.CocoonJSOuyaGamepad.prototype, "pad11", {
    get: function() {
      return _gamepads[10];
    }
  });

}(window, Phaser));
