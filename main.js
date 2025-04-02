// player.js: Отвечает за создание меша игрока и его данных

// !!! Убедитесь, что эти имена соответствуют выводу в вашей консоли !!!
const IDLE_ANIM_NAME = "Armature|mixamo.com|Layer0";
const WALK_ANIM_NAME = "Armature|mixamo.com|Layer0.001";
const RUN_ANIM_NAME = "Armature|mixamo.com|Layer0.001";  // Используем ту же, что и ходьба
const JUMP_ANIM_NAME = "Armature|mixamo.com|Layer0"; // Используем Idle как запасной вариант для прыжка

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

                // !!! ЗАПУСКАЕМ АНИМАЦИЮ ПРЫЖКА ЗДЕСЬ !!!
                if (playerData.animations.jump) {
                     console.log(`---> Starting JUMP animation: ${playerData.animations.jump.name}`);
                     playerData.state.currentAnim?.stop(); // Остановить текущую
                     // Запускаем прыжок НЕ зацикленно
                     playerData.animations.jump.start(false, 1.0, playerData.animations.jump.from, playerData.animations.jump.to, false);
                     playerData.state.currentAnim = playerData.animations.jump; // Запоминаем, что играем прыжок
                } else {
                     console.warn("Jump animation not found or not assigned!");
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
        let forward = camera.getDirection(BABYLON.Vector3.Forward());
        forward.y = 0;
        forward.normalize();
        let right = camera.getDirection(BABYLON.Vector3.Right());
        right.y = 0;
        right.normalize();

        let desiredMoveDirection = forward.scale(moveDirectionInput.z).add(right.scale(moveDirectionInput.x));

        // <<< DEBUG LOG >>>
        // console.log("Raw Move Dir:", desiredMoveDirection.toString(), "Speed:", currentSpeed);

        // Нормализуем и применяем скорость
        // Важно: .normalize() изменяет вектор! Делаем копию для лога поворота
        const rotationDirection = desiredMoveDirection.clone();
        desiredMoveDirection.normalize().scaleInPlace(currentSpeed);

        // <<< DEBUG LOG >>>
        // console.log("Applying Move Vector:", desiredMoveDirection.toString());
        // console.log("Position BEFORE move:", mesh.position.toString());

        // Применяем движение к мешу
        mesh.position.addInPlace(desiredMoveDirection);

         // <<< DEBUG LOG >>>
        // console.log("Position AFTER move:", mesh.position.toString());


        // --- Поворот персонажа ---
        if (rotationDirection.lengthSquared() > 0.001) { // Используем вектор до нормализации скорости для поворота
            let targetAngle = Math.atan2(rotationDirection.x, rotationDirection.z);
            let targetRotation = BABYLON.Quaternion.FromEulerAngles(0, targetAngle, 0);
            // Используем Slerp для плавного поворота
            mesh.rotationQuaternion = BABYLON.Quaternion.Slerp(mesh.rotationQuaternion, targetRotation, config.rotationSpeed);
        }

        // --- Выбор анимации движения ---
        if (state.isGrounded) { // Анимацию движения меняем только на земле
             desiredAnim = isRunning ? animations.run : animations.walk;
        } else {
             // Если мы движемся в воздухе, возможно, нужна анимация падения?
             // Пока оставляем ту, что была (вероятно, прыжок)
             desiredAnim = state.currentAnim; // Не меняем анимацию в воздухе при движении
        }

    } else {
         // --- Выбор анимации стояния/падения ---
         if (state.isGrounded) {
             // Если стоим на земле, и текущая анимация - это прыжок (который должен был закончиться), переключаемся на Idle
             if(state.currentAnim === animations.jump) {
                 desiredAnim = animations.idle;
             } else {
                 // Иначе, если просто стоим, должна быть Idle
                 desiredAnim = animations.idle;
             }
         } else {
             // Если в воздухе и не двигаемся
             // Если текущая анимация - прыжок, оставляем ее (она может еще играть)
             // Если текущая анимация не прыжок (например, была Idle или Walk до прыжка),
             // и у нас ЕСТЬ анимация прыжка - можно ее запустить как падение, или оставить Idle.
             // Пока просто оставим текущую анимацию, если она прыжок, иначе переключим на Idle.
             if(state.currentAnim !== animations.jump) {
                desiredAnim = animations.idle; // Или FallAnim, если будет
             }
         }
    }


    // 3. Управление анимациями
    // <<< DEBUG LOG >>>
    // console.log(`Anim Check: Current=${state.currentAnim?.name}, Desired=${desiredAnim?.name}, Grounded=${state.isGrounded}, Moving=${isMoving}, JumpPlaying=${animations.jump?.isPlaying}`);

    // Меняем анимацию, только если она должна измениться и существует
    if (desiredAnim && state.currentAnim !== desiredAnim) {
         // <<< DEBUG LOG >>>
        // console.log(`---> Switching Anim: From ${state.currentAnim?.name} to ${desiredAnim.name}`);
        state.currentAnim?.stop(); // Останавливаем предыдущую (если была)

        // Запускаем новую. Idle/Walk/Run - зацикленно.
        // Jump запускается ТОЛЬКО по нажатию пробела.
        if (desiredAnim !== animations.jump) {
            // <<< DEBUG LOG >>>
             // console.log(`---> Starting loop anim: ${desiredAnim.name}`);
             desiredAnim.start(true, 1.0, desiredAnim.from, desiredAnim.to, false);
             state.currentAnim = desiredAnim;
        } else {
             // Сюда попадать не должны при штатной смене, т.к. Jump запускается выше
              console.warn("Trying to switch TO jump animation here, this shouldn't happen.");
              state.currentAnim = desiredAnim; // Запоминаем, но не запускаем
        }

    } else if (state.isGrounded && state.currentAnim === animations.jump && !animations.jump.isPlaying) {
         // Если мы на земле, текущая анимация - прыжок, и она НЕ играет -> переключаемся на Idle
         // <<< DEBUG LOG >>>
         // console.log(`---> Jump anim finished playing, switching to Idle: ${animations.idle?.name}`);
         state.currentAnim.stop(); // На всякий случай
         desiredAnim = animations.idle;
         if (desiredAnim) {
             desiredAnim.start(true, 1.0, desiredAnim.from, desiredAnim.to, false);
             state.currentAnim = desiredAnim;
         } else {
              state.currentAnim = null; // Если нет Idle анимации
         }
    } else if (desiredAnim && state.currentAnim === desiredAnim && !state.currentAnim.isPlaying) {
        // Если нужная анимация (цикличная) уже установлена, но почему-то не играет -> перезапускаем
        if (desiredAnim !== animations.jump) { // Не перезапускаем прыжок здесь
            // <<< DEBUG LOG >>>
             // console.warn(`---> Restarting non-playing loop anim: ${desiredAnim.name}`);
             desiredAnim.start(true, 1.0, desiredAnim.from, desiredAnim.to, false);
        }
    }
}
