import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class ScreamChicken extends Scene {

    // private isCharging: boolean = false;
    // private chargeTime: number = 0;
    // private maxChargeTime: number = 1000; // 1 second max charge

    private player: Phaser.Physics.Arcade.Sprite;
    private platforms: Phaser.Physics.Arcade.StaticGroup;

    private powerBarFill: Phaser.GameObjects.Image;
    private canJump: boolean = false;
    private flag: Phaser.GameObjects.Image;


    //audio
    // Audio properties
    private isListening: boolean;
    private volumeThreshold: number = 0.3;
    private audioContext: AudioContext | null;
    private analyser: AnalyserNode;
    private microphone: MediaStreamAudioSourceNode | null;
    private dataArray: Uint8Array;
    private worldWidth: number = window.innerWidth;
    private background: Phaser.GameObjects.Image
    private resumeButton: Phaser.GameObjects.Rectangle

    // 上一个平台的最右边坐标
    private lastX: number = 0;

    constructor() {
        super('ScreamChicken');
        // this.isCharging = false;
        // this.chargeTime = 0;
        // this.maxChargeTime = 1000; // 1 second max charge
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
    generatePlatforms(isFirst?: boolean) {
        // 平台参数
        const minPlatformWidth = 100; // 平台最小宽度
        const maxPlatformWidth = 400
        // const minGap = 0; // 平台之间的最小间距
        // const maxGap = 0; // 平台之间的最大间距

        const minGap = 60; // 平台之间的最小间距
        const maxGap = 200; // 平台之间的最大间距
        const imgWidth = 125

        for (let i = 0; i < 10; i++) { // 生成 10 个平台
            let platformWidth;
            let x;
            //第一个坐标没有gap, 并具有最大宽度, 防止玩家一开始就掉下去
            if (i === 0 && isFirst) {
                platformWidth = maxPlatformWidth;
                x = this.lastX + 0 + platformWidth / 2;
            } else {
                // 随机生成平台的宽度
                platformWidth = Phaser.Math.Between(minPlatformWidth, maxPlatformWidth);
                // platformWidth = 180;
                // 随机生成平台的 X 坐标
                x = this.lastX + Phaser.Math.Between(minGap, maxGap) + platformWidth / 2;
                // x = this.lastX + minGap + platformWidth / 2;
            }
            // 创建平台
            this.platforms.create(x, 500, 'platform').setScale(platformWidth / imgWidth, 1).refreshBody();
            // 更新上一个平台的最右边坐标
            this.lastX = x + platformWidth / 2;
        }
    }


    handlePlatforms() {
        if (this.player.x > this.lastX - window.innerWidth) {
            console.log('生成新平台');
            this.generatePlatforms();

            // 移除没用的平台
            this.platforms.getChildren().forEach(platform => {
                if (platform.x + platform.width * platform.scaleX / 2 < this.cameras.main.scrollX) {
                    this.platforms.remove(platform, true, true);
                }
            });
        }


    }

    create() {
        this.setupVoiceControl();

        // Background
        this.background = this.add.image(0, 0, 'background');
        this.background.setOrigin(0, 0).setScrollFactor(0);

        this.physics.world.setBounds(0, 0, Number.MAX_SAFE_INTEGER, window.innerHeight);
        this.background.setDisplaySize(this.worldWidth, window.innerHeight);

        // Create platforms
        this.platforms = this.physics.add.staticGroup();

        this.generatePlatforms(true);
        // // Starting platform
        // this.platforms.create(100, 500, 'platform').setScale(100 / 125, 1).refreshBody();
        // // Middle platforms
        // this.platforms.create(500, 500, 'platform').setScale(1, 1).refreshBody();
        // // this.platforms.create(500, 300, 'platform').setScale(1.75, 1).refreshBody();
        // // Final platform with flag
        // this.platforms.create(700, 500, 'platform').setScale(2, 1).refreshBody();

        // Create flag
        // this.flag = this.add.image(700, 420, 'flag');
        // this.flag.setScale(0.08); // Scale down the flag to appropriate size

        // Create player (chicken)
        this.player = this.physics.add.sprite(100, 400, 'chicken');
        this.player.setScale(0.4); // Scale down the chicken to appropriate size

        this.player.setCollideWorldBounds(true);
        //this.player.setBounce(0.1);
        this.player.setGravityY(1000);

        // Power bar setup 
        // this.powerBarFill = this.add.image(400, 50, 'powerbar_fill');
        // this.powerBarFill.setScale(0, 0.2); // Start with 0 width
        // this.powerBarFill.setOrigin(0.5, 0.9);

        // Add collider between player and platforms
        this.physics.add.collider(this.player, this.platforms, () => {
            this.canJump = true;
            this.player.setRotation(0); // Reset rotation when landing
            this.player.setVelocityX(0); // Reset horizontal velocity when landing
        });

        // 设置摄像机跟随玩家
        this.cameras.main.setBounds(0, 0, Number.MAX_SAFE_INTEGER, window.innerHeight); // 设置摄像机边界
        this.cameras.main.startFollow(this.player);

        // Mouse input
        this.input.on('pointerdown', (pointer: any) => {
            if (this.game.isPaused && this.resumeButton.getBounds().contains(pointer.x, pointer.y)) {
                this.game.resume();
                // 重置平台坐标
                this.lastX = 0;
                this.scene.restart();
            }
            // if (this.canJump) {
            //     this.isCharging = true;
            //     this.chargeTime = 0;
            // }
        });

        this.input.on('pointerup', () => {
            // if (this.isCharging) {
            //     this.jump();
            //     this.isCharging = false;
            //     this.canJump = false;
            // }
        });

        EventBus.emit('current-scene-ready', this);

    }


    jump(chargeRatio: number) {
        // const chargeRatio = Math.min(this.chargeTime / this.maxChargeTime, 1);

        const jumpForceX = 300 * chargeRatio * 2;
        const jumpForceY = -600 * chargeRatio * 2;
        console.log(`jumpForceX:${jumpForceX},jumpForceY:${jumpForceY}`);

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
        // if (this.isCharging) {
        //     this.chargeTime = Math.min(this.chargeTime + delta, this.maxChargeTime);
        //     const chargeRatio = this.chargeTime / this.maxChargeTime;
        //     this.powerBarFill.setScale(0.2 * chargeRatio, 0.1);
        // } else {
        //     this.powerBarFill.setScale(0, 0.1);
        // }

        // Check for win condition
        // if (Phaser.Geom.Rectangle.Overlaps(
        //     this.player.getBounds(),
        //     this.flag.getBounds()
        // )) {
        //     this.add.text(400, 300, 'Level Complete!', {
        //         fontSize: '32px',
        //         color: '#f0f'
        //     }).setOrigin(0.5);
        //     this.scene.pause();
        // }
        this.handlePlatforms();

        // Game over if player falls too low
        if (this.player.y > 500) {
            // this.scene.restart();
            this.add.text(400, 300, `Score: ${Math.floor(this.player.x)}`, {
                fontSize: '32px',
                color: '#f0f'
            }).setOrigin(0.5, 0.5).setScrollFactor(0);

            // 渲染一个按钮
            this.resumeButton = this.add.rectangle(
                900, // x 坐标
                300, // y 坐标
                200, // 宽度
                50, // 高度
                0x00ff00 // 颜色（绿色）
            ).setOrigin(0.5, 0.5).setScrollFactor(0); // 设置按钮的中心点为原点

            // 添加按钮文字
            this.add.text(
                900, // x 坐标
                300, // y 坐标
                'Restart', // 文字内容
                {
                    fontSize: '24px', // 字体大小
                    color: '#000000', // 字体颜色
                }
            ).setOrigin(0.5, 0.5).setScrollFactor(0); // 设置文字的中心点为原点

            // 为按钮添加交互功能
            this.resumeButton.setInteractive(); // 启用交互
            this.input.topOnly = false
            this.game.pause()
        }
    }

    setupVoiceControl() {
        // Request microphone access
        navigator.mediaDevices.getUserMedia({
            audio: true
        })
            .then(stream => {

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

        // console.log(`checkVoiceLevel...`);

        // Get current volume level
        this.analyser.getByteFrequencyData(this.dataArray);
        // const average = this.dataArray.reduce((a, b) => a + b) / this.dataArray.length;
        // const normalizedVolume = average / 255; // Normalize to 0-1 range

        const max = Math.max(...this.dataArray)
        const normalizedVolume = max / 255; // Normalize to 0-1 range



        // Check if volume exceeds threshold
        // if (normalizedVolume > this.volumeThreshold && this.canJump) {
        //     if (!this.isCharging) {
        //         this.isCharging = true;
        //         this.chargeTime = 0;
        //     }
        // } else if (this.isCharging && normalizedVolume <= this.volumeThreshold) {
        //     // Voice level dropped, trigger jump
        //     this.jump();
        //     console.log(`checkVoiceLevel...: jump`);

        //     this.isCharging = false;
        //     this.canJump = false;
        // }


        if (normalizedVolume > this.volumeThreshold && this.canJump) {
            const chargeRatio = normalizedVolume;
            this.jump(chargeRatio);
            console.log(`checkVoiceLevel...: jump chargeRatio:`, chargeRatio);
            this.canJump = false;
        } else if (normalizedVolume <= this.volumeThreshold) {
            // console.log(`checkVoiceLevel...: peaceful`); 
        }


        // Continue monitoring
        requestAnimationFrame(() => this.checkVoiceLevel());
    }

}
