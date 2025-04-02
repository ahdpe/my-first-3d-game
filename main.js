// main.js: Основной файл, инициализирует и связывает все части

// Убедимся, что этот код выполняется после загрузки DOM
document.addEventListener("DOMContentLoaded", function() {

    // Находим наш холст на странице (ТОЛЬКО ОДИН РАЗ!)
    const canvas = document.getElementById("renderCanvas");
    if (!canvas) {
        console.error("Canvas element #renderCanvas not found!");
        return;
    }

    // Создаем движок Babylon.js
    const engine = new BABYLON.Engine(canvas, true, { stencil: true, antialias: true }); // Добавил antialias для сглаживания
    if (!engine) {
        console.error("Babylon engine could not be created!");
        return;
    }

    // Создаем основную сцену
    const scene = new BABYLON.Scene(engine);
    // scene.clearColor = new BABYLON.Color4(0.8, 0.9, 1, 1); // Светло-голубой фон (небо)

    // --- Создаем окружение ---
    // Проверяем, определена ли функция createEnvironment
    if (typeof createEnvironment !== 'function') {
        console.error("createEnvironment function is not defined! Make sure environment.js is loaded correctly.");
        return;
    }
    const environmentData = createEnvironment(scene);

    // --- Создаем игрока ---
    // Проверяем, определена ли функция createPlayer
    if (typeof createPlayer !== 'function') {
        console.error("createPlayer function is not defined! Make sure player.js is loaded correctly before main.js.");
        return;
    }
    const playerData = createPlayer(scene);
    const playerRoot = playerData.root;
    const cameraTarget = playerData.cameraTarget;

    // --- Создаем камеру ---
    // Используем ArcRotateCamera
    var camera = new BABYLON.ArcRotateCamera(
        "arcCam",
        -Math.PI / 2,       // Начальный горизонтальный угол (будет обновляться)
        Math.PI / 3,        // Начальный вертикальный угол (вид немного сверху)
        12,                 // Начальное расстояние от цели
        cameraTarget,       // Цель камеры - точка на теле игрока
        scene
    );

    // НЕ подключаем стандартное управление камеры мышью/тачем
    // camera.attachControl(canvas, false); // Убедитесь, что эта строка закомментирована или удалена

    // Настроим пределы камеры
    camera.lowerBetaLimit = Math.PI / 8;      // Не сильно низко
    camera.upperBetaLimit = (Math.PI / 2) * 0.95; // Почти горизонтально, но не ровно сверху
    camera.lowerRadiusLimit = 4;            // Минимальное приближение
    camera.upperRadiusLimit = 25;           // Максимальное отдаление
    camera.wheelPrecision = 50;             // Чувствительность колеса мыши (если захотите включить)
    camera.pinchPrecision = 100;            // Чувствительность pinch-зума (если понадобится)


    // --- Запускаем цикл рендеринга ---
    engine.runRenderLoop(function () {
        if (!scene || !playerRoot) return; // Доп. проверка на всякий случай

        // Обновляем горизонтальный угол камеры, чтобы она была за спиной игрока
        // camera.alpha = playerRoot.rotation.y - Math.PI; // Старый вариант - жесткая привязка
        // Плавная привязка камеры к повороту игрока:
        const targetCameraAlpha = playerRoot.rotation.y - Math.PI;
        camera.alpha = BABYLON.Scalar.LerpAngle(camera.alpha, targetCameraAlpha, 0.1); // Плавное следование

        // Рендерим сцену
        scene.render();
    });

    // --- Следим за изменением размера окна ---
    window.addEventListener("resize", function () {
        engine.resize();
    });

    // Опционально: Включить/выключить курсор при клике на канвас
    canvas.addEventListener("click", function() {
        // canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
        // if (canvas.requestPointerLock) {
        //     canvas.requestPointerLock();
        // }
    });

    // Опционально: Выход из блокировки курсора
    // document.addEventListener("pointerlockchange", function() { /* ... */ }, false);
    // document.addEventListener("mozpointerlockchange", function() { /* ... */ }, false);
    // document.addEventListener("webkitpointerlockchange", function() { /* ... */ }, false);


    console.log("Babylon.js scene initialized successfully.");

}); // Конец обработчика DOMContentLoaded
