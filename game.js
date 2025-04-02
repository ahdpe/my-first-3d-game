// Создаем нашу "игровую площадку"
var createScene = function () {
    var scene = new BABYLON.Scene(engine);
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;
    var ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 10, height: 10}, scene);

    // --- ПЕРСОНАЖ ---
    var player = BABYLON.MeshBuilder.CreateBox("player", {size: 1}, scene);
    player.position.y = 0.5;

    // --- КАМЕРА ---
    var camera = new BABYLON.FollowCamera("followCam", new BABYLON.Vector3(0, 10, -10), scene);
    camera.radius = 8;
    camera.heightOffset = 4;
    camera.rotationOffset = 0;
    camera.cameraAcceleration = 0.05;
    camera.maxCameraSpeed = 10;
    camera.lockedTarget = player;
    camera.attachControl(canvas, true);

    // --- УПРАВЛЕНИЕ (Общее состояние клавиш) ---
    var inputMap = {};
    scene.actionManager = new BABYLON.ActionManager(scene);

    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) {
        inputMap[evt.sourceEvent.key] = true; // Запоминаем нажатые
    }));

    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) {
        inputMap[evt.sourceEvent.key] = false; // Забываем отпущенные
    }));

    // --- ПЕРЕМЕННЫЕ ДВИЖЕНИЯ, ПРЫЖКА, БЕГА ---
    var playerSpeed = 0.1;          // Обычная скорость
    var gravity = -0.01;            // Гравитация
    var playerVerticalVelocity = 0; // Вертикальная скорость
    var jumpStrength = 0.2;         // Сила первого прыжка
    var isGrounded = true;          // На земле?
    var maxJumps = 2;               // Макс. прыжков
    var jumpsAvailable = maxJumps;  // Доступно прыжков
    var secondJumpStrength = 0.25;  // Сила второго прыжка
    var sprintMultiplier = 2;       // Множитель бега
    // ----------------------------------------

    // --- ОБРАБОТКА НАЖАТИЯ ПРОБЕЛА ДЛЯ ПРЫЖКА ---
     scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        {
            trigger: BABYLON.ActionManager.OnKeyDownTrigger, // Реагируем на НАЖАТИЕ
            parameter: " " // Конкретно на клавишу "Пробел"
        },
        function () { // Что делать при нажатии пробела:
            if (jumpsAvailable > 0) {
                if (jumpsAvailable === 1) { // Второй прыжок
                    playerVerticalVelocity = secondJumpStrength;
                } else { // Первый прыжок
                    playerVerticalVelocity = jumpStrength;
                }
                jumpsAvailable--; // Тратим прыжок
                isGrounded = false;
            }
        }
    ));
    // -------------------------------------------

    // --- ОБНОВЛЕНИЕ КАЖДЫЙ КАДР (Гравитация и Горизонтальное движение) ---
    scene.onBeforeRenderObservable.add(() => {
        // Гравитация
        playerVerticalVelocity += gravity;
        player.position.y += playerVerticalVelocity;

        // Проверка земли и сброс прыжков
        if (player.position.y - 0.5 < 0) {
            player.position.y = 0.5;
            playerVerticalVelocity = 0;
            if (!isGrounded) { // Сбрасываем прыжки только если мы *только что* приземлились
                 jumpsAvailable = maxJumps;
            }
            isGrounded = true;
        } else {
            isGrounded = false;
        }

        // Горизонтальное движение (с бегом)
        let currentSpeed = playerSpeed;
        if (inputMap["Shift"]) { // Проверяем Shift
            currentSpeed *= sprintMultiplier;
        }

        // Двигаем персонажа
        if (inputMap["ArrowUp"] || inputMap["w"] || inputMap["W"] || inputMap["ц"] || inputMap["Ц"]) {
            player.position.z += currentSpeed;
        }
        if (inputMap["ArrowDown"] || inputMap["s"] || inputMap["S"] || inputMap["ы"] || inputMap["Ы"]) {
            player.position.z -= currentSpeed;
        }
        if (inputMap["ArrowLeft"] || inputMap["a"] || inputMap["A"] || inputMap["ф"] || inputMap["Ф"]) {
            player.position.x -= currentSpeed;
        }
        if (inputMap["ArrowRight"] || inputMap["d"] || inputMap["D"] || inputMap["в"] || inputMap["В"]) {
            player.position.x += currentSpeed;
        }
    });
    // --- КОНЕЦ ОБНОВЛЕНИЯ КАЖДЫЙ КАДР ---

    return scene;
};
