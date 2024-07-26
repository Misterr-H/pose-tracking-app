import React, { useRef, useEffect } from "react";
import "@tensorflow/tfjs-backend-webgl";
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

function PoseTracker() {
  let poseLandmarker = undefined;
  const videoHeight = "360px";
  const videoWidth = "480px";

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;

  const drawingUtils = new DrawingUtils(canvasRef.current);

  let lastVideoTime = -1;
  

  useEffect(() => {
    const canvasCtx = canvasRef.current.getContext("2d");
    async function predictWebCam() {
      console.log("Predicting webcam");
      if(!hasGetUserMedia()) {
        alert("getUserMedia() is not supported by your browser");
        return;
      }
      if (!canvasRef.current && !webcamRef.current && !canvasCtx) {
        console.error("Canvas or webcam ref is not ready");
        return;
      }
      if(!poseLandmarker) {
        console.error("PoseLandmarker is not ready");
        return;
      }
      
      canvasRef.current.style.height = videoHeight;
      webcamRef.current.style.height = videoHeight;
      canvasRef.current.style.width = videoWidth;
      webcamRef.current.style.width = videoWidth;
      let startTimeMs = performance.now();
      console.log("Webcam time", webcamRef.current.currentTime);
      if (lastVideoTime !== webcamRef.current.currentTime) {
        lastVideoTime = webcamRef.current.currentTime;
        poseLandmarker.detectForVideo(webcamRef.current, startTimeMs, (result) => {
          console.log("Result", result);
          canvasCtx.save();
          canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          for (const landmark of result.landmarks) {
            drawingUtils.drawLandmarks(landmark, {
              radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1)
            });
            drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
          }
          canvasCtx.restore();
        });
      }
      window.requestAnimationFrame(predictWebCam);
    }

    const createPoseLandmarker = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });
    };

    createPoseLandmarker();

    navigator.mediaDevices
      .getUserMedia({
        video: true,
      })
      .then((stream) => {
        webcamRef.current.srcObject = stream;
        webcamRef.current.addEventListener("loadeddata", predictWebCam);
      });
  }, []);

  return (
    <div>
      <video
        autoPlay
        playsInline
        muted
        ref={webcamRef}
        width="640"
        height="480"
      />
      <canvas 
        ref={canvasRef}
       id="output" width="640" height="480" />
    </div>
  );
}

export default PoseTracker;
