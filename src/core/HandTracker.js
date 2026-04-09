import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

class HandTracker {
    constructor() {
        this.handLandmarker = null;
        this.video = document.createElement("video");
        this.video.autoplay = true;
        this.video.playsInline = true;
        this.video.setAttribute("playsinline", "");
        this.video.style.display = "none";
        document.body.appendChild(this.video);

        this.isTracking = false;
        this.lastVideoTime = -1;
        this.currentLandmarks = null;

        this.predictLoop = this.predictLoop.bind(this);
        this.statusCallback = null;
    }

    onStatusChange(callback) {
        this.statusCallback = callback;
    }

    notifyStatus(msg) {
        if (this.statusCallback) this.statusCallback(msg);
    }

    async initialize() {
        if (this.handLandmarker) return;

        try {
            this.notifyStatus("Loading Neural Net...");
            const baseUrl = import.meta.env.BASE_URL || '/';
            const vision = await FilesetResolver.forVisionTasks(`${baseUrl}wasm`);
            this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `${baseUrl}models/hand_landmarker.task`,
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                numHands: 1
            });

            await this.startCamera();
        } catch (err) {
            console.error("Initiation Error: ", err);
            this.notifyStatus("Camera/Model Error. Please allow permissions.");
            throw err;
        }
    }

    async startCamera() {
        if (this.video.srcObject) return;

        try {
            this.notifyStatus("Requesting Camera Permission...");
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: "user"
                } 
            });
            this.video.srcObject = stream;

            return new Promise((resolve) => {
                this.video.onloadeddata = () => {
                    this.notifyStatus("System Ready");
                    resolve();
                };
            });
        } catch (err) {
            console.error(err);
            this.notifyStatus("Camera Error.");
            throw err;
        }
    }

    stopCamera() {
        if (this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
            this.notifyStatus("Camera Stopped");
        }
    }

    startTracking() {
        if (!this.handLandmarker || !this.video.srcObject) {
            console.warn("HandTracker not initialized!");
            return;
        }
        if (this.isTracking) return;

        this.isTracking = true;
        this.predictLoop();
    }

    stopTracking() {
        this.isTracking = false;
        this.currentLandmarks = null;
    }

    predictLoop() {
        if (!this.isTracking) return;

        if (this.video.readyState >= 2 && this.video.currentTime !== this.lastVideoTime) {
            this.lastVideoTime = this.video.currentTime;

            const results = this.handLandmarker.detectForVideo(this.video, performance.now());
            if (results.landmarks && results.landmarks.length > 0) {
                this.currentLandmarks = results.landmarks[0];
            } else {
                this.currentLandmarks = null;
            }
        }
        requestAnimationFrame(this.predictLoop);
    }

    getLandmarks() {
        return this.currentLandmarks;
    }

    getVideo() {
        return this.video;
    }
}

export const handTracker = new HandTracker();
