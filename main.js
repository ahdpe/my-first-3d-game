// main.js

document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById("renderCanvas");
    const engine = new BABYLON.Engine(canvas, true, { stencil: true }); // stencil нужен для некоторых эффектов, но не помешает
    const scene = new BABYLON.Scene(engine);

    // --- Состояние ввода (для мыши) ---
    const inputState = {
        movementX: 0,
        movementY: 0,
        isPointerLocked: false
    };

    const environmentData = createEnvironment(scene);
    // Передаем сцену, канвас и состояние ввода для игрока
    const playerData = createPlayer(scene, canvas, inputState);
    const playerRoot = playerData.root;
    const cameraTarget = playerData.cameraTarget; // Используем точку внутри игрока как цель

    // --- ArcRotateCamera вместо FollowCamera ---
    const camera = new BABYLON.ArcRotateCamera("arcCam",
        -Math.PI / 2, // Начальный горизонтальный угол (альфа) - смотрим вдоль +Z
        Math.PI / 3,  // Начальный вертикальный угол (бета) - немного сверху
        10,           // Начальный радиус (расстояние)
        cameraTarget, // Цель камеры - точка внутри персонажа
        scene);

    // Убираем стандартное управление камеры мышью/клавиатурой, мы будем управлять ей сами
    camera.attachControl(canvas, false); // false - не прикреплять стандартное управление

    // --- Настройки камеры ---
    camera.minZ = 0.1; // Ближняя плоскость отсечения
    camera.lowerRadiusLimit = 3; // Минимальное приближение
    camera.upperRadiusLimit = 15; // Максимальное отдаление
    camera.lowerBetaLimit = Math.PI / 6; // Минимальный угол наклона (не смотреть строго снизу)
    camera.upperBetaLimit = Math.PI / 2 - 0.1; // Максимальный угол (не смотреть строго сверху)
    // camera.wheelPrecision = 50; // Чувствительность колеса мыши для зума (если нужно)
    // camera.pinchPrecision = 200; // Чувствительность щипка на тачпадах

    // --- Настройка Pointer Lock ---
    canvas.addEventListener("click", () => {
        if (!inputState.isPointerLocked) {
            canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
            if (canvas.requestPointerLock) {
                canvas.requestPointerLock();
            }
        }
    }, false);

    const pointerLockChange = () => {
        const lockElement = document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement;
        if (lockElement === canvas) {
            inputState.isPointerLocked = true;
            document.addEventListener("mousemove", handleMouseMove, false);
            console.log("Pointer locked");
        } else {
            inputState.isPointerLocked = false;
            document.removeEventListener("mousemove", handleMouseMove, false);
            inputState.movementX = 0; // Сбрасываем движение при потере фокуса
            inputState.movementY = 0;
            console.log("Pointer unlocked");
        }
    };

    document.addEventListener('pointerlockchange', pointerLockChange, false);
    document.addEventListener('mozpointerlockchange', pointerLockChange, false);
    document.addEventListener('webkitpointerlockchange', pointerLockChange, false);

    // --- Обработчик движения мыши ---
    const handleMouseMove = (event) => {
        if (inputState.isPointerLocked) {
            inputState.movementX += event.movementX || event.mozMovementX || event.webkitMovementX || 0;
            inputState.movementY += event.movementY || event.mozMovementY || event.webkitMovementY || 0;
        }
    };

    // --- Обновление камеры перед рендером (после обновления игрока) ---
    scene.onBeforeRenderObservable.add(() => {
        if (!playerRoot) return; // Убедимся, что игрок создан

        // Синхронизируем горизонтальный угол камеры с поворотом игрока
        // Формула может потребовать подстройки (-playerRoot.rotation.y или +),
        // и начального смещения (Math.PI / 2), чтобы камера была точно сзади
        camera.alpha = -playerRoot.rotation.y - Math.PI / 2;

        // Обновляем вертикальный угол камеры (опционально)
        // const cameraSensitivity = 0.005; // Чувствительность мыши для камеры
        // camera.beta -= inputState.movementY * cameraSensitivity;
        // camera.beta = BABYLON.Scalar.Clamp(camera.beta, camera.lowerBetaLimit, camera.upperBetaLimit); // Ограничиваем угол

        // Сбрасываем накопленное движение мыши за кадр
        // Важно делать это здесь, чтобы player.js успел его использовать
        // inputState.movementX = 0; // Сбрасывать будем в player.js после использования
        // inputState.movementY = 0;
    });

    // --- Основной цикл рендеринга ---
    engine.runRenderLoop(() => {
        scene.render();
    });

    // --- Обработка изменения размера окна ---
    window.addEventListener("resize", () => {
        engine.resize();
    });
});