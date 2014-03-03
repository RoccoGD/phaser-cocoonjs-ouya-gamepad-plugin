Phaser CocoonJS-Ouya Gamepad Plugin
===================================

**Phaser CocoonJS-Ouya Gamepad Plugin**

- Adds Phaser.OuyaGamepad and Phaser.OuyaSinglePad objects that mirror Phaser.Gamepad and Phaser.SinglePad, but with changes to match CocoonJS' needs. 

- Adds a radial deadzone algorithm for detection of values normalized within axis deadzones.

- Extends number of possible gamepads from 4 (Phaser default) to the full 11 the Ouya is capable of supporting at once.


**Known Problems**
 - Duration tracking of input values does not match plugin's internal time and is, instead, still set by 'this.game.time.now'.
