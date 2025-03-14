import { ScreamChicken } from './scenes/Game';
import { AUTO, Game, Types } from 'phaser';

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {
                y: 300,
                x: 0
            },
            debug: false
        }
    },
    scene: ScreamChicken
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
}

export default StartGame;

