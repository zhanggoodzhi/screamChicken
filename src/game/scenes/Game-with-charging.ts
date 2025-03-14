import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class ScreamChicken extends Scene {

    private isCharging: boolean = false;
    private chargeTime: number = 0;
    private player: Phaser.Physics.Arcade.Sprite;
    private platforms: Phaser.Physics.Arcade.StaticGroup;
    private maxChargeTime: number = 1000; // 1 second max charge

    private powerBarFill: Phaser.GameObjects.Image;
    private canJump: boolean = false;
    private flag: Phaser.GameObjects.Image;


    //audio
    // Audio properties
    private isListening: boolean;
    private volumeThreshold: number = 0.1;
    private audioContext: AudioContext | null;
    private analyser: AnalyserNode;
    private microphone: MediaStreamAudioSourceNode | null;
    private dataArray: Uint8Array;

    constructor() {
        super('ScreamChicken');
        this.isCharging = false;
        this.chargeTime = 0;
        this.maxChargeTime = 1000; // 1 second max charge
        this.canJump = false;
    }

    preload() {
        this.load.setPath('assets');

        this.load.image('star', 'star.png');
        this.load.image('background', 'background.png');
        this.load.image('logo', 'logo.png');
        this.load.image('flag', 'flag.png');
        this.load.image('platform', 'platform.png');
        this.load.image('powerbar_fill', 'powerbar_fill.png');
        this.load.image('chicken', 'chicken.png');




    }

    create() {

        this.setupVoiceControl();

        // Background
        const background = this.add.image(0, 0, 'background');
        background.setOrigin(0, 0);
        background.setDisplaySize(800, 600);

        // Create platforms
        this.platforms = this.physics.add.staticGroup();

        // Starting platform
        this.platforms.create(100, 500, 'platform').setScale(1, 1).refreshBody();
        // Middle platforms
        this.platforms.create(350, 500, 'platform').setScale(1.75, 1).refreshBody();
        // this.platforms.create(500, 300, 'platform').setScale(1.75, 1).refreshBody();
        // Final platform with flag
        this.platforms.create(700, 500, 'platform').setScale(2, 1).refreshBody();

        // Create flag
        this.flag = this.add.image(700, 420, 'flag');
        this.flag.setScale(0.08); // Scale down the flag to appropriate size

        // Create player (chicken)
        this.player = this.physics.add.sprite(100, 400, 'chicken');
        this.player.setScale(0.4); // Scale down the chicken to appropriate size
        this.player.setCollideWorldBounds(true);
        //this.player.setBounce(0.1);
        this.player.setGravityY(600);

        // Power bar setup 
        this.powerBarFill = this.add.image(400, 50, 'powerbar_fill');
        this.powerBarFill.setScale(0, 0.2); // Start with 0 width
        this.powerBarFill.setOrigin(0.5, 0.9);

        // Add collider between player and platforms
        this.physics.add.collider(this.player, this.platforms, () => {
            this.canJump = true;
            this.player.setRotation(0); // Reset rotation when landing
            this.player.setVelocityX(0); // Reset horizontal velocity when landing
        });

        // Mouse input
        this.input.on('pointerdown', () => {
            if (this.canJump) {
                this.isCharging = true;
                this.chargeTime = 0;
            }
        });

        this.input.on('pointerup', () => {
            if (this.isCharging) {
                this.jump();
                this.isCharging = false;
                this.canJump = false;
            }
        });

        EventBus.emit('current-scene-ready', this);

    }
    jump() {
        const chargeRatio = Math.min(this.chargeTime / this.maxChargeTime, 1);
        const jumpForceX = 200 * chargeRatio;
        const jumpForceY = -500 * chargeRatio;

        this.player.setVelocity(jumpForceX, jumpForceY);

        // Add rotation when jumping
        // this.tweens.add({
        //     targets: this.player,
        //     rotation: Math.PI * 2,
        //     duration: 1000,
        //     ease: 'Linear'
        // });
    }

    update(time: number, delta: number) {
        // Update charge time and power bar
        if (this.isCharging) {
            this.chargeTime = Math.min(this.chargeTime + delta, this.maxChargeTime);
            const chargeRatio = this.chargeTime / this.maxChargeTime;
            this.powerBarFill.setScale(0.2 * chargeRatio, 0.1);
        } else {
            this.powerBarFill.setScale(0, 0.1);
        }

        // Check for win condition
        if (Phaser.Geom.Rectangle.Overlaps(
            this.player.getBounds(),
            this.flag.getBounds()
        )) {
            this.add.text(400, 300, 'Level Complete!', {
                fontSize: '32px',
                color: '#f0f'
            }).setOrigin(0.5);
            this.scene.pause();
        }

        // Game over if player falls too low
        if (this.player.y > 500) {
            this.scene.restart();
        }
    }

    setupVoiceControl() {
        // Request microphone access
        navigator.mediaDevices.getUserMedia({
            audio: true
        })
            .then(stream => {

                console.log(`audio streaming...`);

                // Set up audio analysis
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.analyser = this.audioContext.createAnalyser();
                this.microphone = this.audioContext.createMediaStreamSource(stream);
                this.microphone.connect(this.analyser);

                this.analyser.fftSize = 256;
                const bufferLength = this.analyser.frequencyBinCount;
                this.dataArray = new Uint8Array(bufferLength);
                // Start monitoring voice input
                this.isListening = true;
                this.checkVoiceLevel();
            })
            .catch(err => {
                console.error('Microphone access denied:', err);
            });
    }
    checkVoiceLevel() {
        if (!this.isListening) return;

        console.log(`checkVoiceLevel...`);

        // Get current volume level
        this.analyser.getByteFrequencyData(this.dataArray);
        const average = this.dataArray.reduce((a, b) => a + b) / this.dataArray.length;
        const normalizedVolume = average / 255; // Normalize to 0-1 range

        console.log(`checkVoiceLevel...: normalizedVolume=`, normalizedVolume);

        // Check if volume exceeds threshold
        if (normalizedVolume > this.volumeThreshold && this.canJump) {
            if (!this.isCharging) {
                this.isCharging = true;
                this.chargeTime = 0;
            }
        } else if (this.isCharging && normalizedVolume <= this.volumeThreshold) {
            // Voice level dropped, trigger jump
            this.jump();
            console.log(`checkVoiceLevel...: jump`);

            this.isCharging = false;
            this.canJump = false;
        }
        // Continue monitoring
        requestAnimationFrame(() => this.checkVoiceLevel());
    }

}
