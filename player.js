// player.js: Отвечает за создание меша игрока и его данных

// !!! ВАЖНО: Имена анимаций нужно взять из ВАШЕЙ консоли !!!
// Замените "ВАШЕ_ИМЯ_IDLE", "ВАШЕ_ИМЯ_WALK" и т.д. на реальные имена
// которые вы видите после "Загруженные анимации:", например "Armature|mixamo.com|Layer0"

// Имена по умолчанию (ЗАМЕНИТЕ ИХ!)
const IDLE_ANIM_NAME = "Armature|mixamo.com|Layer0";   // <-- ЗАМЕНИТЬ на ваше имя Idle (если есть)
const WALK_ANIM_NAME = "Armature|mixamo.com|Layer0.001"; // <-- ЗАМЕНИТЬ на ваше имя Walk/Run
const RUN_ANIM_NAME = "Armature|mixamo.com|Layer0.001";  // <-- ЗАМЕНИТЬ (можно то же, что и Walk, если нет отдельной)
const JUMP_ANIM_NAME = "Armature|mixamo.com|Layer0"; // <-- ЗАМЕНИТЬ (если есть анимация прыжка)

async function createPlayer(scene) {
    // --- ЗАГРУЗКА МОДЕЛИ ---
    const result = await BABYLON.SceneLoader.ImportMeshAsync("", "assets/", "character.glb", scene);
    const playerMesh = result.meshes[0];
    playerMesh.name = "playerCharacter";
    // playerMesh.scaling.scaleInPlace(0.1); // Раскомментируйте и подберите, если нужно масштабировать
    playerMesh.position = new BABYLON.Vector3(0, 0, 0); // Начальная позиция

    // Устанавливаем Quaternion для вращения (стабильнее, чем Euler)
    if (!playerMesh.rotationQuaternion) {
        playerMesh.rotationQuaternion = BABYLON.Quaternion.FromEulerVector(playerMesh.rotation);
    }


    // --- АНИМАЦИИ ---
    console.log("Загруженные анимации:");
    result.animationGroups.forEach(ag => console.log("- " + ag.name));

    const idleAnim = scene.getAnimationGroupByName(IDLE_ANIM_NAME);
    const walkAnim = scene.getAnimationGroupByName(WALK_ANIM_NAME);
    const runAnim = scene.getAnimationGroupByName(RUN_ANIM_NAME); // Может быть null, если имя то же, что и у walkAnim
    const jumpAnim = scene.getAnimationGroupByName(JUMP_ANIM_NAME); // Может быть null

    // Останавливаем все и запускаем Idle
    result.animationGroups.forEach(ag => ag?.stop()); // Используем '?', если группа не найдена
    let currentAnim = idleAnim;
    currentAnim?.start(true, 1.0, currentAnim.from, currentAnim.to, false);

    // --- УПРАВЛЕНИЕ ---
    const inputMap = {};
    scene.actionManager = new BABYLON.ActionManager(scene);
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) {
        inputMap[evt.sourceEvent.key.toLowerCase()] = true;
    }));
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) {
        inputMap[evt.sourceEvent.key.toLowerCase()] = false;
    }));

    // --- ДАННЫЕ ДЛЯ ОБНОВЛЕНИЯ (Состояние и Конфигурация) ---
    const playerData = {
        mesh: playerMesh, // Сам меш
        inputMap: inputMap, // Карта ввода
        animations: { // Найденные анимации
            idle: idleAnim,
            walk: walkAnim,
            run: runAnim ? runAnim : walkAnim, // Если нет бега, используем ходьбу
            jump: jumpAnim,
        },
        state: { // Изменяемое состояние
            verticalVelocity: 0,
            jumpsAvailable: 2, // Начнем с 2х по умолчанию
            isGrounded: true,
            currentAnim: currentAnim,
        },
        config: { // Настройки персонажа
            speed: 0.05,
            gravity: -0.008,
            jumpStrength: 0.15,
            secondJumpStrength: 0.18,
            sprintMultiplier: 2,
            rotationSpeed: 0.1,
            groundCheckOffset: 0.1,
            maxJumps: 2,
        }
    };

    // --- ОБРАБОТКА НАЖАТИЯ ПРОБЕЛА (привязываем прямо к ActionManager) ---
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        { trigger: BABYLON.ActionManager.OnKeyDownTrigger, parameter: " " },
        function () {
            // Используем playerData для доступа к состоянию
            if (playerData.state.jumpsAvailable > 0) {
                if (playerData.state.jumpsAvailable === 1) { // Второй прыжок
                    playerData.state.verticalVelocity = playerData.config.secondJumpStrength;
                } else { // Первый прыжок
                    playerData.state.verticalVelocity = playerData.config.jumpStrength;
                }
                playerData.state.jumpsAvailable--;
                playerData.state.isGrounded = false;
                // Опционально: запустить анимацию прыжка (если есть и хотим)
                 if (playerData.animations.jump) {
                     playerData.state.currentAnim?.stop();
                     // Запускаем прыжок НЕ зацикленно
                     playerData.animations.jump.start(false, 1.0, playerData.animations.jump.from, playerData.animations.jump.to, false);
                     playerData.state.currentAnim = playerData.animations.jump;
                 }
            }
        }
    ));

    // Возвращаем собранные данные об игроке
    return playerData;
}


