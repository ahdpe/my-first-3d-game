// main.js: Основной файл, инициализирует и связывает все части

document.addEventListener("DOMContentLoaded", function() {

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
        -Math.PI / 2,             // *** ИЗМЕНЕНО: Начальный alpha, чтобы смотреть с +Z на -Z ***
        defaultCameraBeta,        // Начальный beta
        12,                       // Начальный радиус
        cameraTarget,
        scene
    );

    // Включаем стандартное управление мышью/тачем
    camera.attachControl(canvas, true);
    // Оставим только левую кнопку мыши для вращения
    camera.inputs.attached.pointers.buttons = [0];

    // Настройки пределов
    camera.lowerBetaLimit = Math.PI / 8;
    camera.upperBetaLimit = (Math.PI / 2);
    camera.lowerRadiusLimit = 4;
    camera.upperRadiusLimit = 25;
    camera.wheelPrecision = 50;
    camera.pinchPrecision = 100;

    // --- Логика возврата камеры ---
    let isUserInteractingWithCamera = false;
    let returnTimeoutId = null; // ID таймера для его отмены

    // Функция для старта таймера возврата
    function startReturnTimeout() {
        clearTimeout(returnTimeoutId); // Отменяем предыдущий таймер, если он был
        returnTimeoutId = setTimeout(() => {
            isUserInteractingWithCamera = false; // Разрешаем камере возвращаться
        }, cameraReturnDelay); // Задержка перед началом возврата
    }

    // Обнаруживаем начало взаимодействия пользователя с камерой
    camera.onPointerDown = function() {
        isUserInteractingWithCamera = true; // Пользователь управляет
        clearTimeout(returnTimeoutId);      // Отменяем таймер возврата
        // console.log("Camera interaction START");
    };

    // Обнаруживаем окончание взаимодействия (отпускание кнопки/пальца)
    camera.onPointerUp = function() {
        // console.log("Camera interaction END - starting return timeout");
        startReturnTimeout(); // Запускаем таймер для возврата к бездействию
    };

    // Если мышь ушла с канваса - тоже запускаем таймер (возможно, с меньшей задержкой)
    canvas.addEventListener('pointerleave', function() {
        // Если кнопка была нажата и мышь ушла, пользователь все еще может "управлять",
        // но безопаснее начать таймер возврата.
        if (camera.inertialAlphaOffset === 0 && camera.inertialBetaOffset === 0) { // Проверяем, нет ли инерции
             // console.log("Pointer Left Canvas - starting return timeout");
             startReturnTimeout();
        }
    });


    // --- Цикл рендеринга ---
    engine.runRenderLoop(function () {
        if (!scene || !playerRoot) return;

        // Если пользователь не управляет камерой, плавно возвращаем ее за спину
        if (!isUserInteractingWithCamera) {
            // Целевой угол за спиной игрока
            const targetCameraAlpha = playerRoot.rotation.y - Math.PI;
            // Целевой вертикальный угол
            const targetCameraBeta = defaultCameraBeta;

            // Плавно интерполируем углы
            camera.alpha = BABYLON.Scalar.LerpAngle(camera.alpha, targetCameraAlpha, cameraReturnLerpSpeed);
            camera.beta = BABYLON.Scalar.Lerp(camera.beta, targetCameraBeta, cameraReturnLerpSpeed);
        }
        // Если isUserInteractingWithCamera = true, углы camera.alpha и camera.beta
        // обновляются встроенным механизмом attachControl.

        scene.render();
    });

    // --- Ресайз ---
    window.addEventListener("resize", function () { engine.resize(); });
    console.log("Babylon.js scene initialized successfully.");
});
