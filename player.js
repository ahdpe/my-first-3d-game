// player.js: Отвечает за создание игрока и управление им

function createPlayer(scene) {
    // --- ПЕРСОНАЖ (СФЕРА С КРАСНЫМ МАТЕРИАЛОМ) ---
    var player = BABYLON.MeshBuilder.CreateSphere("playerSphere", { diameter: 1 }, scene);
    player.position.y = 0.5; // Ставим на землю

    var playerMaterial = new BABYLON.StandardMaterial("playerMat", scene);
    playerMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0); // Красный цвет
    player.material = playerMaterial;
    // --------------------------------------------------

    // --- УПРАВЛЕНИЕ (Общее состояние клавиш) ---
    // Этот объект будет хранить состояние клавиш { "key": boolean }
    var inputMap = {};
    scene.actionManager = new BABYLON.ActionManager(scene);

    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) {
        inputMap[evt.sourceEvent.key] = true;
    }));

    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) {
        inputMap[evt.sourceEvent.key] = false;
    }));
    // ---------------------------------------------

    // --- ПЕРЕМЕННЫЕ ДВИЖЕНИЯ, ПРЫЖКА, БЕГА ---
    var playerSpeed = 0.1;
    var gravity = -0.01;
    var playerVerticalVelocity = 0;
    var jumpStrength = 0.2;
    var isGrounded = true;
    var maxJumps = 2;
    var jumpsAvailable = maxJumps;
    var secondJumpStrength = 0.25;
    var sprintMultiplier = 2;
    // ----------------------------------------

    // --- ОБРАБОТКА НАЖАТИЯ ПРОБЕЛА ДЛЯ ПРЫЖКА ---
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        {
            trigger: BABYLON.ActionManager.OnKeyDownTrigger,
            parameter: " "
        },
        function () {
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
    // Добавляем функцию в цикл рендера сцены для обновления физики и движения
    scene.onBeforeRenderObservable.add(() => {
        // Гравитация
        playerVerticalVelocity += gravity;
        player.position.y += playerVerticalVelocity;

        // Проверка земли и сброс прыжков
        if (player.position.y - 0.5 < 0) {
            player.position.y = 0.5;
            playerVerticalVelocity = 0;
            if (!isGrounded) {
                jumpsAvailable = maxJumps;
            }
            isGrounded = true;
        } else {
            isGrounded = false;
        }

        // Горизонтальное движение (с бегом)
        let currentSpeed = playerSpeed;
        if (inputMap["Shift"]) {
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

    // Возвращаем сам объект игрока, чтобы другие части кода могли на него ссылаться (например, камера)
    return player;
}
