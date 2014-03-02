Phaser CocoonJS-Ouya Gamepad Plugin
===================================

**Phaser CocoonJS-Ouya Gamepad Plugin**

- Emulates parts of the Phaser.Gamepad interface with overrides for a number of Phaser.SinglePad functions designed specifically for known gamepad value issues while running under CocoonJS on the Ouya.

- Adds a radial deadzone algorithm for detection of values normalized within the deadzone.

- Extends number of possible gamepads from 4 (Phaser default) to the full 11 the Ouya is capable of supporting at once.


**Known Problems**
 - Callback functions return 'undefined' for their 'this._index' values
 - 'this.game' is 'undefined' within overrided Phaser.SinglePad function 
