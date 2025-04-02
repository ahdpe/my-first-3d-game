document.addEventListener("DOMContentLoaded", function () {

    const canvas = document.getElementById("renderCanvas");
    if (!canvas) { console.error("Canvas element #renderCanvas not found!"); return; }

    const engine = new BABYLON.Engine(canvas, true, { stencil: true, antialias: true });
    if (!engine) { console.error("Babylon engine could not be created!"); return; }

    const scene = new BABYLON.Scene(engine);

    // --- Окружение ---
    if (typeof createEnvironment !== 'function') { console.error("createEnvironment function is not defined!"); return; }
    const environmentData = createEnvironment(scene);

    // --- Игрок ---
    if (typeof createPlayer !== 'function') { console.error("createPlayer function is not defined!"); return; }
    const playerData = createPlayer(scene);
    const playerRoot = playerData.root;
    const cameraTarget = playerData.cameraTarget;

    // --- Камера ---
    const defaultCameraBeta = Math.PI / 3.5;
    const cameraReturnLerpSpeed = 0.08;

    const camera = new BABYLON.ArcRotateCamera(
        "arcCam",
        Math.PI, // alpha — изначально за спиной
        defaultCameraBeta,
        12,
        cameraTarget,
        scene
    );

    // ❌ Убираем контроль мышью
    camera.inputs.clear();

    camera.lowerBetaLimit = Math.PI / 8;
    camera.upperBetaLimit = Math.PI / 2;
    camera.lowerRadiusLimit = 4;
    camera.upperRadiusLimit = 25;

    // --- Цикл рендеринга ---
    engine.runRenderLoop(function () {
        if (!scene || !playerRoot) return;

        // 📌 Камера следует за спиной персонажа
        const targetCameraAlpha = playerRoot.rotation.y + Math.PI;
        const targetCameraBeta = defaultCameraBeta;

        camera.alpha = BABYLON.Scalar.LerpAngle(camera.alpha, targetCameraAlpha, cameraReturnLerpSpeed);
        camera.beta = BABYLON.Scalar.Lerp(camera.beta, targetCameraBeta, cameraReturnLerpSpeed);

        scene.render();
    });

    window.addEventListener("resize", function () { engine.resize(); });
    console.log("Babylon.js scene initialized successfully.");
});
