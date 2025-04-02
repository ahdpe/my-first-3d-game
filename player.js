// player.js: Отвечает за создание игрока и управление им

// Принимаем canvas и inputState
function createPlayer(scene, canvas, inputState) {
    // --- КОНСТАНТЫ ---
    const torsoHeight = 1.0, torsoWidth = 0.5, torsoDepth = 0.3;
    const headDiameter = 0.4;
    const limbLength = 0.8, limbThickness = 0.2;
    const groundLevel = 0; // Высота земли
    const playerHeight = limbLength + torsoHeight + headDiameter / 2; // Приблизительная общая высота для камеры

    // --- СОСТОЯНИЯ ИГРОКА ---
    const PlayerState = { IDLE: 0, WALKING: 1, RUNNING: 2, JUMP_ANTICIPATION: 3, AIRBORNE: 4, LANDING: 5 };
    let playerState = PlayerState.IDLE;

    // --- ПАРАМЕТРЫ АНИМАЦИИ ПРЫЖКА ---
    const jumpAnticipationTime = 120, landingTime = 80;
    const crouchAmount = 0.2, legBendAngle = Math.PI / 5;
    const armSpreadAngle = Math.PI / 8, armAnticipationAngle = -Math.PI / 6;
    let stateTimer = 0;

    // --- КОРНЕВОЙ УЗЕЛ и ЦЕЛЬ КАМЕРЫ ---
    var playerRoot = new BABYLON.TransformNode("playerRoot", scene);
    playerRoot.position.y = groundLevel; // Начинаем на уровне земли
    // Точку цели камеры размещаем примерно на уровне верха туловища/шеи
    var cameraTargetPoint = new BABYLON.TransformNode("cameraTarget", scene);
    cameraTargetPoint.parent = playerRoot;
    cameraTargetPoint.position.y = limbLength + torsoHeight * 0.7; // Поднимаем цель повыше

    // --- МАТЕРИАЛЫ ---
    var bodyMaterial = new BABYLON.StandardMaterial("bodyMat", scene); bodyMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.9);
    var limbMaterial = new BABYLON.StandardMaterial("limbMat", scene); limbMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.6, 0.6);

    // --- СОЗДАНИЕ ЧАСТЕЙ ТЕЛА И ИЕРАРХИЯ ---
    // (Код создания частей тела без изменений...)
    var leftHipPivot = new BABYLON.TransformNode("leftHipPivot", scene); leftHipPivot.parent = playerRoot; leftHipPivot.position = new BABYLON.Vector3(-torsoWidth / 4, limbLength, 0);
    var rightHipPivot = new BABYLON.TransformNode("rightHipPivot", scene); rightHipPivot.parent = playerRoot; rightHipPivot.position = new BABYLON.Vector3(torsoWidth / 4, limbLength, 0);
    var leftLeg = BABYLON.MeshBuilder.CreateBox("leftLeg", {height: limbLength, width: limbThickness, depth: limbThickness}, scene); leftLeg.material = limbMaterial; leftLeg.parent = leftHipPivot; leftLeg.position.y = -limbLength / 2;
    var rightLeg = BABYLON.MeshBuilder.CreateBox("rightLeg", {height: limbLength, width: limbThickness, depth: limbThickness}, scene); rightLeg.material = limbMaterial; rightLeg.parent = rightHipPivot; rightLeg.position.y = -limbLength / 2;
    // Туловище теперь дочерний элемент playerRoot, а не cameraTargetPoint, чтобы цель камеры не двигалась при приседании
    var torso = BABYLON.MeshBuilder.CreateBox("torso", {height: torsoHeight, width: torsoWidth, depth: torsoDepth}, scene); torso.material = bodyMaterial; torso.parent = playerRoot; torso.position.y = limbLength + torsoHeight / 2; // Позиционируем туловище над ногами
    var head = BABYLON.MeshBuilder.CreateSphere("head", {diameter: headDiameter}, scene); head.material = limbMaterial; head.parent = torso; head.position.y = torsoHeight / 2 + headDiameter / 2;
    const shoulderOffsetY = torsoHeight / 2 - limbThickness / 2; const shoulderOffsetX = torsoWidth / 2 + limbThickness / 2;
    var leftShoulderPivot = new BABYLON.TransformNode("leftShoulderPivot", scene); leftShoulderPivot.parent = torso; leftShoulderPivot.position = new BABYLON.Vector3(-shoulderOffsetX, shoulderOffsetY, 0);
    var rightShoulderPivot = new BABYLON.TransformNode("rightShoulderPivot", scene); rightShoulderPivot.parent = torso; rightShoulderPivot.position = new BABYLON.Vector3(shoulderOffsetX, shoulderOffsetY, 0);
    var leftArm = BABYLON.MeshBuilder.CreateBox("leftArm", {height: limbLength, width: limbThickness, depth: limbThickness}, scene); leftArm.material = limbMaterial; leftArm.parent = leftShoulderPivot; leftArm.position.y = -limbLength / 2;
    var rightArm = BABYLON.MeshBuilder.CreateBox("rightArm", {height: limbLength, width: limbThickness, depth: limbThickness}, scene); rightArm.material = limbMaterial; rightArm.parent = rightShoulderPivot; rightArm.position.y = -limbLength / 2;

    // --- УПРАВЛЕНИЕ (Клавиатура) ---
    var inputMap = {}; // Используем объект для отслеживания нажатых клавиш
    scene.actionManager = new BABYLON.ActionManager(scene);
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) {
        const key = evt.sourceEvent.key.toLowerCase();
        inputMap[key] = true;
    }));
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) {
        const key = evt.sourceEvent.key.toLowerCase();
        inputMap[key] = false;
    }));

    // --- ПЕРЕМЕННЫЕ ДВИЖЕНИЯ ---
    var playerSpeed = 0.08, gravity = -0.015, playerVerticalVelocity = 0;
    var jumpStrength = 0.25, isGrounded = true, maxJumps = 2, jumpsAvailable = maxJumps;
    var secondJumpStrength = 0.3, sprintMultiplier = 1.8; // Чуть уменьшил множитель бега
    var rotationLerpSpeed = 0.1; // Скорость поворота персонажа (можно сделать быстрее)
    var mouseSensitivity = 0.004; // Чувствительность мыши для поворота персонажа
    var targetRotationY = playerRoot.rotation.y; // Целевой угол поворота по Y

    // --- ПЕРЕМЕННЫЕ АНИМАЦИИ ХОДЬБЫ ---
    var walkAnimAngle = 0, walkAnimSpeed = 0.15, walkAnimAmplitude = Math.PI / 6;
    var isMovingHorizontally = false;

    // --- ИНИЦИАЛИЗАЦИЯ ---
    playerRoot.rotation.y = Math.PI; // Начинаем смотреть назад (вдоль +Z)

    // --- ОБРАБОТКА ПРЫЖКА ---
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        { trigger: BABYLON.ActionManager.OnKeyDownTrigger, parameter: " " }, // Пробел
        function () {
            // Предотвращаем прыжок, если фокус на текстовом поле
            if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;

            if (jumpsAvailable > 0 && (playerState === PlayerState.IDLE || playerState === PlayerState.WALKING || playerState === PlayerState.RUNNING || playerState === PlayerState.AIRBORNE)) {
                if (isGrounded) {
                    playerState = PlayerState.JUMP_ANTICIPATION;
                    stateTimer = 0;
                    // Не прыгаем сразу, ждем анимацию
                } else if (playerState === PlayerState.AIRBORNE) {
                    // Двойной прыжок
                    playerVerticalVelocity = secondJumpStrength;
                    jumpsAvailable--;
                    // Можно добавить эффект двойного прыжка (частицы?)
                }
            }
        }
    ));

    // --- ПЛАВНЫЙ СБРОС АНИМАЦИИ КОНЕЧНОСТЕЙ ---
    function lerpLimbsToZero(lerpFactor = 0.1) {
        leftShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.x, 0, lerpFactor);
        rightShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.x, 0, lerpFactor);
        leftShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.z, 0, lerpFactor);
        rightShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.z, 0, lerpFactor);
        leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, 0, lerpFactor);
        rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, 0, lerpFactor);
    }

    // --- ОБНОВЛЕНИЕ КАЖДЫЙ КАДР ---
    scene.onBeforeRenderObservable.add(() => {
        const deltaTime = scene.getEngine().getDeltaTime();
        const dtFactor = deltaTime / 16.66; // Коэффициент для независимости от FPS (при 60 FPS = 1)

        // 1. Гравитация и вертикальное движение
        if (playerState !== PlayerState.JUMP_ANTICIPATION) {
           playerVerticalVelocity += gravity * dtFactor; // Применяем гравитацию
        }
        playerRoot.position.y += playerVerticalVelocity * dtFactor; // Обновляем позицию по Y

        // --- Общая логика ---
        let wasGrounded = isGrounded;

        // 2. Проверка земли и приземление
        if (playerRoot.position.y <= groundLevel && playerVerticalVelocity <= 0) { // Проверяем и скорость (чтобы не сработало при отрыве)
            if (playerState !== PlayerState.JUMP_ANTICIPATION && playerState !== PlayerState.LANDING) {
                 playerRoot.position.y = groundLevel;
                 playerVerticalVelocity = 0;
                 isGrounded = true;
                 if (!wasGrounded && playerState === PlayerState.AIRBORNE) { // Только что приземлились
                     playerState = PlayerState.LANDING;
                     stateTimer = 0;
                     jumpsAvailable = maxJumps; // Восстанавливаем прыжки при касании земли
                 } else if (wasGrounded) {
                     // Уже на земле, восстанавливаем прыжки на всякий случай
                     jumpsAvailable = maxJumps;
                 }
            }
        } else {
             isGrounded = false;
             if (playerState !== PlayerState.JUMP_ANTICIPATION && playerState !== PlayerState.AIRBORNE && playerState !== PlayerState.LANDING) {
                 // Если мы не прыгаем и не в воздухе, но не на земле (упали с уступа)
                 playerState = PlayerState.AIRBORNE;
             }
        }

        // 3. Поворот персонажа мышью
        if (inputState.isPointerLocked && Math.abs(inputState.movementX) > 0) {
             targetRotationY += inputState.movementX * mouseSensitivity;
        }
        // Плавный поворот к целевому углу
        playerRoot.rotation.y = BABYLON.Scalar.LerpAngle(playerRoot.rotation.y, targetRotationY, rotationLerpSpeed * dtFactor); // Учитываем deltaTime

        // Сбрасываем движение мыши X после использования
        inputState.movementX = 0;
        // inputState.movementY = 0; // Y сбрасывается в main.js, если используется для камеры

        // 4. Горизонтальное движение (ОТНОСИТЕЛЬНО ПОВОРОТА)
        isMovingHorizontally = false;
        let moveDirection = BABYLON.Vector3.Zero(); // Вектор желаемого направления движения
        let inputVector = BABYLON.Vector3.Zero(); // Вектор ввода (W/A/S/D)

        if (inputMap["arrowup"] || inputMap["w"] || inputMap["ц"]) { inputVector.z = 1; }
        if (inputMap["arrowdown"] || inputMap["s"] || inputMap["ы"]) { inputVector.z = -1; }
        if (inputMap["arrowleft"] || inputMap["a"] || inputMap["ф"]) { inputVector.x = -1; }
        if (inputMap["arrowright"] || inputMap["d"] || inputMap["в"]) { inputVector.x = 1; }

        if (inputVector.lengthSquared() > 0) { // Если есть ввод движения
             isMovingHorizontally = true;
             inputVector.normalize(); // Нормализуем для одинаковой скорости по диагонали

             // Создаем матрицу поворота только по оси Y
             let rotationMatrix = BABYLON.Matrix.RotationAxis(BABYLON.Axis.Y, playerRoot.rotation.y);

             // Поворачиваем вектор ввода, чтобы он соответствовал направлению игрока
             moveDirection = BABYLON.Vector3.TransformCoordinates(inputVector, rotationMatrix);

             let currentSpeed = playerSpeed * (inputMap["shift"] ? sprintMultiplier : 1);

             // Применяем движение
             playerRoot.position.addInPlace(moveDirection.scale(currentSpeed * dtFactor));

             // Устанавливаем состояние ходьбы/бега
             if (isGrounded && playerState !== PlayerState.JUMP_ANTICIPATION && playerState !== PlayerState.LANDING) {
                  playerState = inputMap["shift"] ? PlayerState.RUNNING : PlayerState.WALKING;
             }
        } else {
             // Нет горизонтального ввода
             isMovingHorizontally = false;
             if (isGrounded && playerState !== PlayerState.JUMP_ANTICIPATION && playerState !== PlayerState.LANDING && playerState !== PlayerState.AIRBORNE) {
                  playerState = PlayerState.IDLE;
             }
        }


        // 5. Логика состояний и анимаций
        stateTimer += deltaTime;
        let targetTorsoOffsetY = 0; // Целевое смещение туловища для приседания
        let targetLegBend = 0; // Целевой угол сгиба ног
        let targetArmXAngle = 0; // Целевой угол рук по X (вперед-назад)
        let targetArmZAngle = 0; // Целевой угол рук по Z (в стороны)

        // Локальная позиция туловища (для приседания)
        let currentTorsoLocalY = torso.position.y - (limbLength + torsoHeight / 2); // Относительно playerRoot

        switch (playerState) {
            case PlayerState.IDLE:
            case PlayerState.WALKING:
            case PlayerState.RUNNING:
                targetTorsoOffsetY = 0; // Сброс приседания
                if (isMovingHorizontally) {
                    let currentAnimSpeed = walkAnimSpeed * (inputMap["shift"] ? sprintMultiplier : 1.5); // Бег анимируется быстрее
                    walkAnimAngle += currentAnimSpeed * dtFactor;
                    targetArmXAngle = Math.sin(walkAnimAngle) * walkAnimAmplitude;
                    targetLegBend = Math.sin(walkAnimAngle + Math.PI) * walkAnimAmplitude * 0.8; // Ноги машут чуть меньше рук
                } else {
                    // Плавный возврат в idle позу
                    walkAnimAngle = 0;
                    targetArmXAngle = 0;
                    targetLegBend = 0;
                    lerpLimbsToZero(0.1 * dtFactor); // Замедляем возврат если FPS низкий
                }
                // Применяем анимацию ходьбы/бега
                leftShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.x, targetArmXAngle, 0.2 * dtFactor);
                rightShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.x, -targetArmXAngle, 0.2 * dtFactor);
                leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, targetLegBend, 0.2 * dtFactor);
                rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, -targetLegBend, 0.2 * dtFactor);
                // Возвращаем руки в нормальное положение по Z
                leftShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.z, 0, 0.2 * dtFactor);
                rightShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.z, 0, 0.2 * dtFactor);
                break;

            case PlayerState.JUMP_ANTICIPATION:
                targetTorsoOffsetY = -crouchAmount; // Приседание
                targetLegBend = legBendAngle;      // Сгиб ног
                targetArmXAngle = armAnticipationAngle; // Руки назад для замаха
                targetArmZAngle = 0;                // Руки не в стороны

                // Плавное приседание и замах
                leftShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.x, targetArmXAngle, 0.3 * dtFactor);
                rightShoulderPivot.rotation.x = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.x, targetArmXAngle, 0.3 * dtFactor);
                leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, targetLegBend, 0.3 * dtFactor);
                rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, targetLegBend, 0.3 * dtFactor);
                leftShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.z, targetArmZAngle, 0.3 * dtFactor);
                rightShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.z, targetArmZAngle, 0.3 * dtFactor);

                // Если время подготовки вышло - прыгаем
                if (stateTimer >= jumpAnticipationTime) {
                    playerVerticalVelocity = (jumpsAvailable === maxJumps) ? jumpStrength : secondJumpStrength; // Используем силу первого или второго прыжка
                    jumpsAvailable--;
                    isGrounded = false; // Мы точно оторвались от земли
                    playerState = PlayerState.AIRBORNE; // Переход в состояние полета
                    targetTorsoOffsetY = 0; // Начинаем выпрямляться в полете
                    // Сбрасываем таймер состояния, т.к. перешли в новое
                    stateTimer = 0;
                }
                break;

            case PlayerState.AIRBORNE:
                targetTorsoOffsetY = 0; // В полете не приседаем
                targetLegBend = -legBendAngle / 3; // Ноги немного подогнуты под себя
                targetArmZAngle = armSpreadAngle;  // Руки слегка в стороны для баланса
                targetArmXAngle = 0;               // Руки не машут вперед-назад

                // Плавно переводим конечности в позу полета
                lerpLimbsToZero(0.05 * dtFactor); // Медленно возвращаем вращение по X к нулю
                leftShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(leftShoulderPivot.rotation.z, targetArmZAngle, 0.15 * dtFactor);
                rightShoulderPivot.rotation.z = BABYLON.Scalar.Lerp(rightShoulderPivot.rotation.z, -targetArmZAngle, 0.15 * dtFactor);
                leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, targetLegBend, 0.15 * dtFactor);
                rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, targetLegBend, 0.15 * dtFactor);
                break;

            case PlayerState.LANDING:
                targetTorsoOffsetY = -crouchAmount * 0.5; // Легкое приседание при приземлении
                targetLegBend = legBendAngle * 0.6;      // Смягчение коленями
                targetArmXAngle = 0;                     // Руки возвращаются
                targetArmZAngle = 0;                     // Руки возвращаются

                // Плавно амортизируем
                lerpLimbsToZero(0.2 * dtFactor);
                leftHipPivot.rotation.x = BABYLON.Scalar.Lerp(leftHipPivot.rotation.x, targetLegBend, 0.2 * dtFactor);
                rightHipPivot.rotation.x = BABYLON.Scalar.Lerp(rightHipPivot.rotation.x, targetLegBend, 0.2 * dtFactor);

                // Если время приземления вышло, переходим в Idle или Walking/Running
                if (stateTimer >= landingTime) {
                    playerState = isMovingHorizontally ? (inputMap["shift"] ? PlayerState.RUNNING : PlayerState.WALKING) : PlayerState.IDLE;
                    targetTorsoOffsetY = 0; // Полностью выпрямляемся
                }
                break;
        }
        // Обновляем локальную позицию туловища для анимации приседания/выпрямления
        const newTorsoLocalY = BABYLON.Scalar.Lerp(currentTorsoLocalY, targetTorsoOffsetY, 0.2 * dtFactor);
        torso.position.y = (limbLength + torsoHeight / 2) + newTorsoLocalY; // Обновляем абсолютную позицию торса

    }); // Конец scene.onBeforeRenderObservable

    // Возвращаем корневой узел и цель для камеры
    return { root: playerRoot, cameraTarget: cameraTargetPoint };
} // Конец createPlayer