// --- Функция обновления состояния игрока (будет вызываться из main.js) ---
// Теперь она принимает playerData и camera
function updatePlayerState(playerData, camera) {
    const { mesh, inputMap, animations, state, config } = playerData; // Деструктуризация для удобства

    // 1. Простая физика и проверка земли
    state.verticalVelocity += config.gravity;
    mesh.position.y += state.verticalVelocity;

    if (mesh.position.y < config.groundCheckOffset) {
        mesh.position.y = 0; // Или config.groundCheckOffset? Экспериментируйте
        state.verticalVelocity = 0;
        if (!state.isGrounded) {
            state.jumpsAvailable = config.maxJumps;
        }
        state.isGrounded = true;
    } else {
        state.isGrounded = false;
    }

    // 2. Горизонтальное движение
    let moveDirectionInput = BABYLON.Vector3.Zero(); // Ввод пользователя
    let isMoving = false;
    let isRunning = false;
    let currentSpeed = config.speed;

    if (inputMap["shift"]) {
        currentSpeed *= config.sprintMultiplier;
        isRunning = true;
    }

    // Определяем направление по вводу
    if (inputMap["arrowup"] || inputMap["w"]) { moveDirectionInput.z = 1; isMoving = true; }
    if (inputMap["arrowdown"] || inputMap["s"]) { moveDirectionInput.z = -1; isMoving = true; }
    if (inputMap["arrowleft"] || inputMap["a"]) { moveDirectionInput.x = -1; isMoving = true; }
    if (inputMap["arrowright"] || inputMap["d"]) { moveDirectionInput.x = 1; isMoving = true; }

    let desiredAnim = state.currentAnim; // Сохраняем текущую по умолчанию

    if (isMoving) {
        // --- Расчет движения относительно камеры ---
        // Получаем направление камеры (только горизонтальное)
        let forward = camera.getDirection(BABYLON.Vector3.Forward());
        forward.y = 0;
        forward.normalize();
        let right = camera.getDirection(BABYLON.Vector3.Right());
        right.y = 0;
        right.normalize();

        // Направление движения в мировых координатах
        let desiredMoveDirection = forward.scale(moveDirectionInput.z).add(right.scale(moveDirectionInput.x));
        desiredMoveDirection.normalize().scaleInPlace(currentSpeed); // Нормализуем и применяем скорость

        // Применяем движение к мешу
        mesh.position.addInPlace(desiredMoveDirection);

        // --- Поворот персонажа ---
        if (desiredMoveDirection.lengthSquared() > 0.001) {
            let targetAngle = Math.atan2(desiredMoveDirection.x, desiredMoveDirection.z);
            let targetRotation = BABYLON.Quaternion.FromEulerAngles(0, targetAngle, 0);
            mesh.rotationQuaternion = BABYLON.Quaternion.Slerp(mesh.rotationQuaternion, targetRotation, config.rotationSpeed);
        }

        // --- Выбор анимации движения ---
        if (state.isGrounded) { // Анимацию движения меняем только на земле
             desiredAnim = isRunning ? animations.run : animations.walk;
        }

    } else {
         // --- Выбор анимации стояния/падения ---
         if (state.isGrounded) {
             desiredAnim = animations.idle;
         } else {
             // Если в воздухе и не двигаемся, какая анимация? Прыжок/Падение или Idle?
             // Если анимация прыжка уже играет (запущена по пробелу), не трогаем ее.
             // Если она закончилась, или ее не было, можно включить Idle или спец. анимацию падения.
             if (state.currentAnim !== animations.jump || !animations.jump.isPlaying) {
                desiredAnim = animations.idle; // Или FallAnim, если есть
             }
         }
    }


    // 3. Управление анимациями
    // Меняем анимацию, только если она должна измениться и существует
    if (desiredAnim && state.currentAnim !== desiredAnim) {
        state.currentAnim?.stop(); // Останавливаем предыдущую (если была)
        // Запускаем новую. Idle/Walk/Run - зацикленно. Jump - нет (уже запущен выше)
        if (desiredAnim !== animations.jump) {
             desiredAnim.start(true, 1.0, desiredAnim.from, desiredAnim.to, false);
        }
        state.currentAnim = desiredAnim;
    } else if (!isMoving && state.isGrounded && state.currentAnim && !state.currentAnim.isPlaying && state.currentAnim === animations.jump) {
        // Если мы приземлились и анимация прыжка (незацикленная) закончилась, переключаемся на Idle
        state.currentAnim.stop();
        desiredAnim = animations.idle;
        if (desiredAnim) {
            desiredAnim.start(true, 1.0, desiredAnim.from, desiredAnim.to, false);
            state.currentAnim = desiredAnim;
        }
    }
}
