// main.js: Основной файл, инициализирует и связывает все части

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
    const defaultCameraBeta = Math.PI / 3.5; // Угол наклона камеры по умолчанию
    const cameraReturnLerpSpeed = 0.08;   // Скорость возврата камеры
    const cameraReturnDelay = 1000;       // Задержка возврата в миллисекундах (1 секунда)

    var camera = new BABYLON.ArcRotateCamera(
        "arcCam",
        Math.PI,                 // <<-- теперь камера изначально за спиной
        defaultCameraBeta,
        12,
        cameraTarget,
        scene
    );

    camera.attachControl(canvas, true);
    camera.inputs.attached.pointers.buttons = [0];

    camera.lowerBetaLimit = Math.PI / 8;
    camera.upperBetaLimit = (Math.PI / 2);
    camera.lowerRadiusLimit = 4;
    camera.upperRadiusLimit = 25;
    camera.wheelPrecision = 50;
    camera.pinchPrecision = 100;

    // --- Логика возврата камеры ---
    let isUserInteractingWithCamera = false;
    let returnTimeoutId = null;

    function startReturnTimeout() {
        clearTimeout(returnTimeoutId);
        returnTimeoutId = setTimeout(() => {
            isUserInteractingWithCamera = false;
        }, cameraReturnDelay);
    }

    camera.onPointerDown = function () {
        isUserInteractingWithCamera = true;
        clearTimeout(returnTimeoutId);
    };

    camera.onPointerUp = function () {
        startReturnTimeout();
    };

    canvas.addEventListener('pointerleave', function () {
        if (camera.inertialAlphaOffset === 0 && camera.inertialBetaOffset === 0) {
            startReturnTimeout();
        }
    });

    // --- Цикл рендеринга ---
    engine.runRenderLoop(function () {
        if (!scene || !playerRoot) return;

        if (!isUserInteractingWithCamera) {
            const targetCameraAlpha = playerRoot.rotation.y - Math.PI;
            const targetCameraBeta = defaultCameraBeta;

            camera.alpha = BABYLON.Scalar.LerpAngle(camera.alpha, targetCameraAlpha, cameraReturnLerpSpeed);
            camera.beta = BABYLON.Scalar.Lerp(camera.beta, targetCameraBeta, cameraReturnLerpSpeed);
        }

        scene.render();
    });

    window.addEventListener("resize", function () { engine.resize(); });
    console.log("Babylon.js scene initialized successfully.");
});